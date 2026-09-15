import { StyleSheet, View } from 'react-native';

import { Card, Skeleton } from '../../../components';
import { radius, spacing } from '../../../theme';

const PHOTO_HEIGHT = 140;
const PLACEHOLDER_COUNT = 4;

// Mirrors CafeCard's approximate shape (a photo block on top, a couple of
// text lines below) closely enough to avoid a jarring layout jump once the
// real cards arrive - it does not need to reproduce every detail (badges,
// exact line count) of the real card.
function CafeCardSkeleton() {
  return (
    <Card style={styles.card}>
      <Skeleton height={PHOTO_HEIGHT} style={styles.photo} />
      <View style={styles.body}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="45%" height={14} />
      </View>
    </Card>
  );
}

// Replaces the plain loading spinner for the cafe list's initial load (see
// CafeList.tsx) - a handful of placeholder shapes rather than an
// ActivityIndicator, so the list's own layout is visible while it loads
// instead of an unrelated centered spinner.
export function CafeListSkeleton() {
  return (
    <View style={styles.container} testID="cafe-list-skeleton">
      {/* Index is a fine key here - a fixed count of interchangeable,
          non-reorderable placeholders with no real data/identity to key by. */}
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
        <CafeCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    gap: spacing.md,
  },
  photo: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
