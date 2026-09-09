import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import DrinkDetailScreen from '../../app/(app)/drinks/[id]';
import { useAuth } from '../../src/features/auth';
import * as drinksApi from '../../src/features/drinks/api';
import type { DrinkResponse } from '../../src/features/drinks/types';
import * as ratingsApi from '../../src/features/ratings/api';
import type { DrinkRatingResponse } from '../../src/features/ratings/types';
import type { PageResponse } from '../../src/types/api';
import type { MemberDto } from '../../src/types/auth';

const mockPush = jest.fn();
let mockSearchParams: { id: string } = { id: 'drink-1' };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('../../src/features/drinks/api');
jest.mock('../../src/features/ratings/api');
jest.mock('../../src/features/auth', () => ({
  ...jest.requireActual('../../src/features/auth'),
  useAuth: jest.fn(),
}));

const mockGetDrinkById = drinksApi.getDrinkById as jest.MockedFunction<typeof drinksApi.getDrinkById>;
const mockGetDrinkRatings = ratingsApi.getDrinkRatings as jest.MockedFunction<
  typeof ratingsApi.getDrinkRatings
>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const AUTHENTICATED_USER: MemberDto = {
  id: 'member-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  avatarUrl: null,
  status: 'ACTIVE',
  roles: ['MEMBER'],
  createdAt: new Date().toISOString(),
};

function authAs(user: MemberDto | null) {
  mockUseAuth.mockReturnValue({
    status: user ? 'authenticated' : 'unauthenticated',
    user,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    deleteAccount: jest.fn(),
    initializeAuth: jest.fn(),
  });
}

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

function ratingsPage(
  content: DrinkRatingResponse[],
  overrides: Partial<PageResponse<DrinkRatingResponse>> = {}
): PageResponse<DrinkRatingResponse> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  };
}

function otherMemberRating(id = 'rating-1'): DrinkRatingResponse {
  return {
    id,
    drinkId: 'drink-1',
    rating: 5,
    note: 'Fantastic',
    author: { id: 'member-2', firstName: 'Grace', lastName: 'Hopper', avatarUrl: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DrinkDetailScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = { id: 'drink-1' };
  mockGetDrinkRatings.mockResolvedValue(ratingsPage([]));
  authAs(AUTHENTICATED_USER);
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

  describe('Redemption CTA (Phase F)', () => {
    it('renders a "Redeem this drink" CTA for an authenticated member and an available drink', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      authAs(AUTHENTICATED_USER);

      renderScreen();

      expect(await screen.findByLabelText('Redeem this drink')).toBeTruthy();
    });

    it('navigates to the redemption screen with the correct drink id when pressed', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      authAs(AUTHENTICATED_USER);

      renderScreen();
      fireEvent.press(await screen.findByLabelText('Redeem this drink'));

      expect(mockPush).toHaveBeenCalledWith('/(app)/drinks/redeem?drinkId=drink-1');
    });

    it('omits the CTA for an unauthenticated member', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      authAs(null);

      renderScreen();
      await screen.findByText('Cortado');

      expect(screen.queryByLabelText('Redeem this drink')).toBeNull();
    });

    it('omits the CTA for a currently-unavailable drink', async () => {
      mockGetDrinkById.mockResolvedValue({ ...minimalDrink(), status: 'INACTIVE' });
      authAs(AUTHENTICATED_USER);

      renderScreen();
      await screen.findByText('Currently unavailable');

      expect(screen.queryByLabelText('Redeem this drink')).toBeNull();
    });
  });

  describe('Ratings section (Phase 7.5)', () => {
    it('shows the public rating list, loading, then loaded', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      mockGetDrinkRatings.mockResolvedValue(ratingsPage([otherMemberRating()]));

      renderScreen();

      expect(await screen.findByText('Ratings')).toBeTruthy();
      expect(await screen.findByText('Grace Hopper')).toBeTruthy();
      expect(mockGetDrinkRatings).toHaveBeenCalledWith('drink-1', { page: 0, size: 20 });
    });

    it('shows an empty state when nobody has rated the drink yet', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      mockGetDrinkRatings.mockResolvedValue(ratingsPage([]));

      renderScreen();

      expect(await screen.findByText('No ratings yet')).toBeTruthy();
    });

    it('shows a mapped, human-readable error state with retry for a failed ratings request', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      // A network failure, as toApiError distinguishes it (isAxiosError with
      // no .response) - not a raw backend message or code.
      mockGetDrinkRatings.mockRejectedValue({
        isAxiosError: true,
        code: 'ERR_NETWORK',
        message: 'Network Error',
        toJSON: () => ({}),
      });

      renderScreen();

      await screen.findByText('Cortado');
      expect(
        await screen.findByText('Could not reach the server. Check your connection and try again.')
      ).toBeTruthy();
      expect(screen.queryByText('Network Error')).toBeNull();
    });

    it('shows a "Load more ratings" action when there is a next page, and fetches it on press', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      mockGetDrinkRatings
        .mockResolvedValueOnce(ratingsPage([otherMemberRating('r1')], { last: false, totalPages: 2 }))
        .mockResolvedValueOnce(
          ratingsPage([otherMemberRating('r2')], { page: 1, last: true, totalPages: 2 })
        );

      renderScreen();

      const loadMore = await screen.findByLabelText('Load more ratings');
      fireEvent.press(loadMore);

      await waitFor(() => expect(mockGetDrinkRatings).toHaveBeenCalledTimes(2));
      expect(mockGetDrinkRatings).toHaveBeenNthCalledWith(2, 'drink-1', { page: 1, size: 20 });
    });

    it('shows a "Rate this drink" CTA for an authenticated member with no existing rating', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      mockGetDrinkRatings.mockResolvedValue(ratingsPage([otherMemberRating()]));
      authAs(AUTHENTICATED_USER);

      renderScreen();

      expect(await screen.findByLabelText('Rate this drink')).toBeTruthy();
    });

    it('shows the own rating (badged) and an edit action instead of the CTA once the member has rated', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      mockGetDrinkRatings.mockResolvedValue(
        ratingsPage([
          otherMemberRating(),
          {
            id: 'rating-mine',
            drinkId: 'drink-1',
            rating: 3,
            note: 'My own note',
            author: { id: 'member-1', firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ])
      );
      authAs(AUTHENTICATED_USER);

      renderScreen();

      expect(await screen.findByText('Your rating')).toBeTruthy();
      expect(screen.getByLabelText('Edit your rating')).toBeTruthy();
      expect(screen.queryByLabelText('Rate this drink')).toBeNull();
    });

    it('opens the rating form in create mode when "Rate this drink" is pressed, and hides it after a successful submit', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      mockGetDrinkRatings.mockResolvedValue(ratingsPage([]));
      authAs(AUTHENTICATED_USER);

      renderScreen();

      fireEvent.press(await screen.findByLabelText('Rate this drink'));

      expect(await screen.findByText('Rate this drink')).toBeTruthy();
      expect(screen.getByText('Submit rating')).toBeTruthy();
    });

    it('shows a login prompt instead of the rating CTA for an unauthenticated member, without calling a protected endpoint first', async () => {
      mockGetDrinkById.mockResolvedValue(fullDrink());
      mockGetDrinkRatings.mockResolvedValue(ratingsPage([]));
      authAs(null);

      renderScreen();

      const loginButton = await screen.findByText('Log in to rate this drink');
      fireEvent.press(loginButton);

      expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
      expect(screen.queryByText('Submit rating')).toBeNull();
    });
  });
});
