import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getAllPayouts, markPayoutPaid } from '../../src/features/payouts/api';
import type { PayoutResponse } from '../../src/features/payouts/types';
import { PayoutList } from '../../src/screens/PayoutList/PayoutList';

vi.mock('../../src/features/payouts/api');

const mockGetAllPayouts = vi.mocked(getAllPayouts);
const mockMarkPayoutPaid = vi.mocked(markPayoutPaid);

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

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/payouts']}>
        <Routes>
          <Route path="/payouts" element={<PayoutList />} />
          <Route path="/cafes/:id" element={<div>Cafe Detail Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PayoutList', () => {
  it('shows a loading state before the data resolves', () => {
    mockGetAllPayouts.mockReturnValue(new Promise(() => {}));
    renderScreen();

    expect(screen.getByText('Loading payouts…')).toBeInTheDocument();
  });

  it('renders a professional empty state for an empty array, not an error', async () => {
    mockGetAllPayouts.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText('No payouts found.')).toBeInTheDocument();
  });

  it('renders an error state with retry on a failed fetch', async () => {
    mockGetAllPayouts.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('shows an access-denied message for a 403 response', async () => {
    mockGetAllPayouts.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('You are not authorized to perform this action.')).toBeInTheDocument();
  });

  it('renders payouts from every cafe with a link to each cafe', async () => {
    const otherCafePayout: PayoutResponse = { ...SAMPLE_PAYOUT, id: 'payout-2', cafeId: 'cafe-2', amountOwed: 42.5 };
    mockGetAllPayouts.mockResolvedValue([SAMPLE_PAYOUT, otherCafePayout]);
    renderScreen();

    expect(await screen.findByText('cafe-1')).toBeInTheDocument();
    expect(screen.getByText('cafe-2')).toBeInTheDocument();
    expect(screen.getByText('$168.00')).toBeInTheDocument();
    expect(screen.getByText('$42.50')).toBeInTheDocument();
  });

  it('never introduces pagination or search controls', async () => {
    mockGetAllPayouts.mockResolvedValue([SAMPLE_PAYOUT]);
    renderScreen();

    await screen.findByText('cafe-1');

    expect(screen.queryByText(/next/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/previous/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/page \d/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/search/i)).not.toBeInTheDocument();
  });

  it('shows "Not recorded" (never "Unpaid") when amountPaid is null, and offers Mark Paid', async () => {
    mockGetAllPayouts.mockResolvedValue([SAMPLE_PAYOUT]);
    renderScreen();

    await screen.findByText('cafe-1');

    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    expect(screen.queryByText('Unpaid')).not.toBeInTheDocument();
    expect(screen.getByText('Mark Paid')).toBeInTheDocument();
  });

  it('does not offer Mark Paid for an already-paid payout', async () => {
    const paidPayout: PayoutResponse = { ...SAMPLE_PAYOUT, amountPaid: 168.0, paymentReference: 'ACH-9988' };
    mockGetAllPayouts.mockResolvedValue([paidPayout]);
    renderScreen();

    expect(await screen.findByText('$168.00 paid')).toBeInTheDocument();
    expect(screen.getByText('ACH-9988')).toBeInTheDocument();
    expect(screen.queryByText('Mark Paid')).not.toBeInTheDocument();
  });

  it('opens the Mark Paid dialog, confirms, and shows success after the backend response', async () => {
    mockGetAllPayouts.mockResolvedValue([SAMPLE_PAYOUT]);
    mockMarkPayoutPaid.mockResolvedValue({ ...SAMPLE_PAYOUT, amountPaid: 168.0, paymentReference: 'ACH-1', paymentDate: '2026-09-01' });
    renderScreen();

    await screen.findByText('cafe-1');
    fireEvent.click(screen.getByText('Mark Paid'));

    expect(screen.getByText('Mark Payout Paid')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Amount Paid'), { target: { value: '168.00' } });
    fireEvent.change(screen.getByLabelText('Payment Reference'), { target: { value: 'ACH-1' } });
    fireEvent.change(screen.getByLabelText('Payment Date'), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Payout marked as paid successfully.')).toBeInTheDocument();
    expect(mockMarkPayoutPaid).toHaveBeenCalledWith('cafe-1', 'payout-1', {
      amountPaid: 168.0,
      paymentReference: 'ACH-1',
      paymentDate: '2026-09-01',
    });
  });

  it('shows validation errors for empty required fields without calling the API', async () => {
    mockGetAllPayouts.mockResolvedValue([SAMPLE_PAYOUT]);
    renderScreen();

    await screen.findByText('cafe-1');
    fireEvent.click(screen.getByText('Mark Paid'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(await screen.findByText('Payment reference is required.')).toBeInTheDocument();
    expect(screen.getByText('Payment date is required.')).toBeInTheDocument();
    expect(mockMarkPayoutPaid).not.toHaveBeenCalled();
  });

  it('shows a 409 conflict message and keeps the dialog open without assuming success', async () => {
    mockGetAllPayouts.mockResolvedValue([SAMPLE_PAYOUT]);
    mockMarkPayoutPaid.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'Payout has already been marked as paid' } },
      toJSON: () => ({}),
    });
    renderScreen();

    await screen.findByText('cafe-1');
    fireEvent.click(screen.getByText('Mark Paid'));
    fireEvent.change(screen.getByLabelText('Amount Paid'), { target: { value: '168.00' } });
    fireEvent.change(screen.getByLabelText('Payment Reference'), { target: { value: 'ACH-1' } });
    fireEvent.change(screen.getByLabelText('Payment Date'), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByText('Confirm'));

    expect(
      await screen.findByText('This action could not be completed because of a conflict with existing data. Refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Mark Payout Paid')).toBeInTheDocument();
    expect(screen.queryByText('Payout marked as paid successfully.')).not.toBeInTheDocument();
  });

  it('cancels the dialog without calling the API', async () => {
    mockGetAllPayouts.mockResolvedValue([SAMPLE_PAYOUT]);
    renderScreen();

    await screen.findByText('cafe-1');
    fireEvent.click(screen.getByText('Mark Paid'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Mark Payout Paid')).not.toBeInTheDocument();
    expect(mockMarkPayoutPaid).not.toHaveBeenCalled();
  });
});
