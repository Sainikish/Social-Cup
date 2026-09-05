import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../../../theme';

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export interface RatingStarsProps {
  /** Current value, 1-5. `undefined` in interactive mode means nothing selected yet. */
  value: number | undefined;
  /** Presence of this prop switches the component into interactive (tappable) mode. */
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
}

// Plain Unicode glyphs rather than an icon library, matching the rest of the
// app (see ☕/🥤 elsewhere) - no extra dependency for five characters.
export function RatingStars({ value, onChange, size = 'md' }: RatingStarsProps) {
  const starSize = size === 'sm' ? fontSize.md : fontSize.xl;

  if (!onChange) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={value ? `Rated ${value} out of 5 stars` : 'Not yet rated'}
      >
        {STAR_VALUES.map((star) => (
          <Text key={star} style={[styles.star, { fontSize: starSize }]}>
            {value !== undefined && star <= value ? '★' : '☆'}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {STAR_VALUES.map((star) => (
        <Pressable
          key={star}
          onPress={() => onChange(star)}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
          accessibilityState={{ selected: value === star }}
          hitSlop={4}
          style={styles.starButton}
        >
          <Text
            style={[
              styles.star,
              { fontSize: starSize },
              value !== undefined && star <= value && styles.starSelected,
            ]}
          >
            {value !== undefined && star <= value ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  starButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    color: colors.textMuted,
  },
  starSelected: {
    color: colors.primary,
  },
});
