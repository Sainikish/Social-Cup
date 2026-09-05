import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { createRating, getDrinkRatings, getMyDiary, getMyRatings, updateRating } from './api';
import { ratingKeys } from './queryKeys';
import type { CreateRatingRequest, UpdateRatingRequest } from './types';

const DEFAULT_PAGE_SIZE = 20;

// Stops requesting more pages when EITHER signal says so: `last` is the
// direct signal from PageResponse, `page >= totalPages - 1` is the
// belt-and-suspenders check for the same condition (see PageResponse
// contract in src/types/api.ts). Mirrors src/features/cafes/hooks.ts's
// hasMorePages, duplicated per-feature by deliberate choice rather than
// shared, matching the existing convention.
function hasMorePages(page: { last: boolean; page: number; totalPages: number }): boolean {
  return !page.last && page.page < page.totalPages - 1;
}

// Public list - works unauthenticated (GET /drinks/{drinkId}/ratings has no
// auth requirement on the backend).
export function useDrinkRatingsQuery(drinkId: string) {
  return useInfiniteQuery({
    queryKey: ratingKeys.drinkListPage(drinkId, { page: 0, size: DEFAULT_PAGE_SIZE }),
    queryFn: ({ pageParam }) => getDrinkRatings(drinkId, { page: pageParam, size: DEFAULT_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (hasMorePages(lastPage) ? lastPage.page + 1 : undefined),
    enabled: Boolean(drinkId),
  });
}

// The authenticated member's own ratings across every drink - used by the
// diary/my-ratings screen. Disabled while there's no authenticated user,
// since GET /users/me/ratings requires auth on the backend.
export function useMyRatingsQuery(options: { enabled: boolean }) {
  return useInfiniteQuery({
    queryKey: ratingKeys.myRatings({ page: 0, size: DEFAULT_PAGE_SIZE }),
    queryFn: ({ pageParam }) => getMyRatings({ page: pageParam, size: DEFAULT_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (hasMorePages(lastPage) ? lastPage.page + 1 : undefined),
    enabled: options.enabled,
  });
}

// Same underlying backend data as useMyRatingsQuery (GET /users/me/diary is
// the same DrinkRating rows as /users/me/ratings, presented chronologically
// - see UserRatingController.java) but kept as its own query key/hook so the
// diary screen's cache never collides with a future "my ratings" surface
// that might paginate or filter differently.
export function useMyDiaryQuery(options: { enabled: boolean }) {
  return useInfiniteQuery({
    queryKey: ratingKeys.diary({ page: 0, size: DEFAULT_PAGE_SIZE }),
    queryFn: ({ pageParam }) => getMyDiary({ page: pageParam, size: DEFAULT_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (hasMorePages(lastPage) ? lastPage.page + 1 : undefined),
    enabled: options.enabled,
  });
}

// Invalidates every cache the member could now see stale data in after a
// successful create/update: the public list for this drink, and both views
// of "my ratings" (my-ratings + diary). Scoped to ratingKeys, never a
// QueryClient-wide invalidation.
function useInvalidateRatingCaches() {
  const queryClient = useQueryClient();
  return (drinkId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ratingKeys.drinkList(drinkId) }),
      queryClient.invalidateQueries({ queryKey: ratingKeys.myRatingsAll() }),
      queryClient.invalidateQueries({ queryKey: ratingKeys.diaryAll() }),
    ]);
}

export function useCreateRatingMutation(drinkId: string) {
  const invalidate = useInvalidateRatingCaches();
  return useMutation({
    mutationFn: (request: CreateRatingRequest) => createRating(drinkId, request),
    onSuccess: () => invalidate(drinkId),
  });
}

export function useUpdateRatingMutation(drinkId: string) {
  const invalidate = useInvalidateRatingCaches();
  return useMutation({
    mutationFn: (request: UpdateRatingRequest) => updateRating(drinkId, request),
    onSuccess: () => invalidate(drinkId),
  });
}
