import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import * as authApi from '../../src/auth/authApi';
import { AuthProvider } from '../../src/auth/AuthContext';
import { getStoredRefreshToken, saveSession } from '../../src/auth/sessionStorage';
import type { AdminAuthResponse } from '../../src/auth/types';
import { AppRouter } from '../../src/routes/AppRouter';

vi.mock('../../src/auth/authApi');

const mockRefreshAdmin = vi.mocked(authApi.refreshAdmin);

function authResponse(): AdminAuthResponse {
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
    },
  };
}

// Uses the REAL AuthProvider, real sessionStorage, and AppRouter together -
// unlike tests/routing/routeProtection.test.tsx (which mocks useAuth
// entirely to test each static state in isolation), this verifies the
// actual end-to-end guarantee: calling logout() from the dashboard must
// leave no protected content reachable, with the persisted session
// genuinely gone from sessionStorage.
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

describe('logout (end-to-end): protected dashboard cannot be reached after logout', () => {
  it('clears the persisted session and redirects from /dashboard to /login when "Log out" is pressed', async () => {
    // Seeds a real, already-logged-in session in sessionStorage, exactly as
    // a page reload after a prior login would find it - AuthProvider's own
    // mount-time restore (POST /auth/refresh) then confirms it.
    saveSession({ refreshToken: 'stored-refresh' });
    mockRefreshAdmin.mockResolvedValue(authResponse());

    renderApp('/dashboard');

    expect(await screen.findByText('More of the dashboard is coming in later implementation phases.')).toBeInTheDocument();
    expect(getStoredRefreshToken()).toBe('refresh-1');

    fireEvent.click(screen.getByText('Log out'));

    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument());
    expect(screen.queryByText('More of the dashboard is coming in later implementation phases.')).not.toBeInTheDocument();
    expect(getStoredRefreshToken()).toBeNull();
  });
});
