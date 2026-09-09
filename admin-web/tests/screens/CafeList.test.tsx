import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { searchCafes } from '../../src/features/cafes/api';
import type { CafeSummaryResponse } from '../../src/features/cafes/types';
import type { PageResponse } from '../../src/types/api';
import { CafeList } from '../../src/screens/CafeList/CafeList';

vi.mock('../../src/features/cafes/api');

const mockSearchCafes = vi.mocked(searchCafes);

function page(content: CafeSummaryResponse[]): PageResponse<CafeSummaryResponse> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1, first: true, last: true, empty: content.length === 0 };
}

const SAMPLE_CAFE: CafeSummaryResponse = {
  id: 'cafe-1',
  name: 'Daily Grind',
  address: '123 Main St',
  neighbourhood: 'Downtown',
  latitude: null,
  longitude: null,
  featured: false,
  status: 'ACTIVE',
  vibeTags: null,
  primaryPhotoUrl: null,
  distanceKm: null,
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cafes']}>
        <Routes>
          <Route path="/cafes" element={<CafeList />} />
          <Route path="/cafes/new" element={<div>Create Cafe Screen</div>} />
          <Route path="/cafes/:id" element={<div>Cafe Detail Screen</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CafeList', () => {
  it('renders without searching, clearly stating the active-cafes-only limitation', () => {
    renderScreen();

    expect(screen.getByText('active-cafes-only')).toBeInTheDocument();
    expect(screen.queryByText(/all cafes/i)).not.toBeInTheDocument();
    expect(mockSearchCafes).not.toHaveBeenCalled();
  });

  it('searches and shows matching results', async () => {
    mockSearchCafes.mockResolvedValue(page([SAMPLE_CAFE]));
    renderScreen();

    fireEvent.change(screen.getByLabelText('Search active cafes by name'), { target: { value: 'grind' } });
    fireEvent.click(screen.getByText('Search'));

    expect(await screen.findByText('Daily Grind')).toBeInTheDocument();
    expect(mockSearchCafes).toHaveBeenCalledWith({ q: 'grind' });
  });

  it('renders a thumbnail when primaryPhotoUrl is present, and none when it is null', async () => {
    const withPhoto: CafeSummaryResponse = { ...SAMPLE_CAFE, id: 'cafe-2', name: 'Sunrise Roasters', primaryPhotoUrl: 'https://example.test/cafe.jpg' };
    mockSearchCafes.mockResolvedValue(page([SAMPLE_CAFE, withPhoto]));
    renderScreen();

    fireEvent.change(screen.getByLabelText('Search active cafes by name'), { target: { value: 'coffee' } });
    fireEvent.click(screen.getByText('Search'));

    await screen.findByText('Sunrise Roasters');
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.test/cafe.jpg');
  });

  it('shows an empty-results message for a search with no matches', async () => {
    mockSearchCafes.mockResolvedValue(page([]));
    renderScreen();

    fireEvent.change(screen.getByLabelText('Search active cafes by name'), { target: { value: 'nowhere' } });
    fireEvent.click(screen.getByText('Search'));

    expect(await screen.findByText('No active cafes matched "nowhere".')).toBeInTheDocument();
  });

  it('shows an error state with retry on a search API failure', async () => {
    mockSearchCafes.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    fireEvent.change(screen.getByLabelText('Search active cafes by name'), { target: { value: 'grind' } });
    fireEvent.click(screen.getByText('Search'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('navigates to /cafes/new when "Create Cafe" is pressed', () => {
    renderScreen();

    fireEvent.click(screen.getByText('Create Cafe'));

    expect(screen.getByText('Create Cafe Screen')).toBeInTheDocument();
  });

  it('opens a cafe directly by ID, for cafes that are not searchable (inactive/archived)', () => {
    renderScreen();

    fireEvent.change(screen.getByLabelText('Cafe ID'), { target: { value: 'cafe-42' } });
    fireEvent.click(screen.getByText('Open'));

    expect(screen.getByText('Cafe Detail Screen')).toBeInTheDocument();
  });
});
