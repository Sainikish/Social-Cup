import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CafesScreen from '../../app/(app)/cafes/index';
import * as cafesApi from '../../src/features/cafes/api';
import type { CafeSummaryResponse } from '../../src/features/cafes/types';
import type { PageResponse } from '../../src/types/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../src/features/cafes/api');

const mockGetCafes = cafesApi.getCafes as jest.MockedFunction<typeof cafesApi.getCafes>;
const mockSearchCafes = cafesApi.searchCafes as jest.MockedFunction<typeof cafesApi.searchCafes>;

function cafe(id: string, name: string): CafeSummaryResponse {
  return {
    id,
    name,
    address: '1 Main St',
    neighbourhood: 'Downtown',
    latitude: null,
    longitude: null,
    featured: false,
    status: 'ACTIVE',
    vibeTags: null,
    primaryPhotoUrl: null,
    distanceKm: null,
  };
}

function page(content: CafeSummaryResponse[]): PageResponse<CafeSummaryResponse> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CafesScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCafes.mockResolvedValue(page([cafe('1', 'Blue Bottle Coffee')]));
  mockSearchCafes.mockResolvedValue(page([cafe('2', 'Corner Cafe')]));
});

describe('CafesScreen', () => {
  it('browses the full list by default (GET /cafes, not /cafes/search)', async () => {
    renderScreen();

    await screen.findByText('Blue Bottle Coffee');
    expect(mockGetCafes).toHaveBeenCalled();
    expect(mockSearchCafes).not.toHaveBeenCalled();
  });

  it('debounces search input - typing quickly issues one search call with the final text, not one per keystroke', async () => {
    jest.useFakeTimers();
    renderScreen();
    await screen.findByText('Blue Bottle Coffee');

    const searchInput = screen.getByLabelText('Search cafes');
    fireEvent.changeText(searchInput, 'c');
    fireEvent.changeText(searchInput, 'co');
    fireEvent.changeText(searchInput, 'cor');

    // Not yet - the debounce window hasn't elapsed.
    expect(mockSearchCafes).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    jest.useRealTimers();

    await waitFor(() => expect(mockSearchCafes).toHaveBeenCalledTimes(1));
    expect(mockSearchCafes).toHaveBeenCalledWith(expect.objectContaining({ q: 'cor' }));
  });

  it('switches to search results once debounced text lands, replacing the browse list', async () => {
    renderScreen();
    await screen.findByText('Blue Bottle Coffee');

    fireEvent.changeText(screen.getByLabelText('Search cafes'), 'corner');

    await screen.findByText('Corner Cafe');
    expect(screen.queryByText('Blue Bottle Coffee')).toBeNull();
  });

  it('shows a "no cafes found" empty state for an empty search result', async () => {
    mockSearchCafes.mockResolvedValue(page([]));
    renderScreen();
    await screen.findByText('Blue Bottle Coffee');

    fireEvent.changeText(screen.getByLabelText('Search cafes'), 'nonexistent');

    expect(await screen.findByText('No cafes found')).toBeTruthy();
  });

  it('shows an error state when the search API call fails', async () => {
    mockSearchCafes.mockRejectedValue(new Error('network down'));
    renderScreen();
    await screen.findByText('Blue Bottle Coffee');

    fireEvent.changeText(screen.getByLabelText('Search cafes'), 'corner');

    expect(await screen.findByText('Retry')).toBeTruthy();
  });

  it('navigates to the cafe detail route with only the cafe id when a card is pressed', async () => {
    renderScreen();
    const card = await screen.findByLabelText('Open Blue Bottle Coffee cafe');

    fireEvent.press(card);

    expect(mockPush).toHaveBeenCalledWith('/(app)/cafes/1');
  });

  it('clears neighbourhood/featured filters via the Clear filters action', async () => {
    renderScreen();
    await screen.findByText('Blue Bottle Coffee');

    fireEvent.press(screen.getByLabelText('Show featured cafes only'));
    expect(await screen.findByText('Clear filters')).toBeTruthy();

    fireEvent.press(screen.getByText('Clear filters'));
    expect(screen.queryByText('Clear filters')).toBeNull();
  });
});
