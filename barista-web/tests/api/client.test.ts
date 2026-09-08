import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { notifyAuthExpired } from '../../src/api/authSession';
import { apiClient, setAccessToken, toApiError } from '../../src/api/client';
import { clearSession, getStoredRefreshToken, saveSession } from '../../src/auth/authStorage';
import type { BaristaAuthResponse } from '../../src/auth/types';

vi.mock('../../src/auth/authStorage');
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
  path: '/barista/redeem',
  requestId: 'req-1',
};

function refreshSuccessBody(): BaristaAuthResponse {
  return {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    cafeId: 'cafe-1',
  };
}

interface MockResponse {
  status: number;
  data: unknown;
}

// A minimal custom Axios adapter: request/response interceptors (the code
// under test) run exactly as they would against a real network, but this
// stands in for the actual HTTP call. Mirrors mobile/tests/api/client.test.ts's
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

describe('apiClient request interceptor - Authorization header', () => {
  it('attaches Authorization: Bearer <token> when an access token is currently held in memory', async () => {
    setAccessToken('stored-access-token');
    const requestLog = installMockAdapter(() => ({ status: 200, data: { ok: true } }));

    await apiClient.post('/barista/redeem', { code: 'abc' });

    expect(requestLog).toHaveLength(1);
    expect(requestLog[0].headers.get('Authorization')).toBe('Bearer stored-access-token');
  });

  it('does not attach an Authorization header when no access token is held', async () => {
    const requestLog = installMockAdapter(() => ({ status: 200, data: { content: [] } }));

    await apiClient.get('/cafes/search', { params: { q: 'blue' } });

    expect(requestLog).toHaveLength(1);
    expect(requestLog[0].headers.has('Authorization')).toBe(false);
  });
});

describe('apiClient response interceptor - 401 refresh-and-retry', () => {
  it('refreshes once on a 401 UNAUTHENTICATED and retries the original request exactly once', async () => {
    setAccessToken('expired-access-token');
    mockGetStoredRefreshToken.mockReturnValue('valid-refresh-token');

    const seenOnce = new Set<string>();
    const requestLog = installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/barista/refresh') {
        return { status: 200, data: refreshSuccessBody() };
      }
      if (!seenOnce.has(requestConfig.url ?? '')) {
        seenOnce.add(requestConfig.url ?? '');
        return { status: 401, data: UNAUTHENTICATED_BODY };
      }
      return { status: 200, data: { redemptionId: 'r1' } };
    });

    const response = await apiClient.post('/barista/redeem', { code: 'abc' });

    expect(response.data).toEqual({ redemptionId: 'r1' });
    expect(requestLog.map((r) => r.url)).toEqual(['/barista/redeem', '/barista/refresh', '/barista/redeem']);
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
    expect(mockSaveSession).toHaveBeenCalledWith({ refreshToken: 'new-refresh-token', cafeId: 'cafe-1' });
    // The retried request carries the NEW token, not the expired one.
    expect(requestLog[2].headers.get('Authorization')).toBe('Bearer new-access-token');
  });

  it('does not trigger a refresh for a 401 whose code is not UNAUTHENTICATED (e.g. a failed login)', async () => {
    const requestLog = installMockAdapter(() => ({
      status: 401,
      data: { ...UNAUTHENTICATED_BODY, code: 'INVALID_CREDENTIALS', path: '/barista/login' },
    }));

    await expect(apiClient.post('/barista/login', { cafeId: 'cafe-1', pin: 'wrong' })).rejects.toMatchObject({
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
      if (requestConfig.url === '/barista/refresh') {
        return { status: 200, data: refreshSuccessBody() };
      }
      return { status: 401, data: UNAUTHENTICATED_BODY };
    });

    await expect(apiClient.post('/barista/redeem', { code: 'abc' })).rejects.toMatchObject({
      response: { status: 401, data: { code: 'UNAUTHENTICATED' } },
    });

    // original + refresh + one retry = 3, never a second refresh/retry cycle.
    expect(requestLog).toHaveLength(3);
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
  });

  it('clears the session and notifies subscribers when refresh itself fails, surfacing the original 401', async () => {
    setAccessToken('expired-access-token');
    mockGetStoredRefreshToken.mockReturnValue('stale-refresh-token');

    installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/barista/refresh') {
        return {
          status: 401,
          data: { ...UNAUTHENTICATED_BODY, code: 'INVALID_TOKEN', path: '/barista/refresh' },
        };
      }
      return { status: 401, data: UNAUTHENTICATED_BODY };
    });

    await expect(apiClient.post('/barista/redeem', { code: 'abc' })).rejects.toMatchObject({
      response: { status: 401, data: { code: 'UNAUTHENTICATED' } },
    });

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(mockNotifyAuthExpired).toHaveBeenCalledTimes(1);

    // The in-memory access token is also cleared - a subsequent request
    // carries no Authorization header at all until a fresh login/refresh.
    const requestLog = installMockAdapter(() => ({ status: 200, data: { content: [] } }));
    await apiClient.get('/cafes/search', { params: { q: 'blue' } });
    expect(requestLog[0].headers.has('Authorization')).toBe(false);
  });

  it('coalesces multiple simultaneous 401s into a single refresh call (single-flight)', async () => {
    setAccessToken('expired-access-token');
    mockGetStoredRefreshToken.mockReturnValue('valid-refresh-token');

    const seenOnce = new Set<string>();
    const requestLog = installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/barista/refresh') {
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

    const refreshCalls = requestLog.filter((r) => r.url === '/barista/refresh');
    expect(refreshCalls).toHaveLength(1);
    expect(mockSaveSession).toHaveBeenCalledTimes(1);
  });
});

describe('toApiError', () => {
  it('normalizes a backend ApiError response as-is', async () => {
    installMockAdapter(() => ({ status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'not found' } }));

    try {
      await apiClient.post('/barista/redeem', { code: 'abc' });
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
