// Mirrors com.socialcup.subscription.entity.SubscriptionStatus exactly.
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

// Mirrors com.socialcup.subscription.dto.SubscriptionResponse exactly -
// returned by GET/POST/DELETE /users/me/subscription alike. Deliberately
// omits stripe_subscription_id/stripe_customer_id/payment_failed_count/
// last_payment_error - the backend never returns them to the client (see
// SubscriptionResponse.java).
export interface SubscriptionResponse {
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

// Mirrors com.socialcup.subscription.dto.CreateSubscriptionRequest exactly.
// paymentMethodId is an opaque Stripe PaymentMethod id ("pm_...") already
// created on-device via @stripe/stripe-react-native - raw card data never
// reaches this type or the backend.
export interface CreateSubscriptionRequest {
  paymentMethodId: string;
}
