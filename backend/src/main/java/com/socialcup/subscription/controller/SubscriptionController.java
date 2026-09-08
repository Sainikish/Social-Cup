package com.socialcup.subscription.controller;

import com.socialcup.security.CurrentUserResolver;
import com.socialcup.subscription.dto.CreateSubscriptionRequest;
import com.socialcup.subscription.dto.SubscriptionResponse;
import com.socialcup.subscription.service.SubscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

// A fourth @RestController mapped to /users/me, alongside
// credit/rating/redemption's own - same one-controller-per-feature-module
// convention.
@RestController
@RequestMapping("/users/me/subscription")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @PostMapping
    public ResponseEntity<SubscriptionResponse> subscribe(
            @Valid @RequestBody CreateSubscriptionRequest request,
            Authentication authentication) {
        UUID memberId = CurrentUserResolver.requireMemberId(authentication);
        SubscriptionResponse response = subscriptionService.subscribe(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<SubscriptionResponse> getMySubscription(Authentication authentication) {
        UUID memberId = CurrentUserResolver.requireMemberId(authentication);
        return ResponseEntity.ok(subscriptionService.getMySubscription(memberId));
    }

    @DeleteMapping
    public ResponseEntity<SubscriptionResponse> cancel(Authentication authentication) {
        UUID memberId = CurrentUserResolver.requireMemberId(authentication);
        return ResponseEntity.ok(subscriptionService.cancel(memberId));
    }
}
