import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../src/components';
import { colors, spacing, fontSize, fontWeight } from '../../src/theme';

// Placeholder only - the real home feed is a later phase.
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>Welcome to Social Cup</Text>
        <Text style={styles.description}>Your home feed will be implemented in a later phase.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
