import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { getDrinksByCafe } from '../../src/features/drinks/api';
import type { DrinkResponse } from '../../src/features/drinks/types';
import type { PageResponse } from '../../src/types/api';
import { DrinkList } from '../../src/screens/DrinkList/DrinkList';

vi.mock('../../src/features/drinks/api');

const mockGetDrinksByCafe = vi.mocked(getDrinksByCafe);

function page(content: DrinkResponse[]): PageResponse<DrinkResponse> {
  return { content, page: 0, size: 50, totalElements: content.length, totalPages: 1, first: true, last: true, empty: content.length === 0 };
}

const SAMPLE_DRINK: DrinkResponse = {
  id: 'drink-1',
  cafeId: 'cafe-1',
  cafeName: 'Daily Grind',
  name: 'Iced Latte',
  type: 'Coffee',
  description: null,
  retailPrice: 4.5,
  creditPrice: 2,
  photoUrl: null,
  signature: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cafes/cafe-1/drinks']}>
        <Routes>
          <Route path="/cafes/:cafeId/drinks" element={<DrinkList />} />
          <Route path="/cafes/:cafeId/drinks/new" element={<div>Drink Create Screen</div>} />
          <Route path="/drinks/:drinkId" element={<div>Drink Detail Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DrinkList', () => {
  it('shows a loading state, then clearly states the active-drinks-only limitation', async () => {
    mockGetDrinksByCafe.mockResolvedValue(page([]));
    renderScreen();

    expect(screen.getByText('Loading drinks…')).toBeInTheDocument();
    await screen.findByText('No active drinks at this cafe yet.');
    expect(screen.getByText('active-drinks-only')).toBeInTheDocument();
  });

  it('shows the returned drinks once loaded', async () => {
    mockGetDrinksByCafe.mockResolvedValue(page([SAMPLE_DRINK]));
    renderScreen();

    expect(await screen.findByText('Iced Latte')).toBeInTheDocument();
    expect(mockGetDrinksByCafe).toHaveBeenCalledWith({ cafeId: 'cafe-1' });
  });

  it('shows an error state with retry on a failed fetch', async () => {
    mockGetDrinksByCafe.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('navigates to the create-drink screen when "Add Drink" is pressed', async () => {
    mockGetDrinksByCafe.mockResolvedValue(page([]));
    renderScreen();

    await screen.findByText('No active drinks at this cafe yet.');
    fireEvent.click(screen.getByText('Add Drink'));

    expect(screen.getByText('Drink Create Screen')).toBeInTheDocument();
  });

  it('links each drink to its detail screen', async () => {
    mockGetDrinksByCafe.mockResolvedValue(page([SAMPLE_DRINK]));
    renderScreen();

    fireEvent.click(await screen.findByText('Iced Latte'));

    expect(screen.getByText('Drink Detail Screen')).toBeInTheDocument();
  });
});
