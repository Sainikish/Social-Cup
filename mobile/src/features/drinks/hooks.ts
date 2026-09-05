import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getDrinkById, getSignatureDrinks } from './api';
import { drinkKeys } from './queryKeys';

const DEFAULT_PAGE_SIZE = 20;

// Same stop condition as src/features/cafes/hooks.ts's hasMorePages - kept
// as a local copy rather than a shared utility, since duplicating one small
// pure function is cheaper than introducing a cross-feature dependency for it.
function hasMorePages(page: { last: boolean; page: number; totalPages: number }): boolean {
  return !page.last && page.page < page.totalPages - 1;
}

// GET /drinks/signature IS paginated (PageResponse<DrinkResponse>, driven by
// Pageable) - useInfiniteQuery is the correct fit here, the same as cafes'
// list/search queries, not an arbitrary choice.
export function useSignatureDrinksQuery() {
  return useInfiniteQuery({
    queryKey: drinkKeys.signature(),
    queryFn: ({ pageParam }) => getSignatureDrinks({ page: pageParam, size: DEFAULT_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (hasMorePages(lastPage) ? lastPage.page + 1 : undefined),
  });
}

export function useDrinkDetailQuery(id: string) {
  return useQuery({
    queryKey: drinkKeys.detail(id),
    queryFn: () => getDrinkById(id),
    enabled: Boolean(id),
  });
}
