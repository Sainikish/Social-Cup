import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../../src/api/client';
import { Button, ErrorState, LoadingIndicator } from '../../../src/components';
import { useAuth } from '../../../src/features/auth';
import { DrinkPhoto, DrinkPrice, useDrinkDetailQuery } from '../../../src/features/drinks';
import {
  RatingForm,
  RatingList,
  ratingsListErrorMessage,
  useDrinkRatingsQuery,
} from '../../../src/features/ratings';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../src/theme';
import { genericErrorMessage } from '../../../src/utils/apiErrors';

const PHOTO_SIZE = 220;

export default function DrinkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const drinkQuery = useDrinkDetailQuery(id);
  const ratingsQuery = useDrinkRatingsQuery(id);
  const [showRatingForm, setShowRatingForm] = useState(false);

  if (drinkQuery.isLoading) {
    return <LoadingIndicator label="Loading drink..." />;
  }

  if (drinkQuery.isError || !drinkQuery.data) {
    return (
      <ErrorState
        message={
          drinkQuery.error
            ? genericErrorMessage(toApiError(drinkQuery.error))
            : 'This drink could not be found.'
        }
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

  // The backend has no "my rating for drink X" endpoint - the currently-
  // loaded pages of the public list (already being fetched for display
  // below) are scanned for an entry authored by the current user instead of
  // inventing one. If the member's own rating happens to sit on a
  // not-yet-loaded page, RatingForm's 409 handling ("You already rated this
  // drink...") is the authoritative fallback that catches it.
  const ratings = ratingsQuery.data?.pages.flatMap((page) => page.content) ?? [];
  const ownRating = user ? ratings.find((rating) => rating.author?.id === user.id) : undefined;
  const ratingsErrorMessage = ratingsQuery.error
    ? ratingsListErrorMessage(toApiError(ratingsQuery.error).code)
    : undefined;

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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings</Text>

          {/* The member's own rating (if any) already appears - badged "Your
              rating" - inside the public list below, since the backend's
              public endpoint returns every rating including the caller's
              own. Rendering it a second time here would duplicate it, so
              this CTA only ever offers the one action that applies. */}
          {user ? (
            showRatingForm ? (
              <RatingForm
                drinkId={id}
                mode={ownRating ? 'edit' : 'create'}
                initialValue={ownRating ? { rating: ownRating.rating, note: ownRating.note } : undefined}
                onSuccess={() => setShowRatingForm(false)}
              />
            ) : (
              <Button
                label={ownRating ? 'Edit your rating' : 'Rate this drink'}
                accessibilityLabel={ownRating ? 'Edit your rating' : 'Rate this drink'}
                variant={ownRating ? 'outline' : 'primary'}
                onPress={() => setShowRatingForm(true)}
              />
            )
          ) : (
            <Button
              label="Log in to rate this drink"
              variant="outline"
              onPress={() => router.push('/(auth)/login')}
            />
          )}

          <RatingList
            ratings={ratings}
            isLoading={ratingsQuery.isLoading}
            isError={ratingsQuery.isError}
            errorMessage={ratingsErrorMessage}
            onRetry={() => void ratingsQuery.refetch()}
            hasNextPage={Boolean(ratingsQuery.hasNextPage)}
            isFetchingNextPage={ratingsQuery.isFetchingNextPage}
            onLoadMore={() => void ratingsQuery.fetchNextPage()}
            currentUserId={user?.id}
            emptyTitle="No ratings yet"
            emptyDescription="Be the first to rate this drink."
          />
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
});
