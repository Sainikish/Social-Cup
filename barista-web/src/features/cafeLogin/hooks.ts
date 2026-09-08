import { useQuery } from '@tanstack/react-query';

import { searchCafes } from './api';
import { cafeLoginKeys } from './queryKeys';

const SEARCH_PAGE_SIZE = 20;

// A single bounded page is enough for a login-time picker (the barista is
// looking for one specific, already-known cafe by name) - unlike the
// member app's own cafe search, this deliberately isn't an infinite list.
export function useCafeSearchQuery(query: string) {
  const trimmedQuery = query.trim();
  return useQuery({
    queryKey: cafeLoginKeys.search(trimmedQuery),
    queryFn: () => searchCafes({ q: trimmedQuery, page: 0, size: SEARCH_PAGE_SIZE }),
    enabled: trimmedQuery.length > 0,
  });
}
