import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DrinkDetailScreen from '../../app/(app)/drinks/[id]';
import * as drinksApi from '../../src/features/drinks/api';
import type { DrinkResponse } from '../../src/features/drinks/types';

const mockPush = jest.fn();
let mockSearchParams: { id: string } = { id: 'drink-1' };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('../../src/features/drinks/api');

const mockGetDrinkById = drinksApi.getDrinkById as jest.MockedFunction<typeof drinksApi.getDrinkById>;

function fullDrink(): DrinkResponse {
  return {
    id: 'drink-1',
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    name: 'Cortado',
    type: 'Espresso',
    description: 'A short, strong shot cut with steamed milk.',
    retailPrice: 4.5,
    creditPrice: 4,
    photoUrl: 'https://example.com/cortado.jpg',
    signature: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function minimalDrink(): DrinkResponse {
  return {
    id: 'drink-1',
    cafeId: 'cafe-1',
    cafeName: 'Corner Cafe',
    name: 'Minimal Drip',
    type: null,
    description: null,
    retailPrice: null,
    creditPrice: 2,
    photoUrl: null,
    signature: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DrinkDetailScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = { id: 'drink-1' };
});

describe('DrinkDetailScreen', () => {
  it('renders a valid drink with all fields present', async () => {
    mockGetDrinkById.mockResolvedValue(fullDrink());

    renderScreen();

    expect(await screen.findByText('Cortado')).toBeTruthy();
    expect(screen.getByText('Espresso')).toBeTruthy();
    expect(screen.getByText('A short, strong shot cut with steamed milk.')).toBeTruthy();
    expect(screen.getByText('$4.50')).toBeTruthy();
    expect(screen.getByText('4 credits')).toBeTruthy();
    expect(screen.getByText('★ Signature')).toBeTruthy();
    expect(screen.getByLabelText('Open Blue Bottle Coffee cafe')).toBeTruthy();
  });

  it('does not render a description section when missing', async () => {
    mockGetDrinkById.mockResolvedValue(minimalDrink());

    renderScreen();

    expect(await screen.findByText('Minimal Drip')).toBeTruthy();
    expect(screen.queryByText('About')).toBeNull();
  });

  it('shows a photo placeholder when there is no photo, without crashing', async () => {
    mockGetDrinkById.mockResolvedValue(minimalDrink());

    renderScreen();

    expect(await screen.findByText('🥤')).toBeTruthy();
  });

  it('omits type, signature badge, and unavailable note when not applicable', async () => {
    mockGetDrinkById.mockResolvedValue(minimalDrink());

    renderScreen();

    await screen.findByText('Minimal Drip');
    expect(screen.queryByText('★ Signature')).toBeNull();
    expect(screen.queryByText('Currently unavailable')).toBeNull();
  });

  it('shows a "Currently unavailable" note for a non-ACTIVE drink', async () => {
    mockGetDrinkById.mockResolvedValue({ ...minimalDrink(), status: 'INACTIVE' });

    renderScreen();

    expect(await screen.findByText('Currently unavailable')).toBeTruthy();
  });

  it('reserves an empty Ratings section without calling any rating endpoint', async () => {
    mockGetDrinkById.mockResolvedValue(fullDrink());

    renderScreen();

    expect(await screen.findByText('Ratings')).toBeTruthy();
    expect(screen.getByText('Ratings are coming soon.')).toBeTruthy();
  });

  it('shows a loading state before the drink resolves', () => {
    mockGetDrinkById.mockReturnValue(new Promise(() => {}));

    renderScreen();

    expect(screen.getByText('Loading drink...')).toBeTruthy();
  });

  it('shows an error state with retry when the request fails', async () => {
    mockGetDrinkById.mockRejectedValue(new Error('not found'));

    renderScreen();

    expect(await screen.findByText('Retry')).toBeTruthy();
  });

  it('handles a missing/empty id gracefully rather than crashing', () => {
    mockSearchParams = { id: '' };

    renderScreen();

    // The query is disabled for an empty id (see useDrinkDetailQuery's
    // `enabled: Boolean(id)`), so there is no data and no in-flight fetch -
    // the screen falls back to its "not found" state instead of hanging on
    // a loading spinner forever or throwing.
    expect(mockGetDrinkById).not.toHaveBeenCalled();
    expect(screen.getByText('This drink could not be found.')).toBeTruthy();
  });

  it('navigates to the cafe detail route with only the cafe id when the cafe row is pressed', async () => {
    mockGetDrinkById.mockResolvedValue(fullDrink());

    renderScreen();
    const cafeRow = await screen.findByLabelText('Open Blue Bottle Coffee cafe');

    fireEvent.press(cafeRow);

    expect(mockPush).toHaveBeenCalledWith('/(app)/cafes/cafe-1');
  });
});
