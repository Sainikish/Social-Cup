import { CardField, StripeProvider, useStripe, type CardFieldInput } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toApiError } from '../../../src/api/client';
import { Button, Card, ErrorState, LoadingIndicator } from '../../../src/components';
import { config } from '../../../src/config/env';
import { useAuth } from '../../../src/features/auth';
import {
  SubscriptionStatusCard,
  cancelErrorMessage,
  subscribeErrorMessage,
  useCancelSubscriptionMutation,
  useSubscribeMutation,
  useSubscriptionQuery,
} from '../../../src/features/subscription';
import { colors, fontSize, fontWeight, spacing } from '../../../src/theme';
import { genericErrorMessage } from '../../../src/utils/apiErrors';

const MEMBERSHIP_PRICE_LABEL = '$24.99/month';
const MEMBERSHIP_CREDITS_LABEL = '30 drink credits every month';

function SubscribeForm() {
  const { createPaymentMethod } = useStripe();
  const subscribeMutation = useSubscribeMutation();
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [isCreatingPaymentMethod, setIsCreatingPaymentMethod] = useState(false);

  const cardComplete = cardDetails?.complete === true;
  const isSubmitting = isCreatingPaymentMethod || subscribeMutation.isPending;

  async function handleSubscribe() {
    setFormError(undefined);
    setIsCreatingPaymentMethod(true);
    try {
      // Card details never leave the device except via Stripe's own SDK -
      // this call talks directly to Stripe, not the Social Cup backend. Only
      // the resulting opaque paymentMethod.id is ever sent to our API below.
      const { paymentMethod, error } = await createPaymentMethod({ paymentMethodType: 'Card' });
      if (error || !paymentMethod) {
        setFormError(error?.message || 'Could not process your card. Please check the details and try again.');
        return;
      }

      subscribeMutation.mutate(
        { paymentMethodId: paymentMethod.id },
        {
          onError: (mutationError) => {
            setFormError(subscribeErrorMessage(toApiError(mutationError).code));
          },
        }
      );
    } finally {
      setIsCreatingPaymentMethod(false);
    }
  }

  return (
    <Card style={styles.formCard}>
      <Text style={styles.formTitle}>Add your card</Text>
      <CardField
        postalCodeEnabled={false}
        placeholders={{ number: '4242 4242 4242 4242' }}
        style={styles.cardField}
        onCardChange={setCardDetails}
        accessibilityLabel="Card details"
      />

      {formError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}

      <Button
        testID="subscribe-button"
        label={`Subscribe — ${MEMBERSHIP_PRICE_LABEL}`}
        onPress={() => void handleSubscribe()}
        loading={isSubmitting}
        disabled={!cardComplete || isSubmitting}
      />
    </Card>
  );
}

function SubscribePanel() {
  if (!config.stripePublishableKey) {
    // A missing publishable key is a configuration problem, not a member-
    // facing error state to retry - surfaced plainly rather than silently
    // rendering a payment form that can never succeed.
    return (
      <Card style={styles.formCard}>
        <Text style={styles.errorText}>
          Subscriptions are temporarily unavailable. Please try again later.
        </Text>
      </Card>
    );
  }

  return (
    <StripeProvider publishableKey={config.stripePublishableKey}>
      <SubscribeForm />
    </StripeProvider>
  );
}

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const subscriptionQuery = useSubscriptionQuery({ enabled: Boolean(user) });
  const cancelMutation = useCancelSubscriptionMutation();
  const [cancelError, setCancelError] = useState<string | undefined>(undefined);

  if (subscriptionQuery.isLoading) {
    return <LoadingIndicator label="Loading membership..." />;
  }

  const apiError = subscriptionQuery.error ? toApiError(subscriptionQuery.error) : undefined;
  const isNotSubscribed = apiError?.code === 'RESOURCE_NOT_FOUND';

  if (subscriptionQuery.isError && !isNotSubscribed) {
    return (
      <ErrorState
        message={apiError ? genericErrorMessage(apiError) : 'Something went wrong.'}
        onRetry={() => void subscriptionQuery.refetch()}
        retryLabel="Retry"
      />
    );
  }

  const subscription = isNotSubscribed ? null : (subscriptionQuery.data ?? null);
  const canCancel = subscription != null && subscription.status !== 'CANCELLED' && !subscription.cancelAtPeriodEnd;

  function confirmCancel() {
    Alert.alert(
      'Cancel membership?',
      'Your membership will remain active until the end of the current billing period.',
      [
        { text: 'Keep membership', style: 'cancel' },
        {
          text: 'Cancel membership',
          style: 'destructive',
          onPress: () => {
            setCancelError(undefined);
            cancelMutation.mutate(undefined, {
              onError: (error) => setCancelError(cancelErrorMessage(toApiError(error).code)),
            });
          },
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Membership' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Card>
          <SubscriptionStatusCard subscription={subscription} />
        </Card>

        {!subscription ? (
          <View style={styles.explainer}>
            <Text style={styles.explainerTitle}>Social Cup Membership</Text>
            <Text style={styles.explainerBody}>
              {MEMBERSHIP_PRICE_LABEL} · {MEMBERSHIP_CREDITS_LABEL}
            </Text>
          </View>
        ) : null}

        {!subscription ? <SubscribePanel /> : null}

        {canCancel ? (
          <>
            {cancelError ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {cancelError}
              </Text>
            ) : null}
            <Button
              testID="cancel-subscription-button"
              label="Cancel Subscription"
              variant="outline"
              onPress={confirmCancel}
              loading={cancelMutation.isPending}
              disabled={cancelMutation.isPending}
            />
          </>
        ) : null}
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
    gap: spacing.lg,
  },
  explainer: {
    gap: spacing.xs,
  },
  explainerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  explainerBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  formCard: {
    gap: spacing.md,
  },
  formTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  cardField: {
    height: 50,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
});
