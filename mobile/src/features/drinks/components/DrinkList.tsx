import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingIndicator } from '../../../components';
import { colors, spacing } from '../../../theme';
import type { DrinkResponse } from '../types';
import { DrinkCard } from './DrinkCard';

export interface DrinkListProps {
  drinks: DrinkResponse[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onEndReached: () => void;
  onDrinkPress: (drinkId: string) => void;
  emptyTitle: string;
  emptyDescription?: string;
}

// Mirrors src/features/cafes/components/CafeList.tsx's loading/empty/error/
// pagination/refresh structure exactly, minus search/filter concerns - there
// is nothing to search or filter here (see DrinkFilters absence: GET
// /drinks/signature has no such parameters on the backend).
export function DrinkList({
  drinks,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isRefreshing,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  onEndReached,
  onDrinkPress,
  emptyTitle,
  emptyDescription,
}: DrinkListProps) {
  if (isLoading) {
    return <LoadingIndicator label="Loading drinks..." />;
  }

  if (isError) {
    return (
      <ErrorState message={errorMessage ?? 'Something went wrong.'} onRetry={onRetry} retryLabel="Retry" />
    );
  }

  if (drinks.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <FlatList
      testID="drink-list"
      data={drinks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <DrinkCard drink={item} onPress={onDrinkPress} />}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          onEndReached();
        }
      }}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer} accessibilityLabel="Load more drinks">
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
});
