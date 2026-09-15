import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  style?: ViewStyle;
}

// A single static placeholder block - deliberately not an animated shimmer,
// there is no existing skeleton primitive anywhere in the app yet and a
// pulsing animation is more than the cafe list's loading state needs (see
// features/cafes/components/CafeListSkeleton.tsx, its only caller so far).
// Uses the theme's own muted surface tone rather than a hardcoded gray so it
// still fits the palette.
export function Skeleton({ width = '100%', height = 16, style }: SkeletonProps) {
  return <View style={[styles.block, { width, height }, style]} />;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
  },
});
