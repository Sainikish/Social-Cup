// Mirrors com.socialcup.subscription.entity.SubscriptionStatus exactly -
// these are the only three values the backend ever returns; there is no
// PAST_DUE-adjacent or PENDING state to invent.
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

// Mirrors com.socialcup.subscription.dto.AdminSubscriptionResponse exactly -
// the only subscription shape GET /admin/subscriptions returns. Deliberately
// has NO Stripe identifiers (stripeCustomerId/stripeSubscriptionId) and no
// cancelledAt/lastPaymentError - the backend DTO omits these even though the
// underlying entity has them, so this app must not invent them either.
// currentPeriodStart/currentPeriodEnd are nullable - the entity columns
// have no NOT NULL constraint.
export interface AdminSubscriptionResponse {
  subscriptionId: string;
  memberId: string;
  memberEmail: string;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentFailedCount: number;
}
