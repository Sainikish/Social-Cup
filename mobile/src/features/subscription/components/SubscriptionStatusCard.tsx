import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';
import type { SubscriptionResponse, SubscriptionStatus } from '../types';

export interface SubscriptionStatusCardProps {
  /** null means "no subscription exists" - the GET 404 case, not an error. */
  subscription: SubscriptionResponse | null;
}

// Pure display - no actions here (Subscribe/Cancel buttons live in the
// screens that embed this), so both the compact Profile membership card and
// the full Subscription screen can show the exact same status summary
// without duplicating this formatting logic.
function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function statusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'PAST_DUE':
      return 'Payment past due';
    case 'CANCELLED':
      return 'Cancelled';
  }
}

function statusColor(status: SubscriptionStatus): string {
  switch (status) {
    case 'ACTIVE':
      return colors.success;
    case 'PAST_DUE':
      return colors.warning;
    case 'CANCELLED':
      return colors.textMuted;
  }
}

export function SubscriptionStatusCard({ subscription }: SubscriptionStatusCardProps) {
  if (!subscription) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusLabel}>Not subscribed</Text>
        <Text style={styles.description}>Subscribe to get 30 drink credits every month.</Text>
      </View>
    );
  }

  const periodEnd = formatDate(subscription.currentPeriodEnd);
  const showRenewalInfo = periodEnd !== null && subscription.status !== 'CANCELLED';
  const showScheduledCancellation = subscription.cancelAtPeriodEnd && subscription.status !== 'CANCELLED';

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View
          style={[styles.dot, { backgroundColor: statusColor(subscription.status) }]}
          accessibilityElementsHidden
        />
        <Text style={styles.statusLabel}>{statusLabel(subscription.status)}</Text>
      </View>

      {subscription.status === 'PAST_DUE' ? (
        <Text style={styles.warningText}>
          Your last payment didn&apos;t go through. Please update your payment method to keep your
          membership active.
        </Text>
      ) : null}

      {showRenewalInfo ? (
        <Text style={styles.description}>
          {subscription.cancelAtPeriodEnd ? `Membership ends on ${periodEnd}.` : `Renews on ${periodEnd}.`}
        </Text>
      ) : null}

      {showScheduledCancellation ? (
        <Text style={styles.scheduledText}>
          Cancellation scheduled for the end of this billing period.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  scheduledText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
