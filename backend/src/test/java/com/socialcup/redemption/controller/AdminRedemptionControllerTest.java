package com.socialcup.redemption.controller;

import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.redemption.dto.AdminRedemptionResponse;
import com.socialcup.redemption.service.RedemptionService;
import com.socialcup.security.JwtAuthenticationFilter;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.RestAccessDeniedHandler;
import com.socialcup.security.RestAuthenticationEntryPoint;
import com.socialcup.security.Roles;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminRedemptionController.class)
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
class AdminRedemptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private RedemptionService redemptionService;

    private static AdminRedemptionResponse aResponse(UUID cafeId, UUID memberId, UUID drinkId) {
        return new AdminRedemptionResponse(
            UUID.randomUUID(), memberId, "ada@example.com", cafeId, "Blue Bottle Coffee",
            drinkId, "Oat Milk Latte", 4, new BigDecimal("0.8000"), Instant.parse("2026-01-15T10:00:00Z"));
    }

    private static PageResponse<AdminRedemptionResponse> pageOf(List<AdminRedemptionResponse> content, int page, int size, long total) {
        return PageResponse.of(new PageImpl<>(content, PageRequest.of(page, size), total));
    }

    private String adminToken() {
        return tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
    }

    private String memberToken() {
        return tokenProvider.generateAccessToken("member-1", List.of(Roles.MEMBER));
    }

    @Test
    void getRedemptions_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/admin/redemptions"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getRedemptions_memberToken_returns403() throws Exception {
        mockMvc.perform(get("/admin/redemptions")
                .header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void getRedemptions_adminToken_emptyResult_returns200() throws Exception {
        when(redemptionService.getRedemptionsForAdmin(any(), any(), any(), any(), any(), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/redemptions")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(0)))
            .andExpect(jsonPath("$.totalElements", is(0)))
            .andExpect(jsonPath("$.empty", is(true)));
    }

    @Test
    void getRedemptions_adminToken_populatedResult_returns200WithFields() throws Exception {
        UUID cafeId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        AdminRedemptionResponse response = aResponse(cafeId, memberId, drinkId);
        when(redemptionService.getRedemptionsForAdmin(any(), any(), any(), any(), any(), any()))
            .thenReturn(pageOf(List.of(response), 0, 20, 1));

        mockMvc.perform(get("/admin/redemptions")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(1)))
            .andExpect(jsonPath("$.content[0].redemptionId", is(response.redemptionId().toString())))
            .andExpect(jsonPath("$.content[0].memberId", is(memberId.toString())))
            .andExpect(jsonPath("$.content[0].memberEmail", is("ada@example.com")))
            .andExpect(jsonPath("$.content[0].cafeId", is(cafeId.toString())))
            .andExpect(jsonPath("$.content[0].cafeName", is("Blue Bottle Coffee")))
            .andExpect(jsonPath("$.content[0].drinkId", is(drinkId.toString())))
            .andExpect(jsonPath("$.content[0].drinkName", is("Oat Milk Latte")))
            .andExpect(jsonPath("$.content[0].creditsDeducted", is(4)))
            .andExpect(jsonPath("$.content[0].payoutRate", is(0.8)))
            .andExpect(jsonPath("$.totalElements", is(1)));
    }

    @Test
    void getRedemptions_pagination_passesPageAndSizeToServiceAndReflectsThemInResponse() throws Exception {
        AdminRedemptionResponse response = aResponse(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
        when(redemptionService.getRedemptionsForAdmin(any(), any(), any(), any(), any(), any()))
            .thenReturn(pageOf(List.of(response), 1, 5, 11));

        mockMvc.perform(get("/admin/redemptions?page=1&size=5")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.page", is(1)))
            .andExpect(jsonPath("$.size", is(5)))
            .andExpect(jsonPath("$.totalElements", is(11)))
            .andExpect(jsonPath("$.totalPages", is(3)))
            .andExpect(jsonPath("$.first", is(false)))
            .andExpect(jsonPath("$.last", is(false)));
    }

    @Test
    void getRedemptions_cafeIdFilter_passedToService() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(redemptionService.getRedemptionsForAdmin(eq(cafeId), isNull(), isNull(), isNull(), isNull(), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/redemptions?cafeId=" + cafeId)
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk());

        verify(redemptionService).getRedemptionsForAdmin(eq(cafeId), isNull(), isNull(), isNull(), isNull(), any());
    }

    @Test
    void getRedemptions_memberIdFilter_passedToService() throws Exception {
        UUID memberId = UUID.randomUUID();
        when(redemptionService.getRedemptionsForAdmin(isNull(), eq(memberId), isNull(), isNull(), isNull(), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/redemptions?memberId=" + memberId)
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk());

        verify(redemptionService).getRedemptionsForAdmin(isNull(), eq(memberId), isNull(), isNull(), isNull(), any());
    }

    @Test
    void getRedemptions_drinkIdFilter_passedToService() throws Exception {
        UUID drinkId = UUID.randomUUID();
        when(redemptionService.getRedemptionsForAdmin(isNull(), isNull(), eq(drinkId), isNull(), isNull(), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/redemptions?drinkId=" + drinkId)
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk());

        verify(redemptionService).getRedemptionsForAdmin(isNull(), isNull(), eq(drinkId), isNull(), isNull(), any());
    }

    @Test
    void getRedemptions_fromAndToFilters_passedToService() throws Exception {
        when(redemptionService.getRedemptionsForAdmin(isNull(), isNull(), isNull(),
                eq(java.time.LocalDate.of(2026, 1, 1)), eq(java.time.LocalDate.of(2026, 1, 31)), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/redemptions?from=2026-01-01&to=2026-01-31")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk());

        verify(redemptionService).getRedemptionsForAdmin(isNull(), isNull(), isNull(),
            eq(java.time.LocalDate.of(2026, 1, 1)), eq(java.time.LocalDate.of(2026, 1, 31)), any());
    }

    @Test
    void getRedemptions_invalidCafeIdFormat_returns400() throws Exception {
        mockMvc.perform(get("/admin/redemptions?cafeId=not-a-uuid")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("TYPE_MISMATCH")));
    }

    @Test
    void getRedemptions_invalidDateFormat_returns400() throws Exception {
        mockMvc.perform(get("/admin/redemptions?from=not-a-date")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("TYPE_MISMATCH")));
    }
}
