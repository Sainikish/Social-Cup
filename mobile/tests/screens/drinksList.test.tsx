import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DrinksScreen from '../../app/(app)/drinks/index';
import * as drinksApi from '../../src/features/drinks/api';
import type { DrinkResponse } from '../../src/features/drinks/types';
import type { PageResponse } from '../../src/types/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../src/features/drinks/api');

const mockGetSignatureDrinks = drinksApi.getSignatureDrinks as jest.MockedFunction<
  typeof drinksApi.getSignatureDrinks
>;

function drink(id: string, name: string): DrinkResponse {
  return {
    id,
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    name,
    type: 'Espresso',
    description: null,
    retailPrice: 4.5,
    creditPrice: 4,
    photoUrl: null,
    signature: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function page(content: DrinkResponse[]): PageResponse<DrinkResponse> {
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
      <DrinksScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DrinksScreen (signature drink discovery)', () => {
  it('shows a loading state, then the signature drinks list', async () => {
    mockGetSignatureDrinks.mockResolvedValue(page([drink('1', 'Cortado')]));

    renderScreen();

    expect(screen.getByText('Loading drinks...')).toBeTruthy();
    expect(await screen.findByText('Cortado')).toBeTruthy();
  });

  it('shows the empty state for zero signature drinks', async () => {
    mockGetSignatureDrinks.mockResolvedValue(page([]));

    renderScreen();

    expect(await screen.findByText('No signature drinks available')).toBeTruthy();
  });

  it('shows an error state with retry on API failure', async () => {
    mockGetSignatureDrinks.mockRejectedValue(new Error('network down'));

    renderScreen();

    expect(await screen.findByText('Retry')).toBeTruthy();
  });

  it('navigates to the drink detail route with only the drink id when a card is pressed', async () => {
    mockGetSignatureDrinks.mockResolvedValue(page([drink('42', 'Cold Brew')]));

    renderScreen();
    const card = await screen.findByLabelText('Open Cold Brew details');

    fireEvent.press(card);

    expect(mockPush).toHaveBeenCalledWith('/(app)/drinks/42');
  });
});
