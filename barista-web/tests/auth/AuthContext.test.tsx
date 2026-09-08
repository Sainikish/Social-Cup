import { act, render, screen, waitFor } from '@testing-library/react';

import { notifyAuthExpired } from '../../src/api/authSession';
import * as authApi from '../../src/auth/api';
import { AuthProvider, useAuth } from '../../src/auth/AuthContext';
import * as authStorage from '../../src/auth/authStorage';
import type { BaristaAuthResponse } from '../../src/auth/types';

vi.mock('../../src/auth/api');
vi.mock('../../src/auth/authStorage');

const mockLoginBarista = vi.mocked(authApi.loginBarista);
const mockRefreshBarista = vi.mocked(authApi.refreshBarista);
const mockGetStoredRefreshToken = vi.mocked(authStorage.getStoredRefreshToken);
const mockGetStoredCafeId = vi.mocked(authStorage.getStoredCafeId);
const mockSaveSession = vi.mocked(authStorage.saveSession);
const mockClearSession = vi.mocked(authStorage.clearSession);

function authResponse(overrides: Partial<BaristaAuthResponse> = {}): BaristaAuthResponse {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    tokenType: 'Bearer',
    expiresIn: 900,
    cafeId: 'cafe-1',
    ...overrides,
  };
}

function TestConsumer() {
  const { status, cafeId, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="cafeId">{cafeId ?? ''}</span>
      <button
        onClick={() => {
          login('cafe-1', '1234').catch(() => {
            /* surfaced via status below, not re-thrown in this harness */
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
  mockGetStoredCafeId.mockReturnValue(null);
});

describe('AuthProvider', () => {
  it('starts unauthenticated when no session is stored', async () => {
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
  });

  it('restores an authenticated session by refreshing a stored refresh token', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stored-refresh');
    mockGetStoredCafeId.mockReturnValue('cafe-1');
    mockRefreshBarista.mockResolvedValue(authResponse());

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('cafeId')).toHaveTextContent('cafe-1');
    expect(mockRefreshBarista).toHaveBeenCalledWith('stored-refresh');
    expect(mockSaveSession).toHaveBeenCalledWith({ refreshToken: 'refresh-1', cafeId: 'cafe-1' });
  });

  it('falls back to unauthenticated and clears the session when the stored refresh token is no longer valid', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stale-refresh');
    mockGetStoredCafeId.mockReturnValue('cafe-1');
    mockRefreshBarista.mockRejectedValue(new Error('invalid token'));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('logs in successfully and stores the session', async () => {
    mockLoginBarista.mockResolvedValue(authResponse({ cafeId: 'cafe-2' }));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    act(() => {
      screen.getByText('login').click();
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('cafeId')).toHaveTextContent('cafe-2');
    expect(mockSaveSession).toHaveBeenCalledWith({ refreshToken: 'refresh-1', cafeId: 'cafe-2' });
  });

  it('surfaces a login failure (bad PIN) without changing auth state or storing a session', async () => {
    mockLoginBarista.mockRejectedValue(new Error('invalid credentials'));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    act(() => {
      screen.getByText('login').click();
    });

    await waitFor(() => expect(mockLoginBarista).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('logs out, clearing the session, in-memory state, and cafeId', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stored-refresh');
    mockGetStoredCafeId.mockReturnValue('cafe-1');
    mockRefreshBarista.mockResolvedValue(authResponse());
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    act(() => {
      screen.getByText('logout').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('cafeId')).toHaveTextContent('');
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('drops to unauthenticated when notifyAuthExpired() fires (e.g. a failed background token refresh)', async () => {
    mockGetStoredRefreshToken.mockReturnValue('stored-refresh');
    mockGetStoredCafeId.mockReturnValue('cafe-1');
    mockRefreshBarista.mockResolvedValue(authResponse());
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    act(() => {
      notifyAuthExpired();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
});
