import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getCafeById, getCafeDrinks, getCafes, getFeaturedCafes, searchCafes } from './api';
import { cafeKeys } from './queryKeys';
import type { CafeListParams, CafeSearchParams } from './types';

const DEFAULT_PAGE_SIZE = 20;
// A cafe's active drink menu is a small, bounded list in practice - fetched
// as a single page rather than paginated, so the detail screen never needs
// a second virtualized list nested inside its own scroll view.
const CAFE_DRINKS_PAGE_SIZE = 50;

// Stops requesting more pages when EITHER signal says so: `last` is the
// direct signal from PageResponse, `page >= totalPages - 1` is the
// belt-and-suspenders check for the same condition (see PageResponse
// contract in src/types/api.ts).
function hasMorePages(page: { last: boolean; page: number; totalPages: number }): boolean {
  return !page.last && page.page < page.totalPages - 1;
}

export function useCafesQuery(params: CafeListParams) {
  return useInfiniteQuery({
    queryKey: cafeKeys.list(params),
    queryFn: ({ pageParam }) => getCafes({ ...params, page: pageParam, size: DEFAULT_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (hasMorePages(lastPage) ? lastPage.page + 1 : undefined),
  });
}

export function useCafeSearchQuery(params: CafeSearchParams, options: { enabled: boolean }) {
  return useInfiniteQuery({
    queryKey: cafeKeys.search(params),
    queryFn: ({ pageParam }) => searchCafes({ ...params, page: pageParam, size: DEFAULT_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (hasMorePages(lastPage) ? lastPage.page + 1 : undefined),
    enabled: options.enabled,
  });
}

// A small, single-page fetch for the home screen's featured section - not
// infinite, since that section is a curated preview, not a full list (see
// app/(app)/home.tsx).
export function useFeaturedCafesQuery() {
  return useQuery({
    queryKey: cafeKeys.featured(),
    queryFn: () => getFeaturedCafes({ page: 0, size: DEFAULT_PAGE_SIZE }),
  });
}

export function useCafeDetailQuery(id: string) {
  return useQuery({
    queryKey: cafeKeys.detail(id),
    queryFn: () => getCafeById(id),
    enabled: Boolean(id),
  });
}

export function useCafeDrinksQuery(id: string) {
  return useQuery({
    queryKey: cafeKeys.drinks(id),
    queryFn: () => getCafeDrinks(id, { page: 0, size: CAFE_DRINKS_PAGE_SIZE }),
    enabled: Boolean(id),
  });
}
