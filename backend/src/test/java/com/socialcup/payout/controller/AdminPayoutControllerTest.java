package com.socialcup.payout.controller;

import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.payout.dto.MarkPayoutPaidRequest;
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

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
    void calculatePayout_duplicatePeriod_returns409() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(payoutService.calculatePayout(eq(cafeId), any()))
            .thenThrow(new ConflictException("A payout has already been calculated for this cafe and period"));

        mockMvc.perform(post("/admin/cafes/" + cafeId + "/payouts")
                .header("Authorization", "Bearer " + adminToken())
                .contentType("application/json")
                .content("{\"periodStart\":\"2026-01-01\",\"periodEnd\":\"2026-01-31\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("CONFLICT")));
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

    // --- Cross-cafe payouts (GET /admin/payouts) ---

    @Test
    void getAllPayouts_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/admin/payouts"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getAllPayouts_memberToken_returns403() throws Exception {
        mockMvc.perform(get("/admin/payouts")
                .header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void getAllPayouts_adminToken_emptyResult_returns200() throws Exception {
        when(payoutService.getAllPayouts()).thenReturn(List.of());

        mockMvc.perform(get("/admin/payouts")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void getAllPayouts_adminToken_populatedResult_returns200WithFields() throws Exception {
        UUID cafe1 = UUID.randomUUID();
        UUID cafe2 = UUID.randomUUID();
        when(payoutService.getAllPayouts()).thenReturn(List.of(aResponse(cafe1), aResponse(cafe2)));

        mockMvc.perform(get("/admin/payouts")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].cafeId", is(cafe1.toString())))
            .andExpect(jsonPath("$[1].cafeId", is(cafe2.toString())));
    }

    // --- Mark payout as paid (PATCH /admin/cafes/{cafeId}/payouts/{payoutId}) ---

    @Test
    void markPayoutAsPaid_unauthenticated_returns401() throws Exception {
        UUID cafeId = UUID.randomUUID();
        UUID payoutId = UUID.randomUUID();
        mockMvc.perform(patch("/admin/cafes/" + cafeId + "/payouts/" + payoutId)
                .contentType("application/json")
                .content("{\"amountPaid\":100.00,\"paymentReference\":\"REF123\",\"paymentDate\":\"2026-02-01\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void markPayoutAsPaid_memberToken_returns403() throws Exception {
        UUID cafeId = UUID.randomUUID();
        UUID payoutId = UUID.randomUUID();
        mockMvc.perform(patch("/admin/cafes/" + cafeId + "/payouts/" + payoutId)
                .header("Authorization", "Bearer " + memberToken())
                .contentType("application/json")
                .content("{\"amountPaid\":100.00,\"paymentReference\":\"REF123\",\"paymentDate\":\"2026-02-01\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void markPayoutAsPaid_adminToken_returns200() throws Exception {
        UUID cafeId = UUID.randomUUID();
        UUID payoutId = UUID.randomUUID();
        PayoutResponse paidResponse = new PayoutResponse(
            payoutId, cafeId, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31),
            5, 20, new BigDecimal("16.0000"), new BigDecimal("16.0000"), "ACH-1234", LocalDate.of(2026, 2, 1));

        when(payoutService.markPayoutAsPaid(eq(cafeId), eq(payoutId), any(MarkPayoutPaidRequest.class)))
            .thenReturn(paidResponse);

        mockMvc.perform(patch("/admin/cafes/" + cafeId + "/payouts/" + payoutId)
                .header("Authorization", "Bearer " + adminToken())
                .contentType("application/json")
                .content("{\"amountPaid\":16.00,\"paymentReference\":\"ACH-1234\",\"paymentDate\":\"2026-02-01\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(payoutId.toString())))
            .andExpect(jsonPath("$.amountPaid", is(16.0)))
            .andExpect(jsonPath("$.paymentReference", is("ACH-1234")))
            .andExpect(jsonPath("$.paymentDate", is("2026-02-01")));
    }

    @Test
    void markPayoutAsPaid_unknownPayoutOrWrongCafe_returns404() throws Exception {
        UUID cafeId = UUID.randomUUID();
        UUID payoutId = UUID.randomUUID();
        when(payoutService.markPayoutAsPaid(eq(cafeId), eq(payoutId), any(MarkPayoutPaidRequest.class)))
            .thenThrow(new ResourceNotFoundException("Payout not found with id: " + payoutId + " for cafe: " + cafeId));

        mockMvc.perform(patch("/admin/cafes/" + cafeId + "/payouts/" + payoutId)
                .header("Authorization", "Bearer " + adminToken())
                .contentType("application/json")
                .content("{\"amountPaid\":16.00,\"paymentReference\":\"ACH-1234\",\"paymentDate\":\"2026-02-01\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void markPayoutAsPaid_alreadyPaid_returns409() throws Exception {
        UUID cafeId = UUID.randomUUID();
        UUID payoutId = UUID.randomUUID();
        when(payoutService.markPayoutAsPaid(eq(cafeId), eq(payoutId), any(MarkPayoutPaidRequest.class)))
            .thenThrow(new ConflictException("Payout has already been marked as paid"));

        mockMvc.perform(patch("/admin/cafes/" + cafeId + "/payouts/" + payoutId)
                .header("Authorization", "Bearer " + adminToken())
                .contentType("application/json")
                .content("{\"amountPaid\":16.00,\"paymentReference\":\"ACH-1234\",\"paymentDate\":\"2026-02-01\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("CONFLICT")));
    }

    @Test
    void markPayoutAsPaid_negativeAmount_returns400() throws Exception {
        UUID cafeId = UUID.randomUUID();
        UUID payoutId = UUID.randomUUID();

        mockMvc.perform(patch("/admin/cafes/" + cafeId + "/payouts/" + payoutId)
                .header("Authorization", "Bearer " + adminToken())
                .contentType("application/json")
                .content("{\"amountPaid\":-5.00,\"paymentReference\":\"ACH-1234\",\"paymentDate\":\"2026-02-01\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));
    }

    @Test
    void markPayoutAsPaid_blankReference_returns400() throws Exception {
        UUID cafeId = UUID.randomUUID();
        UUID payoutId = UUID.randomUUID();

        mockMvc.perform(patch("/admin/cafes/" + cafeId + "/payouts/" + payoutId)
                .header("Authorization", "Bearer " + adminToken())
                .contentType("application/json")
                .content("{\"amountPaid\":50.00,\"paymentReference\":\"   \",\"paymentDate\":\"2026-02-01\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));
    }
}
