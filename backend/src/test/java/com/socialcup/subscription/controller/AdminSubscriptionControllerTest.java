package com.socialcup.subscription.controller;

import com.socialcup.common.exception.GlobalExceptionHandler;
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
import com.socialcup.subscription.entity.Subscription;
import com.socialcup.subscription.entity.SubscriptionStatus;
import com.socialcup.subscription.repository.SubscriptionRepository;
import com.socialcup.user.entity.Member;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminSubscriptionController.class)
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
class AdminSubscriptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private SubscriptionRepository subscriptionRepository;

    private String adminToken() {
        return tokenProvider.generateAccessToken(UUID.randomUUID().toString(), List.of(Roles.ADMIN));
    }

    private String memberToken() {
        return tokenProvider.generateAccessToken(UUID.randomUUID().toString(), List.of(Roles.MEMBER));
    }

    @Test
    void getAllSubscriptions_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/admin/subscriptions"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllSubscriptions_memberToken_returns403() throws Exception {
        mockMvc.perform(get("/admin/subscriptions").header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void getAllSubscriptions_adminToken_returns200_withMemberIdentityVisible() throws Exception {
        Member member = new Member();
        member.setId(UUID.randomUUID());
        member.setEmail("ada@example.com");

        Subscription subscription = new Subscription();
        subscription.setId(UUID.randomUUID());
        subscription.setMember(member);
        subscription.setStatus(SubscriptionStatus.ACTIVE);

        when(subscriptionRepository.findAll()).thenReturn(List.of(subscription));

        mockMvc.perform(get("/admin/subscriptions").header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].memberEmail", org.hamcrest.Matchers.is("ada@example.com")))
            .andExpect(jsonPath("$[0].status", org.hamcrest.Matchers.is("ACTIVE")));
    }
}
