package com.socialcup.subscription.controller;

import com.socialcup.subscription.dto.AdminSubscriptionResponse;
import com.socialcup.subscription.repository.SubscriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Read-only subscription visibility for admins - no subscription mutation
// lives here (member-facing subscribe/cancel stays in SubscriptionController;
// Stripe webhook processing stays in SubscriptionService). Already covered
// by SecurityConfig's existing "/admin/**" -> hasRole(ADMIN) rule.
@RestController
@RequestMapping("/admin/subscriptions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSubscriptionController {

    private final SubscriptionRepository subscriptionRepository;

    public AdminSubscriptionController(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @GetMapping
    public ResponseEntity<List<AdminSubscriptionResponse>> getAllSubscriptions() {
        List<AdminSubscriptionResponse> subscriptions = subscriptionRepository.findAll().stream()
            .map(AdminSubscriptionResponse::fromEntity)
            .toList();
        return ResponseEntity.ok(subscriptions);
    }
}
