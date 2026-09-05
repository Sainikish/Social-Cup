import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, fontSize } from '../theme';

export interface LoadingIndicatorProps {
  label?: string;
}

export function LoadingIndicator({ label }: LoadingIndicatorProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
