import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../src/components';
import { useAuth } from '../../src/features/auth';
import { colors, fontSize, fontWeight, spacing } from '../../src/theme';

// Still a placeholder for real profile/diary features (later phase) - but
// wires up sign-out here since it's an auth concern (Phase 7.2), not a
// profile feature, and logout would otherwise have no way to be triggered
// from the app at all.
export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {user ? <Text style={styles.email}>Signed in as {user.email}</Text> : null}
      <Text style={styles.description}>
        Your full profile and drink diary will be implemented in a later phase.
      </Text>
      <Button label="Log Out" variant="outline" onPress={() => void logout()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
