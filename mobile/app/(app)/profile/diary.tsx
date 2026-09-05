import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../../src/api/client';
import { Card, EmptyState, ErrorState, LoadingIndicator } from '../../../src/components';
import { useAuth } from '../../../src/features/auth';
import {
  formatRatingDate,
  RatingStars,
  ratingsListErrorMessage,
  useMyDiaryQuery,
  type RatingResponse,
} from '../../../src/features/ratings';
import { colors, fontSize, fontWeight, spacing } from '../../../src/theme';

// A dedicated, non-nested screen (unlike the ratings section on drink
// detail, which deliberately avoids a FlatList since it lives inside that
// screen's own ScrollView) - a real FlatList with onEndReached pagination is
// safe and appropriate here, mirroring app/(app)/drinks/index.tsx exactly.
export default function DiaryScreen() {
  const router = useRouter();
  const { status } = useAuth();
  const diaryQuery = useMyDiaryQuery({ enabled: status === 'authenticated' });

  const entries = useMemo(
    () => diaryQuery.data?.pages.flatMap((page) => page.content) ?? [],
    [diaryQuery.data]
  );

  const errorMessage = diaryQuery.error
    ? ratingsListErrorMessage(toApiError(diaryQuery.error).code)
    : undefined;

  if (diaryQuery.isLoading) {
    return <LoadingIndicator label="Loading your diary..." />;
  }

  if (diaryQuery.isError) {
    return (
      <ErrorState
        message={errorMessage ?? 'Something went wrong.'}
        onRetry={() => void diaryQuery.refetch()}
        retryLabel="Retry"
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState title="No ratings yet" description="Rate a drink you've tried and it will show up here." />
    );
  }

  return (
    <FlatList
      testID="diary-list"
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <DiaryRow entry={item} onPress={() => router.push(`/(app)/drinks/${item.drinkId}`)} />
      )}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={diaryQuery.isRefetching && !diaryQuery.isFetchingNextPage}
          onRefresh={() => void diaryQuery.refetch()}
          tintColor={colors.primary}
        />
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (diaryQuery.hasNextPage && !diaryQuery.isFetchingNextPage) {
          void diaryQuery.fetchNextPage();
        }
      }}
      ListFooterComponent={
        diaryQuery.isFetchingNextPage ? (
          <View style={styles.footer} accessibilityLabel="Load more diary entries">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
    />
  );
}

function DiaryRow({ entry, onPress }: { entry: RatingResponse; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${entry.drinkName} details`}
    >
      <Card style={styles.card}>
        <Text style={styles.drinkName}>{entry.drinkName}</Text>
        <Text style={styles.cafeName}>{entry.cafeName}</Text>
        <RatingStars value={entry.rating} size="sm" />
        {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}
        <Text style={styles.date}>{formatRatingDate(entry.createdAt)}</Text>
      </Card>
    </Pressable>
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
  card: {
    gap: spacing.xs,
  },
  drinkName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  cafeName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  note: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
