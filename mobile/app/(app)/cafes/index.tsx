import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { toApiError } from '../../../src/api/client';
import {
  CafeFilters,
  CafeList,
  CafeSearchBar,
  useCafeSearchQuery,
  useCafesQuery,
} from '../../../src/features/cafes';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { colors, spacing } from '../../../src/theme';

const SEARCH_DEBOUNCE_MS = 400;

export default function CafesScreen() {
  const router = useRouter();

  const [searchText, setSearchText] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [featured, setFeatured] = useState(false);

  const debouncedSearchText = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const debouncedNeighbourhood = useDebouncedValue(neighbourhood.trim(), SEARCH_DEBOUNCE_MS);
  const isSearching = debouncedSearchText.length > 0;

  // Search text present -> GET /cafes/search (q + neighbourhood; that
  // endpoint has no "featured" parameter - see backend CafeController).
  // Otherwise -> GET /cafes (neighbourhood + featured). Two different query
  // keys, never sharing a cache entry, so switching between them never shows
  // stale results from the other mode.
  const listQuery = useCafesQuery({
    neighbourhood: debouncedNeighbourhood || undefined,
    featured: featured || undefined,
  });
  const searchQuery = useCafeSearchQuery(
    { q: debouncedSearchText, neighbourhood: debouncedNeighbourhood || undefined },
    { enabled: isSearching }
  );

  const activeQuery = isSearching ? searchQuery : listQuery;

  const cafes = useMemo(
    () => activeQuery.data?.pages.flatMap((page) => page.content) ?? [],
    [activeQuery.data]
  );

  const hasActiveFilters = neighbourhood.trim().length > 0 || featured;

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <CafeSearchBar value={searchText} onChangeText={setSearchText} />
        <CafeFilters
          neighbourhood={neighbourhood}
          onNeighbourhoodChange={setNeighbourhood}
          featured={featured}
          onFeaturedChange={setFeatured}
          showFeaturedToggle={!isSearching}
          onClear={() => {
            setNeighbourhood('');
            setFeatured(false);
          }}
          hasActiveFilters={hasActiveFilters}
        />
      </View>

      <CafeList
        cafes={cafes}
        isLoading={activeQuery.isLoading}
        isError={activeQuery.isError}
        errorMessage={activeQuery.error ? toApiError(activeQuery.error).message : undefined}
        onRetry={() => void activeQuery.refetch()}
        isRefreshing={activeQuery.isRefetching && !activeQuery.isFetchingNextPage}
        onRefresh={() => void activeQuery.refetch()}
        hasNextPage={Boolean(activeQuery.hasNextPage)}
        isFetchingNextPage={activeQuery.isFetchingNextPage}
        onEndReached={() => void activeQuery.fetchNextPage()}
        onCafePress={(cafeId) => router.push(`/(app)/cafes/${cafeId}`)}
        emptyTitle={isSearching ? 'No cafes found' : 'No cafes available'}
        emptyDescription={
          isSearching
            ? 'Try a different search term or clear your filters.'
            : hasActiveFilters
              ? 'Try adjusting your filters.'
              : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  controls: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
