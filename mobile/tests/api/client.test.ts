import { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { notifyAuthExpired } from '../../src/api/authSession';
import { apiClient } from '../../src/api/client';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from '../../src/storage/authStorage';
import type { AuthResponse } from '../../src/types/auth';

jest.mock('../../src/storage/authStorage');
jest.mock('../../src/api/authSession');

const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;
const mockSaveAuthTokens = saveAuthTokens as jest.MockedFunction<typeof saveAuthTokens>;
const mockClearAuthTokens = clearAuthTokens as jest.MockedFunction<typeof clearAuthTokens>;
const mockNotifyAuthExpired = notifyAuthExpired as jest.MockedFunction<typeof notifyAuthExpired>;

const UNAUTHENTICATED_BODY = {
  timestamp: new Date().toISOString(),
  status: 401,
  error: 'Unauthorized',
  code: 'UNAUTHENTICATED',
  message: 'Authentication is required to access this resource',
  path: '/auth/me',
  requestId: 'req-1',
};

const SAMPLE_USER = {
  id: 'member-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
  status: 'ACTIVE',
  roles: ['MEMBER'],
  createdAt: new Date().toISOString(),
};

function refreshSuccessBody(): AuthResponse {
  return {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: SAMPLE_USER,
  };
}

interface MockResponse {
  status: number;
  data: unknown;
}

// A minimal custom Axios adapter: request/response interceptors (the code
// under test) run exactly as they would against a real network, but this
// stands in for the actual HTTP call. `handler` decides the response per
// request; every call is recorded in `requestLog` for assertions.
//
// Real adapters (XHR/http) decide resolve-vs-reject themselves by checking
// `validateStatus` before handing back to axios - dispatchRequest does NOT
// do this automatically (it just calls `adapter(config).then(...)`). This
// mock has to do the same, or every response - 401 included - would resolve
// as if it were a success.
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

describe('apiClient request interceptor - Authorization header', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('attaches Authorization: Bearer <token> when an access token is stored', async () => {
    mockGetAccessToken.mockResolvedValue('stored-access-token');
    const requestLog = installMockAdapter(() => ({ status: 200, data: SAMPLE_USER }));

    await apiClient.get('/auth/me');

    expect(requestLog).toHaveLength(1);
    expect(requestLog[0].headers.get('Authorization')).toBe('Bearer stored-access-token');
  });

  it('does not attach an Authorization header when no access token is stored', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    const requestLog = installMockAdapter(() => ({ status: 200, data: { ok: true } }));

    await apiClient.get('/cafes');

    expect(requestLog).toHaveLength(1);
    expect(requestLog[0].headers.has('Authorization')).toBe(false);
  });
});

describe('apiClient response interceptor - 401 refresh-and-retry', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes once on a 401 UNAUTHENTICATED and retries the original request exactly once', async () => {
    // Stateful, like real SecureStore: once saveAuthTokens "persists" the new
    // token, a subsequent getAccessToken() call (the request interceptor
    // re-running for the retry) reads that new value back - not the stale
    // one it started with.
    let currentAccessToken = 'expired-access-token';
    mockGetAccessToken.mockImplementation(async () => currentAccessToken);
    mockGetRefreshToken.mockResolvedValue('valid-refresh-token');
    mockSaveAuthTokens.mockImplementation(async (tokens) => {
      currentAccessToken = tokens.accessToken;
    });

    const seenOnce = new Set<string>();
    const requestLog = installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/auth/refresh') {
        return { status: 200, data: refreshSuccessBody() };
      }
      if (!seenOnce.has(requestConfig.url ?? '')) {
        seenOnce.add(requestConfig.url ?? '');
        return { status: 401, data: UNAUTHENTICATED_BODY };
      }
      return { status: 200, data: SAMPLE_USER };
    });

    const response = await apiClient.get('/auth/me');

    expect(response.data).toEqual(SAMPLE_USER);
    // Exactly 3 calls: the original 401, the refresh, and the single retry.
    expect(requestLog.map((r) => r.url)).toEqual(['/auth/me', '/auth/refresh', '/auth/me']);
    expect(mockSaveAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockSaveAuthTokens).toHaveBeenCalledWith({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    // The retried request carries the NEW token, not the expired one.
    expect(requestLog[2].headers.get('Authorization')).toBe('Bearer new-access-token');
  });

  it('does not trigger a refresh for a 401 whose code is not UNAUTHENTICATED (e.g. a failed login)', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    const requestLog = installMockAdapter(() => ({
      status: 401,
      data: { ...UNAUTHENTICATED_BODY, code: 'INVALID_CREDENTIALS' },
    }));

    await expect(
      apiClient.post('/auth/login', { email: 'a@b.com', password: 'wrong' })
    ).rejects.toMatchObject({
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS' } },
    });

    // Only the one login attempt - no refresh was ever attempted.
    expect(requestLog).toHaveLength(1);
    expect(mockSaveAuthTokens).not.toHaveBeenCalled();
  });

  it('never retries a request more than once, even if the retried request also 401s', async () => {
    mockGetAccessToken.mockResolvedValue('expired-access-token');
    mockGetRefreshToken.mockResolvedValue('valid-refresh-token');
    mockSaveAuthTokens.mockResolvedValue(undefined);

    // Every /auth/me call 401s, no matter what - refresh itself succeeds,
    // but the "new" token still doesn't satisfy the (misbehaving) backend.
    const requestLog = installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/auth/refresh') {
        return { status: 200, data: refreshSuccessBody() };
      }
      return { status: 401, data: UNAUTHENTICATED_BODY };
    });

    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
      response: { status: 401, data: { code: 'UNAUTHENTICATED' } },
    });

    // original + refresh + one retry = 3, never a second refresh/retry cycle.
    expect(requestLog).toHaveLength(3);
    expect(mockSaveAuthTokens).toHaveBeenCalledTimes(1);
  });

  it('clears stored tokens and notifies subscribers when refresh itself fails, surfacing the original 401', async () => {
    mockGetAccessToken.mockResolvedValue('expired-access-token');
    mockGetRefreshToken.mockResolvedValue('stale-refresh-token');
    mockClearAuthTokens.mockResolvedValue(undefined);

    installMockAdapter((requestConfig) => {
      if (requestConfig.url === '/auth/refresh') {
        return {
          status: 401,
          data: { ...UNAUTHENTICATED_BODY, code: 'INVALID_TOKEN', path: '/auth/refresh' },
        };
      }
      return { status: 401, data: UNAUTHENTICATED_BODY };
    });

    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
      response: { status: 401, data: { code: 'UNAUTHENTICATED' } },
    });

    expect(mockClearAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockNotifyAuthExpired).toHaveBeenCalledTimes(1);
  });

  it('coalesces multiple simultaneous 401s into a single refresh call (single-flight)', async () => {
    mockGetAccessToken.mockResolvedValue('expired-access-token');
    mockGetRefreshToken.mockResolvedValue('valid-refresh-token');
    mockSaveAuthTokens.mockResolvedValue(undefined);

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
    expect(mockSaveAuthTokens).toHaveBeenCalledTimes(1);
  });
});
