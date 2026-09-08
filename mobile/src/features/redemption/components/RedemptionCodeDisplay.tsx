import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '../../../components';
import { colors, fontSize, fontWeight, spacing } from '../../../theme';
import type { RedemptionCodeResponse } from '../types';

export interface RedemptionCodeDisplayProps {
  redemption: RedemptionCodeResponse;
  onRegenerate: () => void;
  regenerating?: boolean;
}

const COUNTDOWN_TICK_MS = 1000;

// Display-only: derived purely from the server-provided validUntil, ticking
// once a second so the member can see time running out. Never used to
// authorize anything - reaching zero here only changes what this component
// renders, it never calls the backend on its own (see RedemptionCodeDisplay
// below and app/(app)/drinks/redeem.tsx, which only ever calls the backend
// in response to an explicit member action).
function useRemainingMs(validUntil: string): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const targetMs = new Date(validUntil).getTime();
  return Math.max(0, targetMs - now);
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function RedemptionCodeDisplay({
  redemption,
  onRegenerate,
  regenerating = false,
}: RedemptionCodeDisplayProps) {
  const remainingMs = useRemainingMs(redemption.validUntil);
  const isExpired = remainingMs <= 0;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.drinkName}>{redemption.drinkName}</Text>
        <Text style={styles.cafeName}>{redemption.cafeName}</Text>
        <Text style={styles.creditPrice}>
          {redemption.creditPrice} credit{redemption.creditPrice === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Redemption code</Text>
        <Text style={styles.code} selectable accessibilityLabel="Redemption code">
          {redemption.code}
        </Text>
      </View>

      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Backup code</Text>
        <Text style={styles.backupCode} selectable accessibilityLabel="Backup code">
          {redemption.backupCode}
        </Text>
      </View>

      {isExpired ? (
        <View style={styles.expiredSection}>
          <Text style={styles.expiredText}>This code has expired.</Text>
          <Button
            testID="regenerate-code-button"
            label="Generate new code"
            onPress={onRegenerate}
            loading={regenerating}
          />
        </View>
      ) : (
        <Text style={styles.countdown} accessibilityLabel="Time remaining">
          Expires in {formatCountdown(remainingMs)}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  drinkName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  cafeName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  creditPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  codeSection: {
    gap: spacing.xs,
  },
  codeLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  code: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  backupCode: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  countdown: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.accent,
  },
  expiredSection: {
    gap: spacing.sm,
  },
  expiredText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.danger,
  },
});
