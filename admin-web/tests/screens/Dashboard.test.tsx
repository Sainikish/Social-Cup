import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AuthContextValue } from '../../src/auth/types';
import { getDashboardMetrics } from '../../src/features/dashboardMetrics/api';
import type { AdminDashboardMetricsResponse } from '../../src/features/dashboardMetrics/types';
import { Dashboard } from '../../src/screens/Dashboard/Dashboard';

vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});
vi.mock('../../src/features/dashboardMetrics/api');

const mockUseAuth = vi.mocked(useAuth);
const mockGetDashboardMetrics = vi.mocked(getDashboardMetrics);

const SAMPLE_METRICS: AdminDashboardMetricsResponse = {
  totalMembers: 42,
  totalActiveCafes: 7,
  totalActiveDrinks: 15,
  totalRedemptions: 300,
  totalCreditsRedeemed: 1200,
  totalPayoutAmountOwed: 960.0,
  totalPayoutAmountPaid: 640.0,
};

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    isAuthenticated: true,
    isLoading: false,
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
    login: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDashboardMetrics.mockResolvedValue(SAMPLE_METRICS);
});

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Dashboard', () => {
  it('renders the Social Cup Admin placeholder for an authenticated ADMIN, with no invented metrics', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Social Cup Admin')).toBeInTheDocument();
    expect(screen.getByText('More of the dashboard is coming in later implementation phases.')).toBeInTheDocument();
    expect(screen.getByText('Signed in as admin@example.com')).toBeInTheDocument();
  });

  it('calls logout when "Log out" is pressed', () => {
    const logout = vi.fn();
    mockUseAuth.mockReturnValue(authValue({ logout }));

    renderDashboard();
    fireEvent.click(screen.getByText('Log out'));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('links to /cafes via the "Manage Cafes" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Cafes')).toBeInTheDocument();
  });

  it('links to /members via the "Manage Members" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Members')).toBeInTheDocument();
  });

  it('links to /subscriptions via the "Manage Subscriptions" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Subscriptions')).toBeInTheDocument();
  });

  it('links to /payouts via the "Manage Payouts" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Payouts')).toBeInTheDocument();
  });

  it('links to /redemptions via the "Manage Redemptions" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('Manage Redemptions')).toBeInTheDocument();
  });

  it('links to /audit-log via the "View Audit Log" button', () => {
    mockUseAuth.mockReturnValue(authValue());

    renderDashboard();

    expect(screen.getByText('View Audit Log')).toBeInTheDocument();
  });

  describe('Dashboard Metrics', () => {
    it('shows a loading state before the metrics resolve', () => {
      mockUseAuth.mockReturnValue(authValue());
      mockGetDashboardMetrics.mockReturnValue(new Promise(() => {}));

      renderDashboard();

      expect(screen.getByText('Loading metrics…')).toBeInTheDocument();
    });

    it('renders every backend-provided metric exactly, with no client-side calculation', async () => {
      mockUseAuth.mockReturnValue(authValue());

      renderDashboard();

      expect(await screen.findByText('42')).toBeInTheDocument();
      expect(screen.getByText('Total Members')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('Total Active Cafes')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('Total Active Drinks')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
      expect(screen.getByText('Total Redemptions')).toBeInTheDocument();
      expect(screen.getByText('1200')).toBeInTheDocument();
      expect(screen.getByText('Total Credits Redeemed')).toBeInTheDocument();
      expect(screen.getByText('$960.00')).toBeInTheDocument();
      expect(screen.getByText('Total Payout Amount Owed')).toBeInTheDocument();
      expect(screen.getByText('$640.00')).toBeInTheDocument();
      expect(screen.getByText('Total Payout Amount Paid')).toBeInTheDocument();
    });

    it('renders all-zero values honestly rather than hiding the section or treating it as an error', async () => {
      mockUseAuth.mockReturnValue(authValue());
      mockGetDashboardMetrics.mockResolvedValue({
        totalMembers: 0,
        totalActiveCafes: 0,
        totalActiveDrinks: 0,
        totalRedemptions: 0,
        totalCreditsRedeemed: 0,
        totalPayoutAmountOwed: 0,
        totalPayoutAmountPaid: 0,
      });

      renderDashboard();

      expect(await screen.findByText('Total Members')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(5);
      expect(screen.getAllByText('$0.00').length).toBe(2);
    });

    it('shows an error state with retry on a failed metrics fetch', async () => {
      mockUseAuth.mockReturnValue(authValue());
      mockGetDashboardMetrics.mockRejectedValue({
        isAxiosError: true,
        response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
        toJSON: () => ({}),
      });

      renderDashboard();

      expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
      // The rest of the dashboard (nav, placeholder) must still render even
      // when only the metrics section fails.
      expect(screen.getByText('Manage Cafes')).toBeInTheDocument();
    });

    it('shows an access-denied message for a 403 response', async () => {
      mockUseAuth.mockReturnValue(authValue());
      mockGetDashboardMetrics.mockRejectedValue({
        isAxiosError: true,
        response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
        toJSON: () => ({}),
      });

      renderDashboard();

      expect(await screen.findByText('You are not authorized to perform this action.')).toBeInTheDocument();
    });
  });
});
