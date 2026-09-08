import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getRedemptions } from '../../src/features/redemptions/api';
import type { AdminRedemptionResponse } from '../../src/features/redemptions/types';
import { RedemptionList } from '../../src/screens/RedemptionList/RedemptionList';

vi.mock('../../src/features/redemptions/api');

const mockGetRedemptions = vi.mocked(getRedemptions);

const REDEMPTION: AdminRedemptionResponse = {
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
  mockGetRedemptions.mockResolvedValue({
    content: [REDEMPTION],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    first: true,
    last: true,
    empty: false,
  });
});

describe.each([1024, 768])('redemption screens at %ipx', (width) => {
  it('RedemptionList renders its key content without crashing', async () => {
    renderAt(width, '/redemptions', '/redemptions', <RedemptionList />);

    expect(screen.getByText('Redemptions', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('Filters', { selector: 'h2' })).toBeInTheDocument();
    expect(await screen.findByText('redemption-1')).toBeInTheDocument();
  });
});
