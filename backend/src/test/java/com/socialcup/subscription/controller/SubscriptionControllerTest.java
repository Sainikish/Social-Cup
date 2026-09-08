package com.socialcup.subscription.controller;

import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.security.JwtAuthenticationFilter;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.RestAccessDeniedHandler;
import com.socialcup.security.RestAuthenticationEntryPoint;
import com.socialcup.security.Roles;
import com.socialcup.subscription.dto.SubscriptionResponse;
import com.socialcup.subscription.entity.SubscriptionStatus;
import com.socialcup.subscription.service.SubscriptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SubscriptionController.class)
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
class SubscriptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private SubscriptionService subscriptionService;

    private static SubscriptionResponse aResponse() {
        return new SubscriptionResponse(
            SubscriptionStatus.ACTIVE, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1), false);
    }

    private String memberToken(UUID memberId) {
        return tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));
    }

    @Test
    void subscribe_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/users/me/subscription")
                .contentType("application/json")
                .content("{\"paymentMethodId\":\"pm_123\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void subscribe_authenticated_returns201() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(subscriptionService.subscribe(eq(memberId), any())).thenReturn(aResponse());

        mockMvc.perform(post("/users/me/subscription")
                .header("Authorization", "Bearer " + memberToken(memberId))
                .contentType("application/json")
                .content("{\"paymentMethodId\":\"pm_123\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status", is("ACTIVE")));
    }

    @Test
    void subscribe_withoutPaymentMethod_returns400() throws Exception {
        UUID memberId = UUID.randomUUID();

        mockMvc.perform(post("/users/me/subscription")
                .header("Authorization", "Bearer " + memberToken(memberId))
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void subscribe_alreadySubscribed_returns409() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(subscriptionService.subscribe(eq(memberId), any()))
            .thenThrow(new ConflictException("Member already has an active subscription"));

        mockMvc.perform(post("/users/me/subscription")
                .header("Authorization", "Bearer " + memberToken(memberId))
                .contentType("application/json")
                .content("{\"paymentMethodId\":\"pm_123\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void getMySubscription_none_returns404() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(subscriptionService.getMySubscription(memberId))
            .thenThrow(new ResourceNotFoundException("No subscription found for this member"));

        mockMvc.perform(get("/users/me/subscription")
                .header("Authorization", "Bearer " + memberToken(memberId)))
            .andExpect(status().isNotFound());
    }

    @Test
    void cancel_success_returns200() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(subscriptionService.cancel(memberId)).thenReturn(
            new SubscriptionResponse(SubscriptionStatus.ACTIVE, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1), true));

        mockMvc.perform(delete("/users/me/subscription")
                .header("Authorization", "Bearer " + memberToken(memberId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.cancelAtPeriodEnd", is(true)));
    }
}
