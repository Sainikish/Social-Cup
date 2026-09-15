import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '../../app/(app)/home';
import * as cafesApi from '../../src/features/cafes/api';
import type { CafeSummaryResponse } from '../../src/features/cafes/types';
import * as drinksApi from '../../src/features/drinks/api';
import type { DrinkResponse } from '../../src/features/drinks/types';
import type { PageResponse } from '../../src/types/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../src/features/cafes/api');
jest.mock('../../src/features/drinks/api');

const mockGetFeaturedCafes = cafesApi.getFeaturedCafes as jest.MockedFunction<
  typeof cafesApi.getFeaturedCafes
>;
const mockGetSignatureDrinks = drinksApi.getSignatureDrinks as jest.MockedFunction<
  typeof drinksApi.getSignatureDrinks
>;

function cafe(overrides: Partial<CafeSummaryResponse> = {}): CafeSummaryResponse {
  return {
    id: 'cafe-1',
    name: 'Blue Bottle Coffee',
    address: '300 Main St',
    neighbourhood: 'Downtown',
    latitude: null,
    longitude: null,
    featured: true,
    status: 'ACTIVE',
    vibeTags: null,
    primaryPhotoUrl: null,
    distanceKm: null,
    ...overrides,
  };
}

function drink(overrides: Partial<DrinkResponse> = {}): DrinkResponse {
  return {
    id: 'drink-1',
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    name: 'Cortado',
    type: 'Espresso',
    description: null,
    retailPrice: 4.5,
    creditPrice: 4,
    photoUrl: null,
    signature: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function cafePage(content: CafeSummaryResponse[]): PageResponse<CafeSummaryResponse> {
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

function drinkPage(content: DrinkResponse[]): PageResponse<DrinkResponse> {
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
      <HomeScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HomeScreen', () => {
  describe('Signature Drinks strip', () => {
    it('renders each signature drink returned by the first page', async () => {
      mockGetFeaturedCafes.mockResolvedValue(cafePage([]));
      mockGetSignatureDrinks.mockResolvedValue(drinkPage([drink(), drink({ id: 'drink-2', name: 'Cold Brew' })]));

      renderScreen();

      expect(await screen.findByText('Cortado')).toBeTruthy();
      expect(screen.getByText('Cold Brew')).toBeTruthy();
    });

    it('navigates to the drink detail route with only the drink id when a signature drink is pressed', async () => {
      mockGetFeaturedCafes.mockResolvedValue(cafePage([]));
      mockGetSignatureDrinks.mockResolvedValue(drinkPage([drink({ id: 'drink-42', name: 'Cold Brew' })]));

      renderScreen();
      fireEvent.press(await screen.findByLabelText('Open Cold Brew details'));

      expect(mockPush).toHaveBeenCalledWith('/(app)/drinks/drink-42');
    });

    it('shows an empty state when there are no signature drinks yet', async () => {
      mockGetFeaturedCafes.mockResolvedValue(cafePage([]));
      mockGetSignatureDrinks.mockResolvedValue(drinkPage([]));

      renderScreen();

      expect(await screen.findByText('No signature drinks yet')).toBeTruthy();
    });

    it('shows an error state with retry when the signature drinks request fails', async () => {
      mockGetFeaturedCafes.mockResolvedValue(cafePage([]));
      mockGetSignatureDrinks.mockRejectedValue(new Error('network down'));

      renderScreen();

      expect(await screen.findByText('Retry')).toBeTruthy();
    });
  });

  describe('Featured Cafes strip (regression)', () => {
    it('still renders featured cafes alongside the new signature drinks strip', async () => {
      mockGetFeaturedCafes.mockResolvedValue(cafePage([cafe()]));
      mockGetSignatureDrinks.mockResolvedValue(drinkPage([]));

      renderScreen();

      expect(await screen.findByText('Blue Bottle Coffee')).toBeTruthy();
    });

    it('navigates to the cafe detail route when a featured cafe is pressed', async () => {
      mockGetFeaturedCafes.mockResolvedValue(cafePage([cafe()]));
      mockGetSignatureDrinks.mockResolvedValue(drinkPage([]));

      renderScreen();
      fireEvent.press(await screen.findByLabelText('Open Blue Bottle Coffee cafe'));

      expect(mockPush).toHaveBeenCalledWith('/(app)/cafes/cafe-1');
    });
  });

  it('navigates to the full cafe list when "View All Cafes" is pressed', async () => {
    mockGetFeaturedCafes.mockResolvedValue(cafePage([]));
    mockGetSignatureDrinks.mockResolvedValue(drinkPage([]));

    renderScreen();
    await screen.findByText('No featured cafes yet');
    fireEvent.press(screen.getByLabelText('View all cafes'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/cafes');
  });
});
