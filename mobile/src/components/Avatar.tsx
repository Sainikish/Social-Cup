import { StyleSheet, Text } from 'react-native';

import { colors, fontWeight } from '../theme';
import { FallbackImage } from './FallbackImage';

export interface AvatarProps {
  avatarUrl: string | null | undefined;
  /** Display name (or email, as a fallback identity) - used for the initial letter and the accessibility label. */
  name: string;
  size?: number;
}

// Shared by RatingCard (another member's avatar) and the Profile screen (the
// signed-in member's own avatar) - one implementation of "photo, or an
// initial-letter circle if there is none or it fails to load" rather than
// two screens each inventing their own.
export function Avatar({ avatarUrl, name, size = 40 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <FallbackImage uri={avatarUrl} style={dimensionStyle} accessibilityLabel={`${name} avatar`}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </FallbackImage>
  );
}

const styles = StyleSheet.create({
  initial: {
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
});
