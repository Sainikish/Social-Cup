import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingIndicator } from '../../../components';
import { colors, spacing } from '../../../theme';
import type { CafeSummaryResponse } from '../types';
import { CafeCard } from './CafeCard';

export interface CafeListProps {
  cafes: CafeSummaryResponse[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onEndReached: () => void;
  onCafePress: (cafeId: string) => void;
  emptyTitle: string;
  emptyDescription?: string;
  ListHeaderComponent?: React.ReactElement;
}

export function CafeList({
  cafes,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isRefreshing,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  onEndReached,
  onCafePress,
  emptyTitle,
  emptyDescription,
  ListHeaderComponent,
}: CafeListProps) {
  // Initial load only - pagination loading is handled separately below by
  // the footer indicator, so page 2+ never replaces the visible list with a
  // full-screen spinner.
  if (isLoading) {
    return <LoadingIndicator label="Loading cafes..." />;
  }

  if (isError) {
    return (
      <ErrorState message={errorMessage ?? 'Something went wrong.'} onRetry={onRetry} retryLabel="Retry" />
    );
  }

  if (cafes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {ListHeaderComponent}
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </View>
    );
  }

  return (
    <FlatList
      testID="cafe-list"
      data={cafes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CafeCard cafe={item} onPress={onCafePress} />}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        // Never start a second next-page request while one is already
        // in flight, and never request past the last page.
        if (hasNextPage && !isFetchingNextPage) {
          onEndReached();
        }
      }}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer} accessibilityLabel="Load more cafes">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
  },
  separator: {
    height: spacing.md,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
  },
});
