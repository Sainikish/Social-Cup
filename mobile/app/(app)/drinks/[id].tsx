import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../../src/api/client';
import { ErrorState, LoadingIndicator } from '../../../src/components';
import { DrinkPhoto, DrinkPrice, useDrinkDetailQuery } from '../../../src/features/drinks';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../src/theme';

const PHOTO_SIZE = 220;

export default function DrinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const drinkQuery = useDrinkDetailQuery(id);

  if (drinkQuery.isLoading) {
    return <LoadingIndicator label="Loading drink..." />;
  }

  if (drinkQuery.isError || !drinkQuery.data) {
    return (
      <ErrorState
        message={drinkQuery.error ? toApiError(drinkQuery.error).message : 'This drink could not be found.'}
        onRetry={() => void drinkQuery.refetch()}
        retryLabel="Retry"
      />
    );
  }

  const drink = drinkQuery.data;
  // status IS part of the public DrinkResponse (not admin-only) - showing an
  // "unavailable" note when it isn't ACTIVE uses data the API already
  // returns, it doesn't invent a new business rule.
  const isUnavailable = drink.status !== 'ACTIVE';

  return (
    <>
      <Stack.Screen options={{ title: drink.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.photoWrapper}>
          <DrinkPhoto photoUrl={drink.photoUrl} size={PHOTO_SIZE} accessibilityLabel={drink.name} />
        </View>

        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{drink.name}</Text>
            {drink.signature ? (
              <View style={styles.signatureBadge}>
                <Text style={styles.signatureBadgeText}>★ Signature</Text>
              </View>
            ) : null}
          </View>
          {drink.type ? <Text style={styles.type}>{drink.type}</Text> : null}
          {isUnavailable ? <Text style={styles.unavailable}>Currently unavailable</Text> : null}

          <Pressable
            onPress={() => router.push(`/(app)/cafes/${drink.cafeId}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${drink.cafeName} cafe`}
          >
            <Text style={styles.cafeLink}>☕ {drink.cafeName}</Text>
          </Pressable>

          <DrinkPrice retailPrice={drink.retailPrice} creditPrice={drink.creditPrice} />
        </View>

        {drink.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{drink.description}</Text>
          </View>
        ) : null}

        {/* Reserved for Phase 7.5 (public ratings, the member's own rating,
            create/update, diary integration) - deliberately no rating data
            or endpoint calls here yet. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          <Text style={styles.placeholderText}>Ratings are coming soon.</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  photoWrapper: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  section: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  signatureBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  signatureBadgeText: {
    color: colors.onAccent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  type: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  unavailable: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  cafeLink: {
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.md * 1.4,
  },
  placeholderText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
