import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { searchCafesForAdmin } from '../../src/features/cafes/api';
import type { CafeSummaryResponse } from '../../src/features/cafes/types';
import type { PageResponse } from '../../src/types/api';
import { CafeList } from '../../src/screens/CafeList/CafeList';

vi.mock('../../src/features/cafes/api');

const mockSearchCafesForAdmin = vi.mocked(searchCafesForAdmin);

function page(content: CafeSummaryResponse[]): PageResponse<CafeSummaryResponse> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: content.length > 0 ? 1 : 0, first: true, last: true, empty: content.length === 0 };
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

const ARCHIVED_CAFE: CafeSummaryResponse = {
  ...SAMPLE_CAFE,
  id: 'cafe-2',
  name: 'Closed Shop',
  status: 'ARCHIVED',
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
  it('shows a loading state before the data resolves', () => {
    mockSearchCafesForAdmin.mockReturnValue(new Promise(() => {}));
    renderScreen();

    expect(screen.getByText('Loading cafes…')).toBeInTheDocument();
  });

  it('requests the first page with no filters on initial render', () => {
    mockSearchCafesForAdmin.mockResolvedValue(page([]));
    renderScreen();

    expect(mockSearchCafesForAdmin).toHaveBeenCalledWith({ page: 0, size: 20 });
  });

  it('renders a professional empty state for an empty page, not an error', async () => {
    mockSearchCafesForAdmin.mockResolvedValue(page([]));
    renderScreen();

    expect(await screen.findByText('No cafes matched these filters.')).toBeInTheDocument();
  });

  it('renders an error state with retry on a search API failure', async () => {
    mockSearchCafesForAdmin.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    });
    renderScreen();

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('renders cafes of any status, including archived, linking each row to its detail screen', async () => {
    mockSearchCafesForAdmin.mockResolvedValue(page([SAMPLE_CAFE, ARCHIVED_CAFE]));
    renderScreen();

    expect(await screen.findByText('Closed Shop')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Daily Grind'));
    expect(screen.getByText('Cafe Detail Screen')).toBeInTheDocument();
  });

  it('applies the search query and status filter together', async () => {
    mockSearchCafesForAdmin.mockResolvedValue(page([]));
    renderScreen();
    await screen.findByText('No cafes matched these filters.');

    fireEvent.change(screen.getByLabelText('Search by name or address'), { target: { value: 'grind' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ARCHIVED' } });
    fireEvent.click(screen.getByText('Search'));

    expect(mockSearchCafesForAdmin).toHaveBeenLastCalledWith({ q: 'grind', status: 'ARCHIVED', page: 0, size: 20 });
  });

  it('reset clears the applied filters', async () => {
    mockSearchCafesForAdmin.mockResolvedValue(page([]));
    renderScreen();
    await screen.findByText('No cafes matched these filters.');

    fireEvent.change(screen.getByLabelText('Search by name or address'), { target: { value: 'grind' } });
    fireEvent.click(screen.getByText('Search'));
    fireEvent.click(screen.getByText('Reset'));

    expect(mockSearchCafesForAdmin).toHaveBeenLastCalledWith({ page: 0, size: 20 });
  });

  it('navigates to /cafes/new when "Create Cafe" is pressed', () => {
    mockSearchCafesForAdmin.mockResolvedValue(page([]));
    renderScreen();

    fireEvent.click(screen.getByText('Create Cafe'));

    expect(screen.getByText('Create Cafe Screen')).toBeInTheDocument();
  });
});
