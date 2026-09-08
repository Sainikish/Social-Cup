import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getDrinksByCafe, getPublicDrinkById } from '../../src/features/drinks/api';
import type { DrinkResponse } from '../../src/features/drinks/types';
import { DrinkCreate } from '../../src/screens/DrinkCreate/DrinkCreate';
import { DrinkDetail } from '../../src/screens/DrinkDetail/DrinkDetail';
import { DrinkList } from '../../src/screens/DrinkList/DrinkList';

vi.mock('../../src/features/drinks/api');

const mockGetDrinksByCafe = vi.mocked(getDrinksByCafe);
const mockGetPublicDrinkById = vi.mocked(getPublicDrinkById);

const DRINK: DrinkResponse = {
  id: 'drink-1',
  cafeId: 'cafe-1',
  cafeName: 'Daily Grind',
  name: 'Iced Latte',
  type: 'Coffee',
  description: null,
  retailPrice: 4.5,
  creditPrice: 2,
  photoUrl: null,
  signature: false,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// jsdom does not perform real CSS layout - this verifies each drink screen
// renders its key content without crashing at both the desktop-first
// target (1024px) and the smallest explicitly-supported width (768px).
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
  mockGetDrinksByCafe.mockResolvedValue({
    content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, first: true, last: true, empty: true,
  });
  mockGetPublicDrinkById.mockResolvedValue(DRINK);
});

describe.each([1024, 768])('drink screens at %ipx', (width) => {
  it('DrinkList renders its key content', async () => {
    renderAt(width, '/cafes/cafe-1/drinks', '/cafes/:cafeId/drinks', <DrinkList />);

    expect(screen.getByText('Drinks', { selector: 'h1' })).toBeInTheDocument();
    expect(await screen.findByText('No active drinks at this cafe yet.')).toBeInTheDocument();
  });

  it('DrinkCreate renders its form', () => {
    renderAt(width, '/cafes/cafe-1/drinks/new', '/cafes/:cafeId/drinks/new', <DrinkCreate />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Retail price')).toBeInTheDocument();
    expect(screen.getByLabelText('Credit price')).toBeInTheDocument();
  });

  it('DrinkDetail renders once loaded', async () => {
    renderAt(width, '/drinks/drink-1', '/drinks/:drinkId', <DrinkDetail />);

    expect(await screen.findByText('Iced Latte', { selector: 'h1' })).toBeInTheDocument();
  });
});
