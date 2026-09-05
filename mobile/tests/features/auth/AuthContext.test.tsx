import { act, renderHook, waitFor } from '@testing-library/react-native';

import * as authApi from '../../../src/api/auth';
import { AuthProvider, useAuth } from '../../../src/features/auth';
import { queryClient } from '../../../src/lib/queryClient';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAuthTokens,
} from '../../../src/storage/authStorage';
import type { AuthResponse, MemberDto } from '../../../src/types/auth';

jest.mock('../../../src/api/auth');
jest.mock('../../../src/storage/authStorage');

const mockLogin = authApi.login as jest.MockedFunction<typeof authApi.login>;
const mockRegister = authApi.register as jest.MockedFunction<typeof authApi.register>;
const mockGetCurrentUser = authApi.getCurrentUser as jest.MockedFunction<typeof authApi.getCurrentUser>;
const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockGetRefreshToken = getRefreshToken as jest.MockedFunction<typeof getRefreshToken>;
const mockSaveAuthTokens = saveAuthTokens as jest.MockedFunction<typeof saveAuthTokens>;
const mockClearAuthTokens = clearAuthTokens as jest.MockedFunction<typeof clearAuthTokens>;

const SAMPLE_USER: MemberDto = {
  id: 'member-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
  status: 'ACTIVE',
  roles: ['MEMBER'],
  createdAt: new Date().toISOString(),
};

function authResponse(): AuthResponse {
  return {
    accessToken: 'issued-access-token',
    refreshToken: 'issued-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: SAMPLE_USER,
  };
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveAuthTokens.mockResolvedValue(undefined);
  mockClearAuthTokens.mockResolvedValue(undefined);
});

describe('AuthContext initialization', () => {
  it('resolves to unauthenticated when no tokens are stored', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue(null);

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(result.current.user).toBeNull();
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('resolves to authenticated when stored tokens prove usable', async () => {
    mockGetAccessToken.mockResolvedValue('stored-access-token');
    mockGetRefreshToken.mockResolvedValue('stored-refresh-token');
    mockGetCurrentUser.mockResolvedValue(SAMPLE_USER);

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user).toEqual(SAMPLE_USER);
  });

  it('falls back to unauthenticated and clears tokens when stored tokens turn out to be unusable', async () => {
    mockGetAccessToken.mockResolvedValue('stored-access-token');
    mockGetRefreshToken.mockResolvedValue('stored-refresh-token');
    mockGetCurrentUser.mockRejectedValue(new Error('refresh also failed'));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(result.current.user).toBeNull();
    expect(mockClearAuthTokens).toHaveBeenCalledTimes(1);
  });
});

describe('AuthContext login/register', () => {
  it('login saves the returned tokens and authenticates the user', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue(null);
    mockLogin.mockResolvedValue(authResponse());

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    await act(async () => {
      await result.current.login({ email: 'ada@example.com', password: 'correct-password' });
    });

    expect(mockLogin).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct-password' });
    expect(mockSaveAuthTokens).toHaveBeenCalledWith({
      accessToken: 'issued-access-token',
      refreshToken: 'issued-refresh-token',
    });
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user).toEqual(SAMPLE_USER);
  });

  it('register saves the returned tokens and authenticates the user', async () => {
    mockGetAccessToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue(null);
    mockRegister.mockResolvedValue(authResponse());

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    await act(async () => {
      await result.current.register({ email: 'ada@example.com', password: 'brand-new-password' });
    });

    expect(mockRegister).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'brand-new-password' });
    expect(mockSaveAuthTokens).toHaveBeenCalledWith({
      accessToken: 'issued-access-token',
      refreshToken: 'issued-refresh-token',
    });
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user).toEqual(SAMPLE_USER);
  });
});

describe('AuthContext logout', () => {
  it('clears tokens and resets to unauthenticated', async () => {
    mockGetAccessToken.mockResolvedValue('stored-access-token');
    mockGetRefreshToken.mockResolvedValue('stored-refresh-token');
    mockGetCurrentUser.mockResolvedValue(SAMPLE_USER);

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockClearAuthTokens).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
  });

  it('clears the shared query cache, so no stale data survives into the next account on this device', async () => {
    mockGetAccessToken.mockResolvedValue('stored-access-token');
    mockGetRefreshToken.mockResolvedValue('stored-refresh-token');
    mockGetCurrentUser.mockResolvedValue(SAMPLE_USER);
    queryClient.setQueryData(['probe'], { leaked: true });

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    await act(async () => {
      await result.current.logout();
    });

    expect(queryClient.getQueryData(['probe'])).toBeUndefined();
  });

  it('makes no API request during logout beyond what authentication already required', async () => {
    mockGetAccessToken.mockResolvedValue('stored-access-token');
    mockGetRefreshToken.mockResolvedValue('stored-refresh-token');
    mockGetCurrentUser.mockResolvedValue(SAMPLE_USER);

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.logout();
    });

    // No additional /auth/me, login, or register call was made as part of
    // signing out - logout is purely local (clear tokens, clear cache).
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
