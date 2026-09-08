package com.socialcup.subscription.dto;

import com.socialcup.subscription.entity.Subscription;
import com.socialcup.subscription.entity.SubscriptionStatus;

import java.time.LocalDate;
import java.util.UUID;

// Admin-only view - unlike the member-facing SubscriptionResponse, this
// deliberately includes memberId/memberEmail (the whole point of an admin
// listing is to see WHOSE subscription this is) and the payment diagnostics
// (paymentFailedCount) a member never needs to see about their own account.
public record AdminSubscriptionResponse(
    UUID subscriptionId,
    UUID memberId,
    String memberEmail,
    SubscriptionStatus status,
    LocalDate currentPeriodStart,
    LocalDate currentPeriodEnd,
    boolean cancelAtPeriodEnd,
    int paymentFailedCount
) {
    public static AdminSubscriptionResponse fromEntity(Subscription subscription) {
        return new AdminSubscriptionResponse(
            subscription.getId(),
            subscription.getMember().getId(),
            subscription.getMember().getEmail(),
            subscription.getStatus(),
            subscription.getCurrentPeriodStart(),
            subscription.getCurrentPeriodEnd(),
            subscription.isCancelAtPeriodEnd(),
            subscription.getPaymentFailedCount()
        );
    }
}
