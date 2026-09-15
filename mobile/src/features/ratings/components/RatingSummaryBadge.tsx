import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight, radius, spacing } from '../../../theme';

export interface RatingSummaryBadgeProps {
  /**
   * `undefined` (field not yet returned by an older backend build) and
   * `null` (field present, but the cafe/drink genuinely has no ratings yet)
   * are deliberately treated identically here - both render the same "New"
   * badge, never a "0" or a blank space. See DrinkResponse/CafeSummaryResponse.
   */
  averageRating: number | null | undefined;
  ratingCount?: number;
}

// Shared by CafeCard and DrinkCard (and anywhere else a rating summary needs
// to appear next to a name) - one place for the "already rated" vs "New"
// decision rather than duplicating the `== null` check at every call site.
export function RatingSummaryBadge({ averageRating, ratingCount }: RatingSummaryBadgeProps) {
  if (averageRating == null) {
    return (
      <View style={styles.newBadge}>
        <Text style={styles.newBadgeText}>New</Text>
      </View>
    );
  }

  const countSuffix = ratingCount ? ` (${ratingCount})` : '';

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Rated ${averageRating.toFixed(1)} out of 5${
        ratingCount ? ` from ${ratingCount} rating${ratingCount === 1 ? '' : 's'}` : ''
      }`}
    >
      <Text style={styles.star}>★</Text>
      <Text style={styles.ratingText}>
        {averageRating.toFixed(1)}
        {countSuffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    fontSize: fontSize.xs,
    color: colors.accent,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  newBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
});
