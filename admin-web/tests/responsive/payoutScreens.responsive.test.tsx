import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getPayoutsForCafe } from '../../src/features/payouts/api';
import type { PayoutResponse } from '../../src/features/payouts/types';
import { CafePayouts } from '../../src/screens/CafePayouts/CafePayouts';

vi.mock('../../src/features/payouts/api');

const mockGetPayoutsForCafe = vi.mocked(getPayoutsForCafe);

const PAYOUT: PayoutResponse = {
  id: 'payout-1',
  cafeId: 'cafe-1',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  totalRedemptions: 15,
  totalCredits: 30,
  amountOwed: 60.0,
  amountPaid: null,
  paymentReference: null,
  paymentDate: null,
};

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

function renderAt(width: number, path: string, routePath: string, ui: ReactElement) {
  setViewportWidth(width);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPayoutsForCafe.mockResolvedValue([PAYOUT]);
});

describe.each([1024, 768])('payout screens at %ipx', (width) => {
  it('CafePayouts renders its key content without crashing', async () => {
    renderAt(width, '/cafes/cafe-1/payouts', '/cafes/:cafeId/payouts', <CafePayouts />);

    expect(screen.getByText('Payouts', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('Calculate Payout', { selector: 'h2' })).toBeInTheDocument();
    expect(await screen.findByText('$60.00')).toBeInTheDocument();
  });
});
