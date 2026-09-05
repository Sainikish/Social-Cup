import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card } from '../../../src/components';
import { useAuth } from '../../../src/features/auth';
import { colors, fontSize, fontWeight, spacing } from '../../../src/theme';

// Mirrors com.socialcup.user.entity.MemberStatus - ACTIVE is the normal,
// unremarkable state (not worth calling out), so the status row only
// appears for the other three values, the same way the drink detail screen
// only shows "Currently unavailable" for a non-ACTIVE drink rather than
// always showing a status line.
function formatAccountStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';
  const identityLabel = fullName || user?.email || '';
  const showStatus = Boolean(user?.status) && user?.status !== 'ACTIVE';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar avatarUrl={user?.avatarUrl} name={identityLabel || '?'} size={72} />
        {fullName ? (
          <Text style={styles.name} numberOfLines={1}>
            {fullName}
          </Text>
        ) : null}
        {user ? (
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
        ) : null}
      </View>

      <Card style={styles.infoCard}>
        {showStatus && user ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account status</Text>
            <Text style={styles.infoValue}>{formatAccountStatus(user.status)}</Text>
          </View>
        ) : null}
        <Text style={styles.readOnlyNote}>Your account details are read-only here.</Text>
      </Card>

      <View style={styles.actions}>
        <Button
          label="My Drink Diary"
          accessibilityLabel="My Drink Diary"
          onPress={() => router.push('/(app)/profile/diary')}
        />
        <Button
          label="Log Out"
          variant="outline"
          accessibilityLabel="Sign out"
          onPress={() => void logout()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoCard: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  readOnlyNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.md,
  },
});
