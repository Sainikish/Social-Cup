import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { toApiError } from '../../../src/api/client';
import { Button, Card } from '../../../src/components';
import {
  RedemptionCodeDisplay,
  createRedemptionCodeErrorMessage,
  useCreateRedemptionCodeMutation,
} from '../../../src/features/redemption';
import { colors, fontSize, fontWeight, spacing } from '../../../src/theme';

export default function RedeemScreen() {
  const { drinkId } = useLocalSearchParams<{ drinkId: string }>();
  const mutation = useCreateRedemptionCodeMutation();

  function handleGenerate() {
    if (!drinkId) {
      return;
    }
    mutation.mutate(drinkId);
  }

  const errorMessage = mutation.isError
    ? createRedemptionCodeErrorMessage(toApiError(mutation.error).code)
    : undefined;

  return (
    <>
      <Stack.Screen options={{ title: 'Redeem' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {mutation.data ? (
          <>
            {errorMessage ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {errorMessage}
              </Text>
            ) : null}
            <RedemptionCodeDisplay
              redemption={mutation.data}
              onRegenerate={handleGenerate}
              regenerating={mutation.isPending}
            />
          </>
        ) : (
          <Card style={styles.introCard}>
            <Text style={styles.introTitle}>Generate a redemption code</Text>
            <Text style={styles.introBody}>
              Show this code to the barista to redeem your drink. The code stays valid for a
              short time after you generate it.
            </Text>
            {errorMessage ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {errorMessage}
              </Text>
            ) : null}
            <Button
              testID="generate-code-button"
              label="Generate redemption code"
              onPress={handleGenerate}
              loading={mutation.isPending}
              disabled={!drinkId || mutation.isPending}
            />
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  introCard: {
    gap: spacing.md,
  },
  introTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  introBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
});
