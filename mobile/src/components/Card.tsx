import { View, StyleSheet, type ViewProps } from 'react-native';

import { colors, radius, spacing, shadows } from '../theme';

export type CardProps = ViewProps;

export function Card({ style, ...viewProps }: CardProps) {
  return <View style={[styles.card, style]} {...viewProps} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
});
