package com.socialcup.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

// Binds the already-scaffolded app.stripe.* keys (present in every
// application*.yml profile since before Phase E) - mirrors CorsProperties'
// @Component @ConfigurationProperties(prefix=...) @Data shape. Sets the
// stripe-java SDK's static API key once at startup, the standard
// initialization pattern for that SDK.
@Component
@ConfigurationProperties(prefix = "app.stripe")
@Data
public class StripeProperties {

    private String apiKey;
    private String webhookSecret;
    // Stripe Price id for the $24.99/mo membership - server-side only, never
    // accepted from a client request (see CreateSubscriptionRequest).
    private String priceId;

    @PostConstruct
    public void configureStripeClient() {
        Stripe.apiKey = apiKey;
    }

}
