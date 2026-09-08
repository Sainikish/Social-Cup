package com.socialcup.subscription.repository;

import com.socialcup.subscription.entity.ProcessedWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProcessedWebhookEventRepository extends JpaRepository<ProcessedWebhookEvent, UUID> {

    boolean existsByStripeEventId(String stripeEventId);
}
