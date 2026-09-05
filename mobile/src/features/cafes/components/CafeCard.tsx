import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../../components';
import { colors, fontSize, fontWeight, radius, spacing } from '../../../theme';
import type { CafeSummaryResponse } from '../types';

export interface CafeCardProps {
  cafe: CafeSummaryResponse;
  onPress: (cafeId: string) => void;
}

export function CafeCard({ cafe, onPress }: CafeCardProps) {
  const location = [cafe.neighbourhood, cafe.address].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() => onPress(cafe.id)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${cafe.name} cafe`}
    >
      <Card style={styles.card}>
        <View style={styles.photoContainer}>
          {cafe.primaryPhotoUrl ? (
            <Image
              source={{ uri: cafe.primaryPhotoUrl }}
              style={styles.photo}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>☕</Text>
            </View>
          )}
          {cafe.featured ? (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {cafe.name}
          </Text>
          {location ? (
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            {cafe.vibeTags ? (
              <Text style={styles.vibeTags} numberOfLines={1}>
                {cafe.vibeTags}
              </Text>
            ) : null}
            {cafe.distanceKm != null ? (
              <Text style={styles.distance}>{cafe.distanceKm.toFixed(1)} km</Text>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const PHOTO_HEIGHT = 140;

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: PHOTO_HEIGHT,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  photoPlaceholder: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 32,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
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
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  vibeTags: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  distance: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
