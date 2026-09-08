package com.socialcup.subscription.controller;

import com.socialcup.common.exception.SocialCupException;
import com.socialcup.config.StripeProperties;
import com.socialcup.subscription.service.SubscriptionService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Public (see SecurityConfig's PUBLIC_ENDPOINTS) - Stripe cannot present a
// member/barista JWT. Authenticity comes entirely from Stripe-Signature
// verification below, never from Spring Security's role gating.
@RestController
@RequestMapping("/webhooks")
public class StripeWebhookController {

    private final SubscriptionService subscriptionService;
    private final StripeProperties stripeProperties;

    public StripeWebhookController(SubscriptionService subscriptionService, StripeProperties stripeProperties) {
        this.subscriptionService = subscriptionService;
        this.stripeProperties = stripeProperties;
    }

    @PostMapping("/stripe")
    public ResponseEntity<Void> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank()) {
            throw new SocialCupException("INVALID_SIGNATURE", "Missing Stripe-Signature header", HttpStatus.BAD_REQUEST);
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, signatureHeader, stripeProperties.getWebhookSecret());
        } catch (SignatureVerificationException e) {
            throw new SocialCupException("INVALID_SIGNATURE", "Invalid Stripe webhook signature", HttpStatus.BAD_REQUEST);
        }

        subscriptionService.processWebhookEvent(event);
        return ResponseEntity.ok().build();
    }
}
