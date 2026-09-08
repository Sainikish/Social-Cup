import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { notifyAuthExpired } from '../../src/api/authSession';
import { apiClient, setAccessToken, toApiError } from '../../src/api/client';
import { clearSession, getStoredRefreshToken, saveSession } from '../../src/auth/sessionStorage';
import type { AdminAuthResponse } from '../../src/auth/types';

vi.mock('../../src/auth/sessionStorage');
vi.mock('../../src/api/authSession');

const mockGetStoredRefreshToken = vi.mocked(getStoredRefreshToken);
const mockSaveSession = vi.mocked(saveSession);
const mockClearSession = vi.mocked(clearSession);
const mockNotifyAuthExpired = vi.mocked(notifyAuthExpired);

const UNAUTHENTICATED_BODY = {
  timestamp: new Date().toISOString(),
  status: 401,
  error: 'Unauthorized',
  code: 'UNAUTHENTICATED',
  message: 'Authentication is required to access this resource',
  path: '/admin/members/x/suspend',
  requestId: 'req-1',
};

function refreshSuccessBody(): AdminAuthResponse {
  return {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: 'member-1',
      email: 'admin@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      avatarUrl: null,
      status: 'ACTIVE',
      roles: ['ADMIN'],
      createdAt: new Date().toISOString(),
    },
  };
}

interface MockResponse {
  status: number;
  data: unknown;
}

// A minimal custom Axios adapter: request/response interceptors (the code
// under test) run exactly as they would against a real network, but this
// stands in for the actual HTTP call. Mirrors barista-web/tests/api/client.test.ts's
// own adapter exactly - real adapters decide resolve-vs-reject themselves by
// checking `validateStatus`, which dispatchRequest does not do automatically,
// so this mock has to do the same or a 401 would resolve as if it succeeded.
function installMockAdapter(handler: (requestConfig: InternalAxiosRequestConfig) => MockResponse) {
  const requestLog: InternalAxiosRequestConfig[] = [];

  apiClient.defaults.adapter = async (requestConfig: InternalAxiosRequestConfig) => {
    requestLog.push(requestConfig);
    const { status, data } = handler(requestConfig);
    const response = {
      data,
      status,
      statusText: '',
      headers: {},
      config: requestConfig,
    };

    const validateStatus = requestConfig.validateStatus;
    if (!validateStatus || validateStatus(status)) {
      return response;
    }
    throw new AxiosError(
      `Request failed with status code ${status}`,
      undefined,
      requestConfig,
      undefined,
      response
    );
  };

  return requestLog;
}

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
});

describe('apiClient request interceptor - Authorization header (access token memory-only)', () => {
  it('attaches Authorization: Bearer <token> when an access token is currently held in memory', async () => {
    setAccessToken('stored-access-token');
    const requestLog = installMockAdapter(() => ({ status: 200, data: { ok: true } }));

    await apiClient.post('/admin/members/x/suspend');

    expect(requestLog).toHaveLength(1);
    expect(requestLog[0].headers.get('Authorization')).toBe('Bearer stored-access-token');
  });

  it('does not attach an Authorization header when no access token is held', async () => {
    const requestLog = installMockAdapter(() => ({ status: 200, data: { ok: true } }));

    await apiClient.get('/auth/me');

    expect(requestLog).toHaveLength(1);
    expect(requestLog[0].headers.has('Authorization')).toBe(false);
  });

  it('clearing the access token means the very next request carries no Authorization header', async () => {
    setAccessToken('stored-access-token');
    setAccessToken(null);
    const requestLog = installMockAdapter(() => ({ status: 200, data: { ok: true } }));

    await apiClient.get('/auth/me');

    expect(requestLog[0].headers.has('Authorization')).toBe(false);
  });
});

describe('apiClient response interceptor - 401 refresh-and-retry', () => {
  it('refreshes once on a 401 UNAUTHENTICATED and retries the original request exactly once', async () => {
    setAccessToken('expired-access-token');
    mockGetStoredRefreshToken.mockReturnValue('valid-refresh-token');

    const seenOnce = new Set<string>();
    const requestLog = installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/auth/refresh') {
        return { status: 200, data: refreshSuccessBody() };
      }
      if (!seenOnce.has(requestConfig.url ?? '')) {
        seenOnce.add(requestConfig.url ?? '');
        return { status: 401, data: UNAUTHENTICATED_BODY };
      }
      return { status: 200, data: { id: 'member-2' } };
    });

    const response = await apiClient.post('/admin/members/x/suspend');

    expect(response.data).toEqual({ id: 'member-2' });
    expect(requestLog.map((r) => r.url)).toEqual([
      '/admin/members/x/suspend',
      '/auth/refresh',
      '/admin/members/x/suspend',
    ]);
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
    expect(mockSaveSession).toHaveBeenCalledWith({ refreshToken: 'new-refresh-token' });
    // The retried request carries the NEW token, not the expired one.
    expect(requestLog[2].headers.get('Authorization')).toBe('Bearer new-access-token');
  });

  it('does not trigger a refresh for a 401 whose code is not UNAUTHENTICATED (e.g. a failed login)', async () => {
    const requestLog = installMockAdapter(() => ({
      status: 401,
      data: { ...UNAUTHENTICATED_BODY, code: 'INVALID_CREDENTIALS', path: '/auth/login' },
    }));

    await expect(apiClient.post('/auth/login', { email: 'a@b.com', password: 'wrong' })).rejects.toMatchObject({
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS' } },
    });

    // Only the one login attempt - no refresh was ever attempted.
    expect(requestLog).toHaveLength(1);
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('never retries a request more than once, even if the retried request also 401s', async () => {
    setAccessToken('expired-access-token');
    mockGetStoredRefreshToken.mockReturnValue('valid-refresh-token');

    const requestLog = installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/auth/refresh') {
        return { status: 200, data: refreshSuccessBody() };
      }
      return { status: 401, data: UNAUTHENTICATED_BODY };
    });

    await expect(apiClient.post('/admin/members/x/suspend')).rejects.toMatchObject({
      response: { status: 401, data: { code: 'UNAUTHENTICATED' } },
    });

    // original + refresh + one retry = 3, never a second refresh/retry cycle.
    expect(requestLog).toHaveLength(3);
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
  });

  it('the refresh request itself never triggers another refresh (no infinite loop)', async () => {
    setAccessToken('expired-access-token');
    mockGetStoredRefreshToken.mockReturnValue('stale-refresh-token');

    const requestLog = installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/auth/refresh') {
        return { status: 401, data: { ...UNAUTHENTICATED_BODY, code: 'INVALID_TOKEN', path: '/auth/refresh' } };
      }
      return { status: 401, data: UNAUTHENTICATED_BODY };
    });

    await expect(apiClient.post('/admin/members/x/suspend')).rejects.toMatchObject({
      response: { status: 401 },
    });

    // original + one refresh attempt only - the refresh call's own 401
    // (code INVALID_TOKEN, not UNAUTHENTICATED anyway) never triggers a
    // second refresh.
    expect(requestLog.map((r) => r.url)).toEqual(['/admin/members/x/suspend', '/auth/refresh']);
  });

  it('clears the session and notifies subscribers (logs the user out) when refresh itself fails', async () => {
    setAccessToken('expired-access-token');
    mockGetStoredRefreshToken.mockReturnValue('stale-refresh-token');

    installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/auth/refresh') {
        return {
          status: 401,
          data: { ...UNAUTHENTICATED_BODY, code: 'INVALID_TOKEN', path: '/auth/refresh' },
        };
      }
      return { status: 401, data: UNAUTHENTICATED_BODY };
    });

    await expect(apiClient.post('/admin/members/x/suspend')).rejects.toMatchObject({
      response: { status: 401, data: { code: 'UNAUTHENTICATED' } },
    });

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockNotifyAuthExpired).toHaveBeenCalledTimes(1);

    // The in-memory access token is also cleared - a subsequent request
    // carries no Authorization header at all until a fresh login/refresh.
    const requestLog = installMockAdapter(() => ({ status: 200, data: { ok: true } }));
    await apiClient.get('/auth/me');
    expect(requestLog[0].headers.has('Authorization')).toBe(false);
  });

  it('coalesces multiple simultaneous 401s into a single refresh call (single-flight)', async () => {
    setAccessToken('expired-access-token');
    mockGetStoredRefreshToken.mockReturnValue('valid-refresh-token');

    const seenOnce = new Set<string>();
    const requestLog = installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/auth/refresh') {
        return { status: 200, data: refreshSuccessBody() };
      }
      if (!seenOnce.has(requestConfig.url ?? '')) {
        seenOnce.add(requestConfig.url ?? '');
        return { status: 401, data: UNAUTHENTICATED_BODY };
      }
      return { status: 200, data: { url: requestConfig.url } };
    });

    const [responseA, responseB] = await Promise.all([apiClient.get('/a'), apiClient.get('/b')]);

    expect(responseA.data).toEqual({ url: '/a' });
    expect(responseB.data).toEqual({ url: '/b' });

    const refreshCalls = requestLog.filter((r) => r.url === '/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
  });
});

describe('toApiError', () => {
  it('normalizes a backend ApiError response as-is', async () => {
    installMockAdapter(() => ({ status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'not found' } }));

    try {
      await apiClient.post('/admin/members/x/suspend');
      throw new Error('expected the request to reject');
    } catch (error) {
      expect(toApiError(error).code).toBe('RESOURCE_NOT_FOUND');
    }
  });

  it('normalizes a network failure (no response) to NETWORK_ERROR', () => {
    const networkError = { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error', toJSON: () => ({}) };
    expect(toApiError(networkError).code).toBe('NETWORK_ERROR');
  });

  it('normalizes a timeout to REQUEST_TIMEOUT', () => {
    const timeoutError = { isAxiosError: true, code: 'ECONNABORTED', message: 'timeout', toJSON: () => ({}) };
    expect(toApiError(timeoutError).code).toBe('REQUEST_TIMEOUT');
  });

  it('normalizes a non-Axios error to UNKNOWN_ERROR', () => {
    expect(toApiError(new Error('boom')).code).toBe('UNKNOWN_ERROR');
  });
});
