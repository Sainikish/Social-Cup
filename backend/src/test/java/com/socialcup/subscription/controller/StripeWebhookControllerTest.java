package com.socialcup.subscription.controller;

import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.StripeProperties;
import com.socialcup.config.WebConfig;
import com.socialcup.security.JwtAuthenticationFilter;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.RestAccessDeniedHandler;
import com.socialcup.security.RestAuthenticationEntryPoint;
import com.socialcup.subscription.service.SubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Computes real Stripe webhook HMAC signatures (Stripe's documented scheme:
// v1 = HMAC-SHA256(webhookSecret, "{timestamp}.{payload}")) rather than
// mocking Webhook.constructEvent - this exercises the actual signature
// verification path, not just a stubbed pass-through.
@WebMvcTest(StripeWebhookController.class)
@Import({
    WebConfig.class,
    RateLimitProperties.class,
    SecurityConfig.class,
    JwtAuthenticationFilter.class,
    JwtTokenProvider.class,
    RestAuthenticationEntryPoint.class,
    RestAccessDeniedHandler.class,
    ApiErrorResponseWriter.class,
    CorsProperties.class,
    GlobalExceptionHandler.class
})
class StripeWebhookControllerTest {

    private static final String WEBHOOK_SECRET = "whsec_test_secret";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SubscriptionService subscriptionService;

    @MockitoBean
    private StripeProperties stripeProperties;

    @BeforeEach
    void setUp() {
        when(stripeProperties.getWebhookSecret()).thenReturn(WEBHOOK_SECRET);
    }

    private static String sign(String payload) throws Exception {
        long timestamp = Instant.now().getEpochSecond();
        String signedPayload = timestamp + "." + payload;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String hex = HexFormat.of().formatHex(mac.doFinal(signedPayload.getBytes(StandardCharsets.UTF_8)));
        return "t=" + timestamp + ",v1=" + hex;
    }

    @Test
    void handleStripeWebhook_validSignature_returns200_andDelegatesToSubscriptionService() throws Exception {
        String payload = "{\"id\":\"evt_123\",\"object\":\"event\",\"type\":\"invoice.payment_succeeded\","
            + "\"data\":{\"object\":{\"id\":\"in_123\",\"object\":\"invoice\"}}}";

        mockMvc.perform(post("/webhooks/stripe")
                .header("Stripe-Signature", sign(payload))
                .contentType("application/json")
                .content(payload))
            .andExpect(status().isOk());

        verify(subscriptionService).processWebhookEvent(any());
    }

    @Test
    void handleStripeWebhook_invalidSignature_returns400_andNeverDelegates() throws Exception {
        String payload = "{\"id\":\"evt_123\",\"object\":\"event\",\"type\":\"invoice.payment_succeeded\"}";

        mockMvc.perform(post("/webhooks/stripe")
                .header("Stripe-Signature", "t=1700000000,v1=0000000000000000000000000000000000000000000000000000000000000000")
                .contentType("application/json")
                .content(payload))
            .andExpect(status().isBadRequest());

        verify(subscriptionService, never()).processWebhookEvent(any());
    }

    @Test
    void handleStripeWebhook_missingSignatureHeader_returns400() throws Exception {
        mockMvc.perform(post("/webhooks/stripe")
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest());

        verify(subscriptionService, never()).processWebhookEvent(any());
    }
}
