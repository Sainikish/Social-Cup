import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AdminUser, AuthContextValue } from '../../src/auth/types';
import { AppRouter } from '../../src/routes/AppRouter';

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

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('route protection', () => {
  it('lets an ADMIN reach /dashboard', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/dashboard');

    expect(screen.getByText('Social Cup Admin')).toBeInTheDocument();
    expect(screen.getByText('More of the dashboard is coming in later implementation phases.')).toBeInTheDocument();
  });

  it('denies a MEMBER access to /dashboard, redirecting to /login', () => {
    // A defensive scenario: isAuthenticated somehow true for a non-admin
    // user (AuthContext itself never produces this - see AuthContext.test.tsx
    // for that guarantee) - ProtectedRoute's own explicit role check must
    // still deny it independently.
    mockUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) })
    );

    renderAt('/dashboard');

    expect(screen.getByText('Social Cup Admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText('More of the dashboard is coming in later implementation phases.')).not.toBeInTheDocument();
  });

  it('redirects an anonymous user away from /dashboard to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/dashboard');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText('More of the dashboard is coming in later implementation phases.')).not.toBeInTheDocument();
  });

  it('shows a checking/loading state rather than redirecting while session status is unresolved', () => {
    mockUseAuth.mockReturnValue(authValue({ isLoading: true }));

    renderAt('/dashboard');

    expect(screen.getByText('Checking session…')).toBeInTheDocument();
  });

  it('redirects an already-authenticated admin away from /login to /dashboard', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/login');

    expect(screen.getByText('More of the dashboard is coming in later implementation phases.')).toBeInTheDocument();
  });

  it('lets an ADMIN reach /cafes', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/cafes');

    expect(screen.getByText('Create Cafe')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('denies a MEMBER access to /cafes, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderAt('/cafes');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText('Create Cafe')).not.toBeInTheDocument();
  });

  it('redirects an anonymous user away from /cafes to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/cafes');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('lets an ADMIN reach /cafes/new', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/cafes/new');

    expect(screen.getByText('Create Cafe', { selector: 'h1' })).toBeInTheDocument();
  });

  it('denies a MEMBER access to /cafes/new, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderAt('/cafes/new');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText('Create Cafe', { selector: 'h1' })).not.toBeInTheDocument();
  });

  it('redirects an anonymous user away from /cafes/new to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/cafes/new');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
