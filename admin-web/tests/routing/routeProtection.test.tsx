import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AdminUser, AuthContextValue } from '../../src/auth/types';
import { getAuditLog } from '../../src/features/auditLog/api';
import { getDashboardMetrics } from '../../src/features/dashboardMetrics/api';
import { getDrinksByCafe } from '../../src/features/drinks/api';
import { getAllPayouts, getPayoutsForCafe } from '../../src/features/payouts/api';
import { getRedemptions } from '../../src/features/redemptions/api';
import { AppRouter } from '../../src/routes/AppRouter';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});
vi.mock('../../src/features/drinks/api');
vi.mock('../../src/features/payouts/api');
vi.mock('../../src/features/redemptions/api');
vi.mock('../../src/features/auditLog/api');
vi.mock('../../src/features/dashboardMetrics/api');

const mockUseAuth = vi.mocked(useAuth);
const mockGetDrinksByCafe = vi.mocked(getDrinksByCafe);
const mockGetPayoutsForCafe = vi.mocked(getPayoutsForCafe);
const mockGetAllPayouts = vi.mocked(getAllPayouts);
const mockGetRedemptions = vi.mocked(getRedemptions);
const mockGetAuditLog = vi.mocked(getAuditLog);
const mockGetDashboardMetrics = vi.mocked(getDashboardMetrics);

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
    mockGetDashboardMetrics.mockResolvedValue({
      totalMembers: 0, totalActiveCafes: 0, totalActiveDrinks: 0, totalRedemptions: 0,
      totalCreditsRedeemed: 0, totalPayoutAmountOwed: 0, totalPayoutAmountPaid: 0,
    });
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
    mockGetDashboardMetrics.mockResolvedValue({
      totalMembers: 0, totalActiveCafes: 0, totalActiveDrinks: 0, totalRedemptions: 0,
      totalCreditsRedeemed: 0, totalPayoutAmountOwed: 0, totalPayoutAmountPaid: 0,
    });
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

  it('lets an ADMIN reach /cafes/:cafeId/drinks', async () => {
    mockGetDrinksByCafe.mockResolvedValue({
      content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, first: true, last: true, empty: true,
    });
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/cafes/cafe-1/drinks');

    expect(await screen.findByText('Add Drink')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('denies a MEMBER access to /cafes/:cafeId/drinks, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderAt('/cafes/cafe-1/drinks');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetDrinksByCafe).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /cafes/:cafeId/drinks to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/cafes/cafe-1/drinks');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetDrinksByCafe).not.toHaveBeenCalled();
  });

  it('lets an ADMIN reach /cafes/:cafeId/drinks/new', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/cafes/cafe-1/drinks/new');

    expect(screen.getByText('Add Drink', { selector: 'h1' })).toBeInTheDocument();
  });

  it('denies a MEMBER access to /cafes/:cafeId/drinks/new, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderAt('/cafes/cafe-1/drinks/new');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByText('Add Drink', { selector: 'h1' })).not.toBeInTheDocument();
  });

  it('redirects an anonymous user away from /cafes/:cafeId/drinks/new to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/cafes/cafe-1/drinks/new');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('lets an ADMIN reach /cafes/:cafeId/payouts', async () => {
    mockGetPayoutsForCafe.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/cafes/cafe-1/payouts');

    expect(await screen.findByText('Payouts', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('denies a MEMBER access to /cafes/:cafeId/payouts, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderAt('/cafes/cafe-1/payouts');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetPayoutsForCafe).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /cafes/:cafeId/payouts to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/cafes/cafe-1/payouts');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetPayoutsForCafe).not.toHaveBeenCalled();
  });

  it('lets an ADMIN reach /payouts', async () => {
    mockGetAllPayouts.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/payouts');

    expect(await screen.findByText('No payouts found.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('denies a MEMBER access to /payouts, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderAt('/payouts');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetAllPayouts).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /payouts to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/payouts');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetAllPayouts).not.toHaveBeenCalled();
  });

  it('lets an ADMIN reach /redemptions', async () => {
    mockGetRedemptions.mockResolvedValue({
      content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true,
    });
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/redemptions');

    expect(await screen.findByText('No redemptions found.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('denies a MEMBER access to /redemptions, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderAt('/redemptions');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetRedemptions).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /redemptions to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/redemptions');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetRedemptions).not.toHaveBeenCalled();
  });

  it('lets an ADMIN reach /audit-log', async () => {
    mockGetAuditLog.mockResolvedValue({
      content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true,
    });
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderAt('/audit-log');

    expect(await screen.findByText('No audit log entries found.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('denies a MEMBER access to /audit-log, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderAt('/audit-log');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetAuditLog).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /audit-log to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderAt('/audit-log');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetAuditLog).not.toHaveBeenCalled();
  });
});
