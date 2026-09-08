package com.socialcup.admin.controller;

import com.socialcup.admin.dto.AdminDashboardMetricsResponse;
import com.socialcup.admin.service.AdminDashboardService;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminDashboardController.class)
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
class AdminDashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private AdminDashboardService adminDashboardService;

    private String adminToken() {
        return tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
    }

    private String memberToken() {
        return tokenProvider.generateAccessToken("member-1", List.of(Roles.MEMBER));
    }

    @Test
    void getMetrics_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/admin/dashboard/metrics"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getMetrics_memberToken_returns403() throws Exception {
        mockMvc.perform(get("/admin/dashboard/metrics")
                .header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void getMetrics_adminToken_emptyData_returns200WithAllZeroes() throws Exception {
        when(adminDashboardService.getMetrics()).thenReturn(new AdminDashboardMetricsResponse(
            0, 0, 0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO));

        mockMvc.perform(get("/admin/dashboard/metrics")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalMembers", is(0)))
            .andExpect(jsonPath("$.totalActiveCafes", is(0)))
            .andExpect(jsonPath("$.totalActiveDrinks", is(0)))
            .andExpect(jsonPath("$.totalRedemptions", is(0)))
            .andExpect(jsonPath("$.totalCreditsRedeemed", is(0)))
            .andExpect(jsonPath("$.totalPayoutAmountOwed", is(0)))
            .andExpect(jsonPath("$.totalPayoutAmountPaid", is(0)));
    }

    @Test
    void getMetrics_adminToken_populatedData_returns200WithExactFields() throws Exception {
        when(adminDashboardService.getMetrics()).thenReturn(new AdminDashboardMetricsResponse(
            42, 7, 15, 300, 1200, new BigDecimal("960.00"), new BigDecimal("640.00")));

        mockMvc.perform(get("/admin/dashboard/metrics")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalMembers", is(42)))
            .andExpect(jsonPath("$.totalActiveCafes", is(7)))
            .andExpect(jsonPath("$.totalActiveDrinks", is(15)))
            .andExpect(jsonPath("$.totalRedemptions", is(300)))
            .andExpect(jsonPath("$.totalCreditsRedeemed", is(1200)))
            .andExpect(jsonPath("$.totalPayoutAmountOwed", is(960.0)))
            .andExpect(jsonPath("$.totalPayoutAmountPaid", is(640.0)));
    }
}
