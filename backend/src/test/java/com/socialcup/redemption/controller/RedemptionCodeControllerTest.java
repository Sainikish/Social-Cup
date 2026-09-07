package com.socialcup.redemption.controller;

import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.credit.exception.InsufficientCreditsException;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.service.RedemptionCodeService;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RedemptionCodeController.class)
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
class RedemptionCodeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private RedemptionCodeService redemptionCodeService;

    private static RedemptionCodeResponse aResponse() {
        return new RedemptionCodeResponse(
            "a-secure-code", "042917", Instant.now().plusSeconds(300),
            UUID.randomUUID(), "Oat Milk Latte", UUID.randomUUID(), "Blue Bottle Coffee", 4);
    }

    @Test
    void createRedemptionCode_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/users/me/redemption-codes")
                .contentType("application/json")
                .content("{\"drinkId\":\"" + UUID.randomUUID() + "\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));

        verify(redemptionCodeService, never()).generateCode(any(), any());
    }

    @Test
    void createRedemptionCode_authenticatedMember_returns201_withTheGeneratedCode() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));
        when(redemptionCodeService.generateCode(eq(memberId), any())).thenReturn(aResponse());

        mockMvc.perform(post("/users/me/redemption-codes")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"drinkId\":\"" + drinkId + "\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code", is("a-secure-code")))
            .andExpect(jsonPath("$.backupCode", is("042917")))
            .andExpect(jsonPath("$.creditPrice", is(4)));

        verify(redemptionCodeService).generateCode(eq(memberId), any());
    }

    @Test
    void createRedemptionCode_withoutDrinkId_returns400() throws Exception {
        UUID memberId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));

        mockMvc.perform(post("/users/me/redemption-codes")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest());

        verify(redemptionCodeService, never()).generateCode(any(), any());
    }

    @Test
    void createRedemptionCode_whenDrinkNotFound_returns404() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));
        when(redemptionCodeService.generateCode(eq(memberId), any()))
            .thenThrow(new ResourceNotFoundException("Drink not found with id: " + drinkId));

        mockMvc.perform(post("/users/me/redemption-codes")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"drinkId\":\"" + drinkId + "\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void createRedemptionCode_whenDrinkUnavailable_returns409() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));
        when(redemptionCodeService.generateCode(eq(memberId), any()))
            .thenThrow(new ConflictException("Drink is not currently available for redemption"));

        mockMvc.perform(post("/users/me/redemption-codes")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"drinkId\":\"" + drinkId + "\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void createRedemptionCode_withInsufficientCredits_returns409() throws Exception {
        UUID memberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));
        when(redemptionCodeService.generateCode(eq(memberId), any()))
            .thenThrow(new InsufficientCreditsException("insufficient credits"));

        mockMvc.perform(post("/users/me/redemption-codes")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"drinkId\":\"" + drinkId + "\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void createRedemptionCode_memberIdComesFromTheToken_notTheRequestBody() throws Exception {
        // The request body below deliberately carries no memberId field at all -
        // CreateRedemptionCodeRequest has no such field to smuggle one through,
        // and the controller resolves identity exclusively via
        // CurrentUserResolver.requireMemberId(authentication).
        UUID tokenMemberId = UUID.randomUUID();
        UUID drinkId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(tokenMemberId.toString(), List.of(Roles.MEMBER));
        when(redemptionCodeService.generateCode(eq(tokenMemberId), any())).thenReturn(aResponse());

        mockMvc.perform(post("/users/me/redemption-codes")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"drinkId\":\"" + drinkId + "\"}"))
            .andExpect(status().isCreated());

        verify(redemptionCodeService).generateCode(eq(tokenMemberId), any());
    }
}
