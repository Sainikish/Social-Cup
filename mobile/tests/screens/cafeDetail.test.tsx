import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import CafeDetailScreen from '../../app/(app)/cafes/[id]';
import * as cafesApi from '../../src/features/cafes/api';
import type { CafeDetailResponse, DrinkResponse } from '../../src/features/cafes/types';
import type { PageResponse } from '../../src/types/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'cafe-1' }),
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('../../src/features/cafes/api');

const mockGetCafeById = cafesApi.getCafeById as jest.MockedFunction<typeof cafesApi.getCafeById>;
const mockGetCafeDrinks = cafesApi.getCafeDrinks as jest.MockedFunction<typeof cafesApi.getCafeDrinks>;

function fullCafeDetail(): CafeDetailResponse {
  return {
    id: 'cafe-1',
    name: 'Blue Bottle Coffee',
    address: '300 Main St',
    neighbourhood: 'Downtown',
    latitude: 40.7128,
    longitude: -74.006,
    openingHours: [{ dayOfWeek: 'MONDAY', openTime: '09:00:00', closeTime: '17:00:00', isClosed: false }],
    phoneNumber: '555-1234',
    email: 'hello@bluebottle.com',
    website: 'bluebottle.com',
    featured: true,
    vibeTags: 'cozy,quiet',
    description: 'A lovely neighbourhood cafe.',
    status: 'ACTIVE',
    photos: [],
    drinks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function minimalCafeDetail(): CafeDetailResponse {
  return {
    id: 'cafe-1',
    name: 'Minimal Cafe',
    address: '1 Side St',
    neighbourhood: null,
    latitude: null,
    longitude: null,
    openingHours: [],
    phoneNumber: null,
    email: null,
    website: null,
    featured: false,
    vibeTags: null,
    description: null,
    status: 'ACTIVE',
    photos: [],
    drinks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function drinksPage(content: DrinkResponse[]): PageResponse<DrinkResponse> {
  return {
    content,
    page: 0,
    size: 50,
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
      <CafeDetailScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CafeDetailScreen', () => {
  it('renders full cafe detail with all sections when every field is present', async () => {
    mockGetCafeById.mockResolvedValue(fullCafeDetail());
    mockGetCafeDrinks.mockResolvedValue(drinksPage([]));

    renderScreen();

    expect(await screen.findByText('Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByText('Downtown · 300 Main St')).toBeTruthy();
    expect(screen.getByText('A lovely neighbourhood cafe.')).toBeTruthy();
    expect(screen.getByText('cozy,quiet')).toBeTruthy();
    expect(screen.getByText('Featured')).toBeTruthy();
    expect(screen.getByLabelText('Call Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByLabelText('Email Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByLabelText('Open Blue Bottle Coffee website')).toBeTruthy();
  });

  it('does not render empty optional sections (no description, vibe tags, contact, or featured badge)', async () => {
    mockGetCafeById.mockResolvedValue(minimalCafeDetail());
    mockGetCafeDrinks.mockResolvedValue(drinksPage([]));

    renderScreen();

    expect(await screen.findByText('Minimal Cafe')).toBeTruthy();
    expect(screen.queryByText('About')).toBeNull();
    expect(screen.queryByText('Vibe')).toBeNull();
    expect(screen.queryByText('Contact')).toBeNull();
    expect(screen.queryByText('Opening Hours')).toBeNull();
    expect(screen.queryByText('Featured')).toBeNull();
  });

  it('shows an error state with retry when the cafe detail request fails', async () => {
    mockGetCafeById.mockRejectedValue(new Error('not found'));

    renderScreen();

    expect(await screen.findByText('Retry')).toBeTruthy();
  });

  it('renders the drinks section for a cafe with multiple drinks', async () => {
    mockGetCafeById.mockResolvedValue(fullCafeDetail());
    mockGetCafeDrinks.mockResolvedValue(
      drinksPage([
        {
          id: 'd1',
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
        },
        {
          id: 'd2',
          cafeId: 'cafe-1',
          cafeName: 'Blue Bottle Coffee',
          name: 'Drip Coffee',
          type: 'Filter',
          description: null,
          retailPrice: 3.0,
          creditPrice: 3,
          photoUrl: null,
          signature: false,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
    );

    renderScreen();

    expect(await screen.findByText('Cortado')).toBeTruthy();
    expect(screen.getByText('Drip Coffee')).toBeTruthy();
  });

  it('shows an empty state in the drinks section for a cafe with no drinks', async () => {
    mockGetCafeById.mockResolvedValue(fullCafeDetail());
    mockGetCafeDrinks.mockResolvedValue(drinksPage([]));

    renderScreen();

    expect(await screen.findByText('No drinks listed yet')).toBeTruthy();
  });

  it('navigates to drink detail with only the drink id when a cafe drink row is pressed (Phase 7.4)', async () => {
    mockGetCafeById.mockResolvedValue(fullCafeDetail());
    mockGetCafeDrinks.mockResolvedValue(
      drinksPage([
        {
          id: 'd1',
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
        },
      ])
    );

    renderScreen();
    const row = await screen.findByLabelText('Open Cortado details');

    fireEvent.press(row);

    expect(mockPush).toHaveBeenCalledWith('/(app)/drinks/d1');
  });
});
