import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuth } from '../../src/auth/AuthContext';
import type { AdminUser, AuthContextValue } from '../../src/auth/types';
import { getAllSubscriptions } from '../../src/features/subscriptions/api';
import type { AdminSubscriptionResponse } from '../../src/features/subscriptions/types';
import { AppRouter } from '../../src/routes/AppRouter';
import { SubscriptionList } from '../../src/screens/SubscriptionList/SubscriptionList';

vi.mock('../../src/features/subscriptions/api');
vi.mock('../../src/auth/AuthContext', async () => {
  const actual = await vi.importActual('../../src/auth/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

const mockGetAllSubscriptions = vi.mocked(getAllSubscriptions);
const mockUseAuth = vi.mocked(useAuth);

function adminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'admin-1',
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

const ACTIVE_SUBSCRIPTION: AdminSubscriptionResponse = {
  subscriptionId: 'sub-1',
  memberId: 'member-1',
  memberEmail: 'ada@example.com',
  status: 'ACTIVE',
  currentPeriodStart: '2026-01-01',
  currentPeriodEnd: '2026-02-01',
  cancelAtPeriodEnd: false,
  paymentFailedCount: 0,
};

const PAST_DUE_SUBSCRIPTION: AdminSubscriptionResponse = {
  subscriptionId: 'sub-2',
  memberId: 'member-2',
  memberEmail: 'grace@example.com',
  status: 'PAST_DUE',
  currentPeriodStart: '2025-12-01',
  currentPeriodEnd: '2026-01-01',
  cancelAtPeriodEnd: true,
  paymentFailedCount: 2,
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SubscriptionList />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SubscriptionList', () => {
  it('shows a loading state before the data resolves', () => {
    mockGetAllSubscriptions.mockReturnValue(new Promise(() => {}));
    renderScreen();

    expect(screen.getByText('Loading subscriptions…')).toBeInTheDocument();
  });

  it('renders a professional empty state for an empty array, not an error', async () => {
    mockGetAllSubscriptions.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText('No subscriptions found.')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument();
  });

  it('renders an error state with retry on a failed fetch', async () => {
    mockGetAllSubscriptions.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('shows an access-denied message for a 403 response', async () => {
    mockGetAllSubscriptions.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('You are not authorized to view subscriptions.')).toBeInTheDocument();
  });

  it('shows a session-expired message for a 401 response', async () => {
    mockGetAllSubscriptions.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { code: 'UNAUTHENTICATED', message: 'unauthenticated' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Your session has expired. Please log in again.')).toBeInTheDocument();
  });

  it('renders the full subscription list with member, status, period, cancel flag and payment failures', async () => {
    mockGetAllSubscriptions.mockResolvedValue([ACTIVE_SUBSCRIPTION, PAST_DUE_SUBSCRIPTION]);
    renderScreen();

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('grace@example.com')).toBeInTheDocument();

    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('PAST_DUE')).toBeInTheDocument();

    // cancelAtPeriodEnd rendered as a clear Yes/No, not a cancel button.
    const noCells = screen.getAllByText('No');
    const yesCells = screen.getAllByText('Yes');
    expect(noCells.length).toBeGreaterThan(0);
    expect(yesCells.length).toBeGreaterThan(0);

    // paymentFailedCount rendered exactly as returned.
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Dates rendered in a human-readable form, not raw ISO strings.
    expect(screen.queryByText('2026-01-01')).not.toBeInTheDocument();
  });

  it('never introduces pagination controls', async () => {
    mockGetAllSubscriptions.mockResolvedValue([ACTIVE_SUBSCRIPTION]);
    renderScreen();

    await screen.findByText('ada@example.com');

    expect(screen.queryByText(/next/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/previous/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/page \d/i)).not.toBeInTheDocument();
  });

  it('never introduces a cancellation or reactivation control', async () => {
    mockGetAllSubscriptions.mockResolvedValue([ACTIVE_SUBSCRIPTION]);
    renderScreen();

    await screen.findByText('ada@example.com');

    expect(screen.queryByText(/cancel subscription/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reactivate/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('fetches subscriptions via useAdminSubscriptions on mount', async () => {
    mockGetAllSubscriptions.mockResolvedValue([]);
    renderScreen();

    await screen.findByText('No subscriptions found.');

    expect(mockGetAllSubscriptions).toHaveBeenCalledTimes(1);
  });
});

describe('SubscriptionList - route protection for /subscriptions', () => {
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

  it('lets an ADMIN reach /subscriptions', async () => {
    mockGetAllSubscriptions.mockResolvedValue([]);
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser() }));

    renderRouteAt('/subscriptions');

    expect(screen.getByText('Subscriptions', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('denies a MEMBER access to /subscriptions, redirecting to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: true, user: adminUser({ roles: ['MEMBER'] }) }));

    renderRouteAt('/subscriptions');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetAllSubscriptions).not.toHaveBeenCalled();
  });

  it('redirects an anonymous user away from /subscriptions to /login', () => {
    mockUseAuth.mockReturnValue(authValue({ isAuthenticated: false, user: null }));

    renderRouteAt('/subscriptions');

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(mockGetAllSubscriptions).not.toHaveBeenCalled();
  });
});
