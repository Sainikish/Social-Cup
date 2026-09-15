import { useRouter } from 'expo-router';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../src/api/client';
import { Button, EmptyState, ErrorState, LoadingIndicator } from '../../src/components';
import { CafeCard, useFeaturedCafesQuery } from '../../src/features/cafes';
import { DrinkCard, useSignatureDrinksQuery } from '../../src/features/drinks';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme';
import { genericErrorMessage } from '../../src/utils/apiErrors';

const FEATURED_CARD_WIDTH = 260;
const SIGNATURE_CARD_WIDTH = 260;

export default function HomeScreen() {
  const router = useRouter();
  const featuredQuery = useFeaturedCafesQuery();
  const featuredCafes = featuredQuery.data?.content ?? [];

  // GET /drinks/signature is paginated (see useSignatureDrinksQuery), but
  // this strip is a curated preview like Featured Cafes above, not a full
  // browse list - only the first loaded page is shown, with no
  // fetchNextPage wiring, exactly the same choice useFeaturedCafesQuery
  // already makes for cafes.
  const signatureQuery = useSignatureDrinksQuery();
  const signatureDrinks = signatureQuery.data?.pages[0]?.content ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            contentContainerStyle={styles.stripList}
            ItemSeparatorComponent={() => <View style={styles.stripSeparator} />}
            renderItem={({ item }) => (
              <View style={styles.featuredCard}>
                <CafeCard cafe={item} onPress={(cafeId) => router.push(`/(app)/cafes/${cafeId}`)} />
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Signature Drinks</Text>

        {signatureQuery.isLoading ? (
          <LoadingIndicator label="Loading signature drinks..." />
        ) : signatureQuery.isError ? (
          <ErrorState
            message={
              signatureQuery.error
                ? genericErrorMessage(toApiError(signatureQuery.error))
                : 'Could not load signature drinks.'
            }
            onRetry={() => void signatureQuery.refetch()}
            retryLabel="Retry"
          />
        ) : signatureDrinks.length === 0 ? (
          <EmptyState
            title="No signature drinks yet"
            description="Check back soon for cafe favorites."
          />
        ) : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={signatureDrinks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.stripList}
            ItemSeparatorComponent={() => <View style={styles.stripSeparator} />}
            renderItem={({ item }) => (
              <View style={styles.signatureCard}>
                <DrinkCard drink={item} onPress={(drinkId) => router.push(`/(app)/drinks/${drinkId}`)} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
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
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  stripList: {
    paddingVertical: spacing.xs,
  },
  stripSeparator: {
    width: spacing.md,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
  },
  signatureCard: {
    width: SIGNATURE_CARD_WIDTH,
  },
});
