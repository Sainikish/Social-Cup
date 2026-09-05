import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import DiaryScreen from '../../app/(app)/profile/diary';
import { useAuth } from '../../src/features/auth';
import * as ratingsApi from '../../src/features/ratings/api';
import { formatRatingDate } from '../../src/features/ratings/components/RatingCard';
import type { RatingResponse } from '../../src/features/ratings/types';
import type { PageResponse } from '../../src/types/api';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../src/features/ratings/api');
jest.mock('../../src/features/auth', () => ({
  ...jest.requireActual('../../src/features/auth'),
  useAuth: jest.fn(),
}));

const mockGetMyDiary = ratingsApi.getMyDiary as jest.MockedFunction<typeof ratingsApi.getMyDiary>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function diaryEntry(overrides: Partial<RatingResponse> = {}): RatingResponse {
  return {
    id: 'rating-1',
    drinkId: 'drink-1',
    drinkName: 'Cortado',
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    rating: 4,
    note: 'Great start to the morning',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-10T08:00:00.000Z',
    ...overrides,
  };
}

function page(
  content: RatingResponse[],
  overrides: Partial<PageResponse<RatingResponse>> = {}
): PageResponse<RatingResponse> {
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

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DiaryScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    user: {
      id: 'member-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      avatarUrl: null,
      status: 'ACTIVE',
      roles: ['MEMBER'],
      createdAt: new Date().toISOString(),
    },
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    initializeAuth: jest.fn(),
  });
});

describe('DiaryScreen', () => {
  it('shows a loading state before the diary resolves', () => {
    mockGetMyDiary.mockReturnValue(new Promise(() => {}));

    renderScreen();

    expect(screen.getByText('Loading your diary...')).toBeTruthy();
  });

  it('renders drink name, cafe name, rating, note, and date for each entry', async () => {
    mockGetMyDiary.mockResolvedValue(page([diaryEntry()]));

    renderScreen();

    expect(await screen.findByText('Cortado')).toBeTruthy();
    expect(screen.getByText('Blue Bottle Coffee')).toBeTruthy();
    expect(screen.getByLabelText('Rated 4 out of 5 stars')).toBeTruthy();
    expect(screen.getByText('Great start to the morning')).toBeTruthy();
    expect(screen.getByText(formatRatingDate('2026-01-10T08:00:00.000Z'))).toBeTruthy();
  });

  it('shows an empty state when the member has not rated anything yet', async () => {
    mockGetMyDiary.mockResolvedValue(page([]));

    renderScreen();

    expect(await screen.findByText('No ratings yet')).toBeTruthy();
  });

  it('shows an error state with retry when the request fails', async () => {
    mockGetMyDiary.mockRejectedValue(new Error('network down'));

    renderScreen();

    expect(await screen.findByText('Retry')).toBeTruthy();
  });

  it('paginates via onEndReached and stops once the last page is reached', async () => {
    mockGetMyDiary
      .mockResolvedValueOnce(page([diaryEntry({ id: 'r1' })], { last: false, totalPages: 2 }))
      .mockResolvedValueOnce(
        page([diaryEntry({ id: 'r2', drinkName: 'Cold Brew' })], { page: 1, last: true, totalPages: 2 })
      );

    renderScreen();

    await screen.findByText('Cortado');
    fireEvent(screen.getByTestId('diary-list'), 'onEndReached');

    await waitFor(() => expect(screen.getByText('Cold Brew')).toBeTruthy());
    expect(mockGetMyDiary).toHaveBeenCalledTimes(2);
  });

  it('navigates to drink detail using only the drink id when an entry is pressed', async () => {
    mockGetMyDiary.mockResolvedValue(page([diaryEntry({ drinkId: 'drink-42' })]));

    renderScreen();
    const row = await screen.findByLabelText('Open Cortado details');

    fireEvent.press(row);

    expect(mockPush).toHaveBeenCalledWith('/(app)/drinks/drink-42');
  });

  it('does not fetch the diary while unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      user: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      initializeAuth: jest.fn(),
    });

    renderScreen();

    expect(mockGetMyDiary).not.toHaveBeenCalled();
  });
});
