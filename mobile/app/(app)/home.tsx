import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../src/api/client';
import { Button, EmptyState, ErrorState, LoadingIndicator } from '../../src/components';
import { CafeCard, useFeaturedCafesQuery } from '../../src/features/cafes';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme';
import { genericErrorMessage } from '../../src/utils/apiErrors';

const FEATURED_CARD_WIDTH = 260;

export default function HomeScreen() {
  const router = useRouter();
  const featuredQuery = useFeaturedCafesQuery();
  const featuredCafes = featuredQuery.data?.content ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Discover Social Cup</Text>
        <Text style={styles.subheading}>Find your next favorite coffee spot.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Cafes</Text>

        {featuredQuery.isLoading ? (
          <LoadingIndicator label="Loading featured cafes..." />
        ) : featuredQuery.isError ? (
          <ErrorState
            message={
              featuredQuery.error
                ? genericErrorMessage(toApiError(featuredQuery.error))
                : 'Could not load featured cafes.'
            }
            onRetry={() => void featuredQuery.refetch()}
            retryLabel="Retry"
          />
        ) : featuredCafes.length === 0 ? (
          <EmptyState
            title="No featured cafes yet"
            description="Check back soon for hand-picked recommendations."
          />
        ) : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={featuredCafes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.featuredList}
            ItemSeparatorComponent={() => <View style={styles.featuredSeparator} />}
            renderItem={({ item }) => (
              <View style={styles.featuredCard}>
                <CafeCard cafe={item} onPress={(cafeId) => router.push(`/(app)/cafes/${cafeId}`)} />
              </View>
            )}
          />
        )}
      </View>

      <Button
        label="View All Cafes"
        onPress={() => router.push('/(app)/cafes')}
        accessibilityLabel="View all cafes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subheading: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  section: {
    flex: 1,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  featuredList: {
    paddingVertical: spacing.xs,
  },
  featuredSeparator: {
    width: spacing.md,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
  },
});
