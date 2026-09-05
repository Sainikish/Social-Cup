import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Card } from '../../../components';
import { colors, fontSize, fontWeight, spacing } from '../../../theme';
import type { DrinkRatingResponse } from '../types';
import { RatingStars } from './RatingStars';

export interface RatingCardProps {
  rating: DrinkRatingResponse;
  /** Whether this row belongs to the currently authenticated member. */
  isOwnRating?: boolean;
}

// Formats an ISO timestamp as a short human date - no shared date-formatting
// utility exists elsewhere in the app yet, and this is the one place a
// review's date needs to be rendered (the diary screen shows a rating's own
// createdAt using this same helper, re-exported via the feature barrel).
export function formatRatingDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function authorDisplayName(author: DrinkRatingResponse['author']): string {
  if (!author) {
    return 'Anonymous';
  }
  const name = [author.firstName, author.lastName].filter(Boolean).join(' ').trim();
  return name || 'Anonymous';
}

// Renders only firstName/lastName/avatarUrl/rating/note/createdAt - NEVER
// email, password, roles, account status, or any internal identifier (see
// backend RatingAuthorResponse, deliberately narrower than MemberDto).
export function RatingCard({ rating, isOwnRating = false }: RatingCardProps) {
  const authorName = authorDisplayName(rating.author);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Avatar avatarUrl={rating.author?.avatarUrl} name={authorName} size={36} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{authorName}</Text>
            {isOwnRating ? <Text style={styles.ownBadge}>Your rating</Text> : null}
          </View>
          <Text style={styles.date}>{formatRatingDate(rating.createdAt)}</Text>
        </View>
      </View>
      <RatingStars value={rating.rating} size="sm" />
      {rating.note ? <Text style={styles.note}>{rating.note}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  ownBadge: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  note: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
