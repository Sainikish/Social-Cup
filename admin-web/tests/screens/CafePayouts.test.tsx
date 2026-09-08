import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { calculatePayout, getPayoutsForCafe } from '../../src/features/payouts/api';
import type { PayoutResponse } from '../../src/features/payouts/types';
import { CafePayouts } from '../../src/screens/CafePayouts/CafePayouts';

vi.mock('../../src/features/payouts/api');

const mockGetPayoutsForCafe = vi.mocked(getPayoutsForCafe);
const mockCalculatePayout = vi.mocked(calculatePayout);

const SAMPLE_PAYOUT: PayoutResponse = {
  id: 'payout-1',
  cafeId: 'cafe-1',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  totalRedemptions: 42,
  totalCredits: 84,
  amountOwed: 168.0,
  amountPaid: null,
  paymentReference: null,
  paymentDate: null,
};

function renderScreen(initialEntries = ['/cafes/cafe-1/payouts']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/cafes/:cafeId/payouts" element={<CafePayouts />} />
          <Route path="/cafes/:cafeId" element={<div>Cafe Detail Screen</div>} />
          <Route path="/cafes" element={<div>Cafes List Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CafePayouts', () => {
  it('shows a loading state, then empty state if no payouts exist', async () => {
    mockGetPayoutsForCafe.mockResolvedValue([]);
    renderScreen();

    expect(screen.getByText('Loading payouts…')).toBeInTheDocument();
    expect(await screen.findByText('No payouts recorded for this cafe yet.')).toBeInTheDocument();
    expect(screen.getByText(/Payouts are calculated on-demand/)).toBeInTheDocument();
  });

  it('renders existing payouts once loaded', async () => {
    mockGetPayoutsForCafe.mockResolvedValue([SAMPLE_PAYOUT]);
    renderScreen();

    expect(await screen.findByText('$168.00')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
    expect(mockGetPayoutsForCafe).toHaveBeenCalledWith('cafe-1');
  });

  it('renders paid badge when amountPaid is present', async () => {
    const paidPayout: PayoutResponse = {
      ...SAMPLE_PAYOUT,
      amountPaid: 168.0,
      paymentReference: 'ACH-9988',
    };
    mockGetPayoutsForCafe.mockResolvedValue([paidPayout]);
    renderScreen();

    expect(await screen.findByText('$168.00 paid')).toBeInTheDocument();
    expect(screen.getByText('ACH-9988')).toBeInTheDocument();
  });

  it('shows an error state with retry on failed fetch', async () => {
    mockGetPayoutsForCafe.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('validates required dates on client side before submitting', async () => {
    mockGetPayoutsForCafe.mockResolvedValue([]);
    renderScreen();

    await screen.findByText('No payouts recorded for this cafe yet.');
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Payout' }));

    expect(await screen.findByText('Period start is required.')).toBeInTheDocument();
    expect(screen.getByText('Period end is required.')).toBeInTheDocument();
    expect(mockCalculatePayout).not.toHaveBeenCalled();
  });

  it('validates that periodEnd cannot be before periodStart', async () => {
    mockGetPayoutsForCafe.mockResolvedValue([]);
    renderScreen();

    await screen.findByText('No payouts recorded for this cafe yet.');
    fireEvent.change(screen.getByLabelText('Period Start'), { target: { value: '2026-08-31' } });
    fireEvent.change(screen.getByLabelText('Period End'), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Payout' }));

    expect(await screen.findByText('Period end cannot be before period start.')).toBeInTheDocument();
    expect(mockCalculatePayout).not.toHaveBeenCalled();
  });

  it('submits calculation and shows success message when valid', async () => {
    mockGetPayoutsForCafe.mockResolvedValue([]);
    mockCalculatePayout.mockResolvedValue(SAMPLE_PAYOUT);
    renderScreen();

    await screen.findByText('No payouts recorded for this cafe yet.');
    fireEvent.change(screen.getByLabelText('Period Start'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('Period End'), { target: { value: '2026-08-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Payout' }));

    expect(
      await screen.findByText(/Payout recorded: \$168\.00 owed across 42 redemption\(s\)/)
    ).toBeInTheDocument();

    expect(mockCalculatePayout).toHaveBeenCalledWith('cafe-1', {
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
    });
  });

  it('displays server error message when calculation fails', async () => {
    mockGetPayoutsForCafe.mockResolvedValue([]);
    mockCalculatePayout.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'Cafe not found' } },
      toJSON: () => ({}),
    });
    renderScreen();

    await screen.findByText('No payouts recorded for this cafe yet.');
    fireEvent.change(screen.getByLabelText('Period Start'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('Period End'), { target: { value: '2026-08-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate Payout' }));

    expect(await screen.findByText('This cafe could not be found.')).toBeInTheDocument();
  });
});
