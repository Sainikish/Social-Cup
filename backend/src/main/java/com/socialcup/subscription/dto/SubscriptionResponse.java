package com.socialcup.subscription.dto;

import com.socialcup.subscription.entity.Subscription;
import com.socialcup.subscription.entity.SubscriptionStatus;

import java.time.LocalDate;

// Deliberately omits stripe_subscription_id/stripe_customer_id (internal
// references, never useful to the client) and payment_failed_count/
// last_payment_error (internal diagnostics, not member-facing).
public record SubscriptionResponse(
    SubscriptionStatus status,
    LocalDate currentPeriodStart,
    LocalDate currentPeriodEnd,
    boolean cancelAtPeriodEnd
) {
    public static SubscriptionResponse fromEntity(Subscription subscription) {
        return new SubscriptionResponse(
            subscription.getStatus(),
            subscription.getCurrentPeriodStart(),
            subscription.getCurrentPeriodEnd(),
            subscription.isCancelAtPeriodEnd()
        );
    }
}
