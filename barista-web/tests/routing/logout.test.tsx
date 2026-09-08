import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import * as authApi from '../../src/auth/api';
import { AuthProvider } from '../../src/auth/AuthContext';
import { getStoredRefreshToken, saveSession } from '../../src/auth/authStorage';
import type { BaristaAuthResponse } from '../../src/auth/types';
import { AppRouter } from '../../src/routes/AppRouter';

vi.mock('../../src/auth/api');

const mockRefreshBarista = vi.mocked(authApi.refreshBarista);

function authResponse(): BaristaAuthResponse {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    tokenType: 'Bearer',
    expiresIn: 900,
    cafeId: 'cafe-1',
  };
}

// Uses the REAL AuthProvider, authStorage (real sessionStorage), and
// AppRouter together - unlike tests/routing/routeProtection.test.tsx (which
// mocks useAuth entirely to test each static status in isolation), this
// verifies the actual end-to-end guarantee: calling logout() from inside a
// protected screen must leave no protected content reachable, with the
// persisted session genuinely gone from sessionStorage.
function renderApp(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AppRouter />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('logout (end-to-end): no protected content remains reachable afterward', () => {
  it('clears the persisted session and redirects from /scanner to /login when "Log out" is pressed', async () => {
    // Seeds a real, already-logged-in session in sessionStorage, exactly as
    // a page reload after a prior login would find it - AuthProvider's own
    // mount-time restore (POST /barista/refresh) then confirms it.
    saveSession({ refreshToken: 'stored-refresh', cafeId: 'cafe-1' });
    mockRefreshBarista.mockResolvedValue(authResponse());

    renderApp('/scanner');

    expect(await screen.findByText('Scan a code')).toBeInTheDocument();
    expect(getStoredRefreshToken()).toBe('refresh-1');

    fireEvent.click(screen.getByText('Log out'));

    await waitFor(() => expect(screen.getByText('Social Cup Barista')).toBeInTheDocument());
    expect(screen.queryByText('Scan a code')).not.toBeInTheDocument();
    expect(getStoredRefreshToken()).toBeNull();
  });
});
