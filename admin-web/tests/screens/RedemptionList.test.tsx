import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getRedemptions } from '../../src/features/redemptions/api';
import type { AdminRedemptionResponse } from '../../src/features/redemptions/types';
import { RedemptionList } from '../../src/screens/RedemptionList/RedemptionList';

vi.mock('../../src/features/redemptions/api');

const mockGetRedemptions = vi.mocked(getRedemptions);

const SAMPLE_REDEMPTION: AdminRedemptionResponse = {
  redemptionId: 'redemption-1',
  memberId: 'member-1',
  memberEmail: 'ada@example.com',
  cafeId: 'cafe-1',
  cafeName: 'Blue Bottle Coffee',
  drinkId: 'drink-1',
  drinkName: 'Oat Milk Latte',
  creditsDeducted: 4,
  payoutRate: 0.8,
  createdAt: '2026-01-15T10:00:00Z',
};

function pageOf(content: AdminRedemptionResponse[], overrides: Partial<Record<string, unknown>> = {}) {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: content.length > 0 ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/redemptions']}>
        <Routes>
          <Route path="/redemptions" element={<RedemptionList />} />
          <Route path="/members/:memberId" element={<div>Member Detail Screen</div>} />
          <Route path="/cafes/:id" element={<div>Cafe Detail Screen</div>} />
          <Route path="/drinks/:drinkId" element={<div>Drink Detail Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RedemptionList', () => {
  it('shows a loading state before the data resolves', () => {
    mockGetRedemptions.mockReturnValue(new Promise(() => {}));
    renderScreen();

    expect(screen.getByText('Loading redemptions…')).toBeInTheDocument();
  });

  it('requests the first page with default sort and no filters on initial render', () => {
    mockGetRedemptions.mockResolvedValue(pageOf([]));
    renderScreen();

    expect(mockGetRedemptions).toHaveBeenCalledWith({ page: 0, size: 20, sort: 'createdAt,desc' });
  });

  it('renders a professional empty state for an empty page, not an error', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([]));
    renderScreen();

    expect(await screen.findByText('No redemptions found.')).toBeInTheDocument();
  });

  it('renders an error state with retry on a failed fetch', async () => {
    mockGetRedemptions.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('shows an access-denied message for a 403 response', async () => {
    mockGetRedemptions.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('You are not authorized to perform this action.')).toBeInTheDocument();
  });

  it('renders every backend-provided field and links member/cafe/drink to their own detail screens', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([SAMPLE_REDEMPTION]));
    renderScreen();

    expect(await screen.findByText('redemption-1')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com').closest('a')).toHaveAttribute('href', '/members/member-1');
    expect(screen.getByText('Blue Bottle Coffee').closest('a')).toHaveAttribute('href', '/cafes/cafe-1');
    expect(screen.getByText('Oat Milk Latte').closest('a')).toHaveAttribute('href', '/drinks/drink-1');
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('0.8000')).toBeInTheDocument();
  });

  it('never calculates or displays a financial total not provided by the backend', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([SAMPLE_REDEMPTION]));
    renderScreen();

    await screen.findByText('redemption-1');

    expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/amount owed/i)).not.toBeInTheDocument();
  });

  it('offers no edit, delete, refund, or mutation action', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([SAMPLE_REDEMPTION]));
    renderScreen();

    await screen.findByText('redemption-1');

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /refund/i })).not.toBeInTheDocument();
  });

  it('applies the cafeId/memberId/drinkId/from/to filters and resets to the first page', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([]));
    renderScreen();

    await screen.findByText('No redemptions found.');
    fireEvent.change(screen.getByLabelText('Cafe ID'), { target: { value: 'cafe-1' } });
    fireEvent.change(screen.getByLabelText('Member ID'), { target: { value: 'member-1' } });
    fireEvent.change(screen.getByLabelText('Drink ID'), { target: { value: 'drink-1' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByText('Apply Filters'));

    expect(mockGetRedemptions).toHaveBeenLastCalledWith({
      cafeId: 'cafe-1',
      memberId: 'member-1',
      drinkId: 'drink-1',
      from: '2026-01-01',
      to: '2026-01-31',
      page: 0,
      size: 20,
      sort: 'createdAt,desc',
    });
  });

  it('shows a validation error and does not call the API again when "To" is before "From"', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([]));
    renderScreen();

    await screen.findByText('No redemptions found.');
    const callsBeforeSubmit = mockGetRedemptions.mock.calls.length;

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-31' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByText('Apply Filters'));

    expect(await screen.findByText('"To" cannot be before "From".')).toBeInTheDocument();
    expect(mockGetRedemptions.mock.calls.length).toBe(callsBeforeSubmit);
  });

  it('resets filters back to an unfiltered first-page request', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([]));
    renderScreen();

    await screen.findByText('No redemptions found.');
    fireEvent.change(screen.getByLabelText('Cafe ID'), { target: { value: 'cafe-1' } });
    fireEvent.click(screen.getByText('Apply Filters'));
    fireEvent.click(screen.getByText('Reset'));

    expect(mockGetRedemptions).toHaveBeenLastCalledWith({ page: 0, size: 20, sort: 'createdAt,desc' });
    expect((screen.getByLabelText('Cafe ID') as HTMLInputElement).value).toBe('');
  });

  it('changing sort order requests the first page with the new sort', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([]));
    renderScreen();

    await screen.findByText('No redemptions found.');
    fireEvent.change(screen.getByLabelText('Sort by created date'), { target: { value: 'createdAt,asc' } });

    expect(mockGetRedemptions).toHaveBeenLastCalledWith({ page: 0, size: 20, sort: 'createdAt,asc' });
  });

  it('never introduces client-side search/pagination controls beyond the shared Pagination component', async () => {
    mockGetRedemptions.mockResolvedValue(pageOf([SAMPLE_REDEMPTION], { totalPages: 1, first: true, last: true }));
    renderScreen();

    await screen.findByText('redemption-1');

    expect(screen.queryByText(/page \d of \d/i)).not.toBeInTheDocument();
  });

  it('renders Pagination controls for a multi-page result and requests the next page', async () => {
    mockGetRedemptions.mockResolvedValue(
      pageOf([SAMPLE_REDEMPTION], { totalElements: 41, totalPages: 3, first: true, last: false })
    );
    renderScreen();

    await screen.findByText('redemption-1');
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    const previousButton = screen.getByText('Previous');
    const nextButton = screen.getByText('Next');
    expect(previousButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);

    expect(mockGetRedemptions).toHaveBeenLastCalledWith({ page: 1, size: 20, sort: 'createdAt,desc' });
  });

  it('disables the Next button on the last page', async () => {
    mockGetRedemptions.mockResolvedValue(
      pageOf([SAMPLE_REDEMPTION], { page: 2, totalElements: 41, totalPages: 3, first: false, last: true })
    );
    renderScreen();

    await screen.findByText('redemption-1');

    expect(screen.getByText('Next')).toBeDisabled();
    expect(screen.getByText('Previous')).not.toBeDisabled();
  });
});
