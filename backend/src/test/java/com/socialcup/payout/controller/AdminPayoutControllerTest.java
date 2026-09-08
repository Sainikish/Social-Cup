package com.socialcup.payout.controller;

import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.payout.dto.PayoutResponse;
import com.socialcup.payout.service.PayoutService;
import com.socialcup.security.JwtAuthenticationFilter;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.RestAccessDeniedHandler;
import com.socialcup.security.RestAuthenticationEntryPoint;
import com.socialcup.security.Roles;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminPayoutController.class)
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
class AdminPayoutControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private PayoutService payoutService;

    private static PayoutResponse aResponse(UUID cafeId) {
        return new PayoutResponse(
            UUID.randomUUID(), cafeId, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31),
            5, 20, new BigDecimal("16.0000"), null, null, null);
    }

    private String adminToken() {
        return tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
    }

    private String memberToken() {
        return tokenProvider.generateAccessToken("member-1", List.of(Roles.MEMBER));
    }

    @Test
    void calculatePayout_unauthenticated_returns401() throws Exception {
        UUID cafeId = UUID.randomUUID();
        mockMvc.perform(post("/admin/cafes/" + cafeId + "/payouts")
                .contentType("application/json")
                .content("{\"periodStart\":\"2026-01-01\",\"periodEnd\":\"2026-01-31\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void calculatePayout_memberToken_returns403() throws Exception {
        UUID cafeId = UUID.randomUUID();
        mockMvc.perform(post("/admin/cafes/" + cafeId + "/payouts")
                .header("Authorization", "Bearer " + memberToken())
                .contentType("application/json")
                .content("{\"periodStart\":\"2026-01-01\",\"periodEnd\":\"2026-01-31\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void calculatePayout_adminToken_returns201() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(payoutService.calculatePayout(eq(cafeId), any())).thenReturn(aResponse(cafeId));

        mockMvc.perform(post("/admin/cafes/" + cafeId + "/payouts")
                .header("Authorization", "Bearer " + adminToken())
                .contentType("application/json")
                .content("{\"periodStart\":\"2026-01-01\",\"periodEnd\":\"2026-01-31\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.totalRedemptions", is(5)))
            .andExpect(jsonPath("$.totalCredits", is(20)));
    }

    @Test
    void calculatePayout_unknownCafe_returns404() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(payoutService.calculatePayout(eq(cafeId), any()))
            .thenThrow(new ResourceNotFoundException("Cafe not found with id: " + cafeId));

        mockMvc.perform(post("/admin/cafes/" + cafeId + "/payouts")
                .header("Authorization", "Bearer " + adminToken())
                .contentType("application/json")
                .content("{\"periodStart\":\"2026-01-01\",\"periodEnd\":\"2026-01-31\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void getPayoutsForCafe_adminToken_returns200() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(payoutService.getPayoutsForCafe(cafeId)).thenReturn(List.of(aResponse(cafeId)));

        mockMvc.perform(get("/admin/cafes/" + cafeId + "/payouts")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].totalRedemptions", is(5)));
    }
}
