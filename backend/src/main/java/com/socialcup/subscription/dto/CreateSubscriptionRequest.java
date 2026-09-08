package com.socialcup.subscription.dto;

import jakarta.validation.constraints.NotBlank;

// paymentMethodId is an opaque Stripe PaymentMethod token (e.g. "pm_...")
// already created client-side via Stripe.js/Elements - raw card data never
// reaches this backend. No price/amount is ever accepted from the client;
// the $24.99/mo price is resolved server-side from StripeProperties.
public record CreateSubscriptionRequest(
    @NotBlank(message = "Payment method is required")
    String paymentMethodId
) {
}
