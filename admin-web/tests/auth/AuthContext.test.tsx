import { act, render, screen, waitFor } from '@testing-library/react';

import { notifyAuthExpired } from '../../src/api/authSession';
import * as authApi from '../../src/auth/authApi';
import { AuthProvider, useAuth } from '../../src/auth/AuthContext';
import * as sessionStorageModule from '../../src/auth/sessionStorage';
import type { AdminAuthResponse } from '../../src/auth/types';
import { AdminAccessRequiredError } from '../../src/utils/errors';

vi.mock('../../src/auth/authApi');
vi.mock('../../src/auth/sessionStorage');

const mockLoginAdmin = vi.mocked(authApi.loginAdmin);
const mockRefreshAdmin = vi.mocked(authApi.refreshAdmin);
const mockGetStoredRefreshToken = vi.mocked(sessionStorageModule.getStoredRefreshToken);
const mockSaveSession = vi.mocked(sessionStorageModule.saveSession);
const mockClearSession = vi.mocked(sessionStorageModule.clearSession);

function authResponse(overrides: Partial<AdminAuthResponse['user']> = {}): AdminAuthResponse {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
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
      createdAt: '2026-01-01T00:00:00Z',
      ...overrides,
    },
  };
}

function TestConsumer() {
  const { isAuthenticated, isLoading, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? ''}</span>
      <button
        onClick={() => {
          login('admin@example.com', 'password123').catch(() => {
            /* surfaced via isAuthenticated below, not re-thrown in this harness */
          });
        }}
      >
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStoredRefreshToken.mockReturnValue(null);
});

describe('AuthProvider', () => {
  it('starts unauthenticated when no session is stored', async () => {
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'));
    expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
  });

  it('restores an authenticated session by refreshing a stored refresh token (ADMIN)', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stored-refresh');
    mockRefreshAdmin.mockResolvedValue(authResponse());

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));
    expect(screen.getByTestId('email')).toHaveTextContent('admin@example.com');
    expect(mockRefreshAdmin).toHaveBeenCalledWith('stored-refresh');
    expect(mockSaveSession).toHaveBeenCalledWith({ refreshToken: 'refresh-1' });
  });

  it('does not restore a session for a refreshed MEMBER (not ADMIN), and clears it', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stored-refresh');
    mockRefreshAdmin.mockResolvedValue(authResponse({ roles: ['MEMBER'] }));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'));
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('falls back to unauthenticated and clears the session when the stored refresh token is no longer valid', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stale-refresh');
    mockRefreshAdmin.mockRejectedValue(new Error('invalid token'));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'));
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('logs in successfully (ADMIN) and stores the session', async () => {
    mockLoginAdmin.mockResolvedValue(authResponse());
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'));

    act(() => {
      screen.getByText('login').click();
    });

    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));
    expect(screen.getByTestId('email')).toHaveTextContent('admin@example.com');
    expect(mockSaveSession).toHaveBeenCalledWith({ refreshToken: 'refresh-1' });
  });

  it('rejects a login for a valid MEMBER (not ADMIN), never stores a session, never sets authenticated', async () => {
    mockLoginAdmin.mockResolvedValue(authResponse({ roles: ['MEMBER'] }));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'));

    act(() => {
      screen.getByText('login').click();
    });

    await waitFor(() => expect(mockLoginAdmin).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('surfaces a login failure (bad password) without changing auth state or storing a session', async () => {
    mockLoginAdmin.mockRejectedValue(new Error('invalid credentials'));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'));

    act(() => {
      screen.getByText('login').click();
    });

    await waitFor(() => expect(mockLoginAdmin).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('logs out, clearing the session, in-memory state, and the authenticated user', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stored-refresh');
    mockRefreshAdmin.mockResolvedValue(authResponse());
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));

    act(() => {
      screen.getByText('logout').click();
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('email')).toHaveTextContent('');
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('drops to unauthenticated when notifyAuthExpired() fires (e.g. a failed background token refresh)', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stored-refresh');
    mockRefreshAdmin.mockResolvedValue(authResponse());
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true'));

    act(() => {
      notifyAuthExpired();
    });

    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
  });
});

describe('AuthContext throws when used outside an AuthProvider', () => {
  it('throws a clear error', () => {
    function Bare() {
      useAuth();
      return null;
    }
    expect(() => render(<Bare />)).toThrow('useAuth must be used within an AuthProvider');
  });
});

describe('AdminAccessRequiredError', () => {
  it('carries a safe, human-readable message', () => {
    expect(new AdminAccessRequiredError().message).toBe('Admin access required.');
  });
});
