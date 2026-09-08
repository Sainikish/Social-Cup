package com.socialcup.subscription.repository;

import com.socialcup.subscription.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    Optional<Subscription> findByMemberId(UUID memberId);

    // Used by webhook processing to locate the local subscription row a
    // Stripe event refers to. The concurrency guard for duplicate/concurrent
    // webhook delivery is ProcessedWebhookEventRepository's unique-insert
    // (see SubscriptionService.processWebhookEvent) - not a lock here.
    Optional<Subscription> findByStripeSubscriptionId(String stripeSubscriptionId);
}
