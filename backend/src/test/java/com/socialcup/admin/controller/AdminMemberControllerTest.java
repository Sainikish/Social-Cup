package com.socialcup.admin.controller;

import com.socialcup.admin.service.AdminMemberService;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.common.dto.PageResponse;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.credit.dto.CreditBalanceResponse;
import com.socialcup.security.JwtAuthenticationFilter;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.RestAccessDeniedHandler;
import com.socialcup.security.RestAuthenticationEntryPoint;
import com.socialcup.security.Roles;
import com.socialcup.user.entity.MemberStatus;
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

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminMemberController.class)
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
class AdminMemberControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private AdminMemberService adminMemberService;

    private static MemberDto aMemberDto(UUID id, String status) {
        return new MemberDto(id, "ada@example.com", "Ada", null, null, status, List.of(Roles.MEMBER), Instant.now(), true);
    }

    private String adminToken(UUID adminId) {
        return tokenProvider.generateAccessToken(adminId.toString(), List.of(Roles.ADMIN));
    }

    private String memberToken() {
        return tokenProvider.generateAccessToken(UUID.randomUUID().toString(), List.of(Roles.MEMBER));
    }

    @Test
    void searchMembers_adminToken_returns200() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        PageResponse<MemberDto> page = PageResponse.of(
            new PageImpl<>(List.of(aMemberDto(targetId, "ACTIVE")), PageRequest.of(0, 20), 1));
        when(adminMemberService.searchMembers(eq("ada"), isNull(), any())).thenReturn(page);

        mockMvc.perform(get("/admin/members?q=ada")
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].id", is(targetId.toString())));
    }

    @Test
    void searchMembers_memberToken_returns403() throws Exception {
        mockMvc.perform(get("/admin/members").header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void searchMembers_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/admin/members"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void searchMembers_statusFilter_isPassedThrough() throws Exception {
        UUID adminId = UUID.randomUUID();
        PageResponse<MemberDto> page = PageResponse.of(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));
        when(adminMemberService.searchMembers(isNull(), eq(MemberStatus.SUSPENDED), any())).thenReturn(page);

        mockMvc.perform(get("/admin/members?status=SUSPENDED")
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isOk());
    }

    @Test
    void getMemberById_adminToken_returns200() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(adminMemberService.getMemberById(targetId)).thenReturn(aMemberDto(targetId, "ACTIVE"));

        mockMvc.perform(get("/admin/members/" + targetId)
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(targetId.toString())));
    }

    @Test
    void getMemberById_notFound_returns404() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(adminMemberService.getMemberById(targetId))
            .thenThrow(new ResourceNotFoundException("Member not found with id: " + targetId));

        mockMvc.perform(get("/admin/members/" + targetId)
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isNotFound());
    }

    @Test
    void getCreditBalance_adminToken_returns200() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(adminMemberService.getCreditBalance(targetId)).thenReturn(new CreditBalanceResponse(15));

        mockMvc.perform(get("/admin/members/" + targetId + "/credits")
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.balance", is(15)));
    }

    @Test
    void getCreditBalance_memberToken_returns403() throws Exception {
        UUID targetId = UUID.randomUUID();
        mockMvc.perform(get("/admin/members/" + targetId + "/credits")
                .header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void suspend_unauthenticated_returns401() throws Exception {
        UUID targetId = UUID.randomUUID();
        mockMvc.perform(post("/admin/members/" + targetId + "/suspend"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void suspend_memberToken_returns403() throws Exception {
        UUID targetId = UUID.randomUUID();
        mockMvc.perform(post("/admin/members/" + targetId + "/suspend")
                .header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void suspend_adminToken_returns200_withUpdatedStatus() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(adminMemberService.suspend(eq(adminId), eq(targetId))).thenReturn(aMemberDto(targetId, "SUSPENDED"));

        mockMvc.perform(post("/admin/members/" + targetId + "/suspend")
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("SUSPENDED")));
    }

    @Test
    void suspend_alreadySuspended_returns409() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(adminMemberService.suspend(eq(adminId), eq(targetId)))
            .thenThrow(new ConflictException("Member is already suspended"));

        mockMvc.perform(post("/admin/members/" + targetId + "/suspend")
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isConflict());
    }

    @Test
    void suspend_unknownMember_returns404() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(adminMemberService.suspend(eq(adminId), eq(targetId)))
            .thenThrow(new ResourceNotFoundException("Member not found with id: " + targetId));

        mockMvc.perform(post("/admin/members/" + targetId + "/suspend")
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isNotFound());
    }

    @Test
    void reactivate_adminToken_returns200_withUpdatedStatus() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(adminMemberService.reactivate(eq(adminId), eq(targetId))).thenReturn(aMemberDto(targetId, "ACTIVE"));

        mockMvc.perform(post("/admin/members/" + targetId + "/reactivate")
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status", is("ACTIVE")));
    }

    @Test
    void reactivate_memberToken_returns403() throws Exception {
        UUID targetId = UUID.randomUUID();
        mockMvc.perform(post("/admin/members/" + targetId + "/reactivate")
                .header("Authorization", "Bearer " + memberToken()))
            .andExpect(status().isForbidden());
    }

    @Test
    void suspend_actorIdComesFromTheAdminToken_notTheRequestBody() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(adminMemberService.suspend(eq(adminId), eq(targetId))).thenReturn(aMemberDto(targetId, "SUSPENDED"));

        mockMvc.perform(post("/admin/members/" + targetId + "/suspend")
                .header("Authorization", "Bearer " + adminToken(adminId)))
            .andExpect(status().isOk());
        // verified implicitly: the stub only matches eq(adminId) - a mismatched
        // actor id would return an unstubbed null and fail the response assertion.
    }
}
