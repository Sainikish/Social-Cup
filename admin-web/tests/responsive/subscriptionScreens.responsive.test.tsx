import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { getAllSubscriptions } from '../../src/features/subscriptions/api';
import type { AdminSubscriptionResponse } from '../../src/features/subscriptions/types';
import { SubscriptionList } from '../../src/screens/SubscriptionList/SubscriptionList';

vi.mock('../../src/features/subscriptions/api');

const mockGetAllSubscriptions = vi.mocked(getAllSubscriptions);

const SUBSCRIPTION: AdminSubscriptionResponse = {
  subscriptionId: 'sub-1',
  memberId: 'member-1',
  memberEmail: 'ada@example.com',
  status: 'ACTIVE',
  currentPeriodStart: '2026-01-01',
  currentPeriodEnd: '2026-02-01',
  cancelAtPeriodEnd: false,
  paymentFailedCount: 0,
};

// jsdom does not perform real CSS layout - this verifies the subscription
// screen renders its key content without crashing at both the
// desktop-first target (1024px) and the smallest explicitly-supported
// width (768px).
function setViewportWidth(width: number) {
  window.innerWidth = width;
  window.matchMedia =
    window.matchMedia ??
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
}

function renderAt(width: number) {
  setViewportWidth(width);
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
  mockGetAllSubscriptions.mockResolvedValue([SUBSCRIPTION]);
});

describe.each([1024, 768])('SubscriptionList at %ipx', (width) => {
  it('renders the subscription table without crashing', async () => {
    renderAt(width);

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('Subscriptions', { selector: 'h1' })).toBeInTheDocument();
  });
});
