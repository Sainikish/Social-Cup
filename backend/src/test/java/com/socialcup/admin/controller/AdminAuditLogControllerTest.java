package com.socialcup.admin.controller;

import com.socialcup.admin.dto.AdminAuditLogResponse;
import com.socialcup.admin.service.AdminAuditLogService;
import com.socialcup.common.dto.PageResponse;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

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

@WebMvcTest(AdminAuditLogController.class)
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
class AdminAuditLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private AdminAuditLogService adminAuditLogService;

    private static AdminAuditLogResponse aResponse(UUID actorId) {
        return new AdminAuditLogResponse(
            UUID.randomUUID(), actorId, "admin@example.com", "MEMBER_SUSPENDED", "member",
            UUID.randomUUID().toString(), "{\"status\":\"ACTIVE\"}", "{\"status\":\"SUSPENDED\"}",
            Instant.parse("2026-01-15T10:00:00Z"));
    }

    private static PageResponse<AdminAuditLogResponse> pageOf(List<AdminAuditLogResponse> content, int page, int size, long total) {
        return PageResponse.of(new PageImpl<>(content, PageRequest.of(page, size), total));
    }

    private String adminToken() {
        return tokenProvider.generateAccessToken("admin-1", List.of(Roles.ADMIN));
    }

    private String memberToken() {
        return tokenProvider.generateAccessToken("member-1", List.of(Roles.MEMBER));
    }

    @Test
    void getAuditLog_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/admin/audit-log"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void getAuditLog_memberToken_returns403() throws Exception {
        mockMvc.perform(get("/admin/audit-log")
                .header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void getAuditLog_adminToken_emptyResult_returns200() throws Exception {
        when(adminAuditLogService.getAuditLog(any(), any(), any(), any(), any(), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/audit-log")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(0)))
            .andExpect(jsonPath("$.totalElements", is(0)))
            .andExpect(jsonPath("$.empty", is(true)));
    }

    @Test
    void getAuditLog_adminToken_populatedResult_returns200WithFields() throws Exception {
        UUID actorId = UUID.randomUUID();
        AdminAuditLogResponse response = aResponse(actorId);
        when(adminAuditLogService.getAuditLog(any(), any(), any(), any(), any(), any()))
            .thenReturn(pageOf(List.of(response), 0, 20, 1));

        mockMvc.perform(get("/admin/audit-log")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", hasSize(1)))
            .andExpect(jsonPath("$.content[0].id", is(response.id().toString())))
            .andExpect(jsonPath("$.content[0].actorId", is(actorId.toString())))
            .andExpect(jsonPath("$.content[0].actorEmail", is("admin@example.com")))
            .andExpect(jsonPath("$.content[0].action", is("MEMBER_SUSPENDED")))
            .andExpect(jsonPath("$.content[0].entityType", is("member")))
            .andExpect(jsonPath("$.content[0].oldValues", is("{\"status\":\"ACTIVE\"}")))
            .andExpect(jsonPath("$.content[0].newValues", is("{\"status\":\"SUSPENDED\"}")))
            .andExpect(jsonPath("$.totalElements", is(1)));
    }

    @Test
    void getAuditLog_pagination_reflectsPageAndSizeInResponse() throws Exception {
        AdminAuditLogResponse response = aResponse(UUID.randomUUID());
        when(adminAuditLogService.getAuditLog(any(), any(), any(), any(), any(), any()))
            .thenReturn(pageOf(List.of(response), 1, 5, 11));

        mockMvc.perform(get("/admin/audit-log?page=1&size=5")
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
    void getAuditLog_actorIdFilter_passedToService() throws Exception {
        UUID actorId = UUID.randomUUID();
        when(adminAuditLogService.getAuditLog(eq(actorId), isNull(), isNull(), isNull(), isNull(), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/audit-log?actorId=" + actorId)
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk());

        verify(adminAuditLogService).getAuditLog(eq(actorId), isNull(), isNull(), isNull(), isNull(), any());
    }

    @Test
    void getAuditLog_entityTypeAndEntityIdFilters_passedToService() throws Exception {
        when(adminAuditLogService.getAuditLog(isNull(), eq("member"), eq("target-1"), isNull(), isNull(), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/audit-log?entityType=member&entityId=target-1")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk());

        verify(adminAuditLogService).getAuditLog(isNull(), eq("member"), eq("target-1"), isNull(), isNull(), any());
    }

    @Test
    void getAuditLog_fromAndToFilters_passedToService() throws Exception {
        when(adminAuditLogService.getAuditLog(isNull(), isNull(), isNull(),
                eq(java.time.LocalDate.of(2026, 1, 1)), eq(java.time.LocalDate.of(2026, 1, 31)), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/audit-log?from=2026-01-01&to=2026-01-31")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk());

        verify(adminAuditLogService).getAuditLog(isNull(), isNull(), isNull(),
            eq(java.time.LocalDate.of(2026, 1, 1)), eq(java.time.LocalDate.of(2026, 1, 31)), any());
    }

    @Test
    void getAuditLog_defaultSort_isCreatedAtDescending() throws Exception {
        when(adminAuditLogService.getAuditLog(any(), any(), any(), any(), any(), any()))
            .thenReturn(pageOf(List.of(), 0, 20, 0));

        mockMvc.perform(get("/admin/audit-log")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isOk());

        verify(adminAuditLogService).getAuditLog(any(), any(), any(), any(), any(),
            org.mockito.ArgumentMatchers.argThat(pageable ->
                pageable.getSort().getOrderFor("createdAt") != null
                    && pageable.getSort().getOrderFor("createdAt").isDescending()));
    }

    @Test
    void getAuditLog_invalidActorIdFormat_returns400() throws Exception {
        mockMvc.perform(get("/admin/audit-log?actorId=not-a-uuid")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("TYPE_MISMATCH")));
    }

    @Test
    void getAuditLog_invalidDateFormat_returns400() throws Exception {
        mockMvc.perform(get("/admin/audit-log?from=not-a-date")
                .header("Authorization", "Bearer " + adminToken()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("TYPE_MISMATCH")));
    }
}
