import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, EmptyState, ErrorState, LoadingIndicator } from '../../../components';
import { colors, spacing } from '../../../theme';
import type { DrinkRatingResponse } from '../types';
import { RatingCard } from './RatingCard';

export interface RatingListProps {
  ratings: DrinkRatingResponse[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  /** The authenticated member's id, if any - used to badge their own rating. */
  currentUserId?: string;
  emptyTitle: string;
  emptyDescription?: string;
}

// Rendered inline (not a FlatList) - this is already composed inside the
// drink detail screen's own ScrollView, so a second virtualized list here
// would be the exact nested-virtualization anti-pattern CafeDrinkList
// avoids (see src/features/cafes/components/CafeDrinkList.tsx). Pagination
// is therefore a manual "Load more ratings" action rather than
// onEndReached, which only a real FlatList can fire safely.
export function RatingList({
  ratings,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  currentUserId,
  emptyTitle,
  emptyDescription,
}: RatingListProps) {
  if (isLoading) {
    return <LoadingIndicator label="Loading ratings..." />;
  }

  if (isError) {
    return (
      <ErrorState message={errorMessage ?? 'Something went wrong.'} onRetry={onRetry} retryLabel="Retry" />
    );
  }

  if (ratings.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <View style={styles.container}>
      {ratings.map((rating) => (
        <RatingCard
          key={rating.id}
          rating={rating}
          isOwnRating={Boolean(currentUserId) && rating.author?.id === currentUserId}
        />
      ))}
      {isFetchingNextPage ? (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : hasNextPage ? (
        <Button
          label="Load more ratings"
          accessibilityLabel="Load more ratings"
          variant="outline"
          onPress={onLoadMore}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
