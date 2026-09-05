import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../../src/api/client';
import { ErrorState, LoadingIndicator } from '../../../src/components';
import {
  CafeDrinkList,
  CafeOpeningHours,
  CafePhotoGallery,
  useCafeDetailQuery,
  useCafeDrinksQuery,
} from '../../../src/features/cafes';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../src/theme';

function normalizeWebsiteUrl(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export default function CafeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cafeQuery = useCafeDetailQuery(id);
  const drinksQuery = useCafeDrinksQuery(id);

  if (cafeQuery.isLoading) {
    return <LoadingIndicator label="Loading cafe..." />;
  }

  if (cafeQuery.isError || !cafeQuery.data) {
    return (
      <ErrorState
        message={cafeQuery.error ? toApiError(cafeQuery.error).message : 'This cafe could not be found.'}
        onRetry={() => void cafeQuery.refetch()}
        retryLabel="Retry"
      />
    );
  }

  const cafe = cafeQuery.data;
  const location = [cafe.neighbourhood, cafe.address].filter(Boolean).join(' · ');
  const hasContactInfo = Boolean(cafe.phoneNumber || cafe.email || cafe.website);

  return (
    <>
      <Stack.Screen options={{ title: cafe.name }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <CafePhotoGallery photos={cafe.photos} />

        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{cafe.name}</Text>
            {cafe.featured ? (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            ) : null}
          </View>
          {location ? <Text style={styles.location}>{location}</Text> : null}
        </View>

        {cafe.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{cafe.description}</Text>
          </View>
        ) : null}

        {cafe.vibeTags ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vibe</Text>
            <Text style={styles.vibeTags}>{cafe.vibeTags}</Text>
          </View>
        ) : null}

        {cafe.openingHours.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Opening Hours</Text>
            <CafeOpeningHours openingHours={cafe.openingHours} />
          </View>
        ) : null}

        {hasContactInfo ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactActions}>
              {cafe.phoneNumber ? (
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${cafe.phoneNumber}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${cafe.name}`}
                >
                  <Text style={styles.contactText}>📞 {cafe.phoneNumber}</Text>
                </Pressable>
              ) : null}
              {cafe.email ? (
                <Pressable
                  onPress={() => void Linking.openURL(`mailto:${cafe.email}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Email ${cafe.name}`}
                >
                  <Text style={styles.contactText}>✉️ {cafe.email}</Text>
                </Pressable>
              ) : null}
              {cafe.website ? (
                <Pressable
                  onPress={() => void Linking.openURL(normalizeWebsiteUrl(cafe.website ?? ''))}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${cafe.name} website`}
                >
                  <Text style={styles.contactText} numberOfLines={1}>
                    🌐 {cafe.website}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Drinks</Text>
          {drinksQuery.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : drinksQuery.isError ? (
            <ErrorState
              message={drinksQuery.error ? toApiError(drinksQuery.error).message : 'Could not load drinks.'}
              onRetry={() => void drinksQuery.refetch()}
              retryLabel="Retry"
            />
          ) : (
            <CafeDrinkList
              drinks={drinksQuery.data?.content ?? []}
              onDrinkPress={(drinkId) => router.push(`/(app)/drinks/${drinkId}`)}
            />
          )}
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
  section: {
    padding: spacing.lg,
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
  featuredBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  featuredBadgeText: {
    color: colors.onAccent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  vibeTags: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  contactActions: {
    gap: spacing.sm,
  },
  contactText: {
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
