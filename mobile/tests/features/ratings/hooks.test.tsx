import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as ratingsApi from '../../../src/features/ratings/api';
import {
  useCreateRatingMutation,
  useDrinkRatingsQuery,
  useMyDiaryQuery,
  useMyRatingsQuery,
  useUpdateRatingMutation,
} from '../../../src/features/ratings/hooks';
import { ratingKeys } from '../../../src/features/ratings/queryKeys';
import type { DrinkRatingResponse, RatingResponse } from '../../../src/features/ratings/types';
import type { PageResponse } from '../../../src/types/api';

jest.mock('../../../src/features/ratings/api');

const mockGetDrinkRatings = ratingsApi.getDrinkRatings as jest.MockedFunction<
  typeof ratingsApi.getDrinkRatings
>;
const mockCreateRating = ratingsApi.createRating as jest.MockedFunction<typeof ratingsApi.createRating>;
const mockUpdateRating = ratingsApi.updateRating as jest.MockedFunction<typeof ratingsApi.updateRating>;
const mockGetMyRatings = ratingsApi.getMyRatings as jest.MockedFunction<typeof ratingsApi.getMyRatings>;
const mockGetMyDiary = ratingsApi.getMyDiary as jest.MockedFunction<typeof ratingsApi.getMyDiary>;

function drinkRating(id: string, authorId = 'member-1'): DrinkRatingResponse {
  return {
    id,
    drinkId: 'drink-1',
    rating: 4,
    note: 'Great cup',
    author: { id: authorId, firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function ownRating(id: string): RatingResponse {
  return {
    id,
    drinkId: 'drink-1',
    drinkName: 'Cortado',
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    rating: 5,
    note: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function page<T>(content: T[], overrides: Partial<PageResponse<T>> = {}): PageResponse<T> {
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

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ratingKeys', () => {
  it('keeps a public drink rating list and the identity-scoped my-ratings/diary keys distinct', () => {
    expect(ratingKeys.drinkListPage('drink-1', { page: 0, size: 20 })).toEqual([
      'ratings',
      'drink',
      'drink-1',
      { page: 0, size: 20 },
    ]);
    expect(ratingKeys.myRatings({ page: 0, size: 20 })).not.toEqual(ratingKeys.diary({ page: 0, size: 20 }));
    expect(ratingKeys.drinkList('drink-1')).not.toEqual(ratingKeys.myRatingsAll());
  });

  it('keeps two different drinks own rating lists distinct', () => {
    expect(ratingKeys.drinkList('drink-1')).not.toEqual(ratingKeys.drinkList('drink-2'));
  });
});

describe('useDrinkRatingsQuery', () => {
  it('fetches the first page of a drink public rating list', async () => {
    mockGetDrinkRatings.mockResolvedValue(page([drinkRating('r1')]));

    const { result } = renderHook(() => useDrinkRatingsQuery('drink-1'), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetDrinkRatings).toHaveBeenCalledWith('drink-1', { page: 0, size: 20 });
    expect(result.current.data?.pages[0].content).toHaveLength(1);
  });

  it('stops paginating once the last page is reached (last === true)', async () => {
    mockGetDrinkRatings
      .mockResolvedValueOnce(page([drinkRating('r1')], { last: false, totalPages: 2 }))
      .mockResolvedValueOnce(page([drinkRating('r2')], { page: 1, last: true, totalPages: 2 }));

    const { result } = renderHook(() => useDrinkRatingsQuery('drink-1'), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);
    expect(mockGetDrinkRatings).toHaveBeenCalledTimes(2);
  });

  it('does not fetch for an empty drink id', () => {
    const { result } = renderHook(() => useDrinkRatingsQuery(''), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetDrinkRatings).not.toHaveBeenCalled();
  });

  it('surfaces an error without requiring authentication (public endpoint)', async () => {
    mockGetDrinkRatings.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useDrinkRatingsQuery('drink-1'), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useMyRatingsQuery / useMyDiaryQuery', () => {
  it('does not fetch while disabled (e.g. unauthenticated)', () => {
    const { result } = renderHook(() => useMyRatingsQuery({ enabled: false }), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMyRatings).not.toHaveBeenCalled();
  });

  it('fetches my ratings when enabled', async () => {
    mockGetMyRatings.mockResolvedValue(page([ownRating('own-1')]));

    const { result } = renderHook(() => useMyRatingsQuery({ enabled: true }), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetMyRatings).toHaveBeenCalledWith({ page: 0, size: 20 });
  });

  it('fetches the diary from a distinct query key than my-ratings', async () => {
    mockGetMyDiary.mockResolvedValue(page([ownRating('own-1')]));

    const { result } = renderHook(() => useMyDiaryQuery({ enabled: true }), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetMyDiary).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(mockGetMyRatings).not.toHaveBeenCalled();
  });
});

describe('useCreateRatingMutation', () => {
  it('creates a rating and invalidates the drink list, my-ratings, and diary caches', async () => {
    mockCreateRating.mockResolvedValue(ownRating('new-1'));
    mockGetDrinkRatings.mockResolvedValue(page([drinkRating('r1')]));

    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    // Seed the public drink-ratings cache so we can prove it becomes stale.
    const { result: listResult } = renderHook(() => useDrinkRatingsQuery('drink-1'), {
      wrapper: makeWrapper(queryClient),
    });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result } = renderHook(() => useCreateRatingMutation('drink-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ rating: 5, note: 'Loved it' });
    });

    expect(mockCreateRating).toHaveBeenCalledWith('drink-1', { rating: 5, note: 'Loved it' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ratingKeys.drinkList('drink-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ratingKeys.myRatingsAll() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ratingKeys.diaryAll() });
  });

  it('never auto-retries a failed create (would risk a duplicate rating attempt)', async () => {
    mockCreateRating.mockRejectedValueOnce(new Error('conflict'));

    const { result } = renderHook(() => useCreateRatingMutation('drink-1'), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ rating: 4 })).rejects.toThrow();
    });

    expect(mockCreateRating).toHaveBeenCalledTimes(1);
  });
});

describe('useUpdateRatingMutation', () => {
  it('updates a rating and invalidates the same rating caches', async () => {
    mockUpdateRating.mockResolvedValue(ownRating('own-1'));

    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateRatingMutation('drink-1'), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ rating: 3, note: 'Changed my mind' });
    });

    expect(mockUpdateRating).toHaveBeenCalledWith('drink-1', { rating: 3, note: 'Changed my mind' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ratingKeys.drinkList('drink-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ratingKeys.myRatingsAll() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ratingKeys.diaryAll() });
  });
});
