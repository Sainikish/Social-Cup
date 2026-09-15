import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AdminUser, AuthContextValue } from '../../src/auth/types';
import { AppRouter } from '../../src/routes/AppRouter';
import { Settings } from '../../src/screens/Settings/Settings';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockUseAuth = vi.mocked(useAuth);

function adminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'member-1',
    email: 'admin@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['ADMIN'],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Settings', () => {
  it('shows the hardcoded credit value and the Stripe-mirrored plan price/allowance, both labeled read-only', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByText('Settings', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('$1.00')).toBeInTheDocument();
    expect(screen.getByText('$24.99/mo')).toBeInTheDocument();
    expect(screen.getByText('30 credits')).toBeInTheDocument();
    expect(screen.getAllByText(/Read-only/)).toHaveLength(2);
  });
});

describe('Settings - route protection for /settings', () => {
  function renderRouteAt(path: string) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <AppRouter />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it('lets an ADMIN reach /settings', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderRouteAt('/settings');

    expect(screen.getByText('Settings', { selector: 'h1' })).toBeInTheDocument();
  });

  it('redirects an anonymous user away from /settings to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderRouteAt('/settings');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
