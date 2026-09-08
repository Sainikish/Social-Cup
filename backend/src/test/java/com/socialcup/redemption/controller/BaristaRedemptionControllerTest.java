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
import com.socialcup.redemption.dto.RedemptionResponse;
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

@WebMvcTest(BaristaRedemptionController.class)
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
class BaristaRedemptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private RedemptionService redemptionService;

    private static RedemptionResponse aResponse() {
        return new RedemptionResponse(
            UUID.randomUUID(), UUID.randomUUID(), "Oat Milk Latte", 4, "Ada", Instant.now());
    }

    private String baristaToken(UUID cafeId) {
        return tokenProvider.generateAccessToken(cafeId.toString(), List.of(Roles.BARISTA));
    }

    @Test
    void redeem_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/barista/redeem")
                .contentType("application/json")
                .content("{\"code\":\"a-secure-code\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));

        verify(redemptionService, never()).redeem(any(), any());
    }

    @Test
    void redeem_memberToken_returns403() throws Exception {
        String memberToken = tokenProvider.generateAccessToken(UUID.randomUUID().toString(), List.of(Roles.MEMBER));

        mockMvc.perform(post("/barista/redeem")
                .header("Authorization", "Bearer " + memberToken)
                .contentType("application/json")
                .content("{\"code\":\"a-secure-code\"}"))
            .andExpect(status().isForbidden());

        verify(redemptionService, never()).redeem(any(), any());
    }

    @Test
    void redeem_baristaTokenWithValidCode_returns200_withTheRedemptionResponse() throws Exception {
        UUID cafeId = UUID.randomUUID();
        String token = baristaToken(cafeId);
        when(redemptionService.redeem(eq(cafeId), eq("a-secure-code"))).thenReturn(aResponse());

        mockMvc.perform(post("/barista/redeem")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"code\":\"a-secure-code\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.drinkName", is("Oat Milk Latte")))
            .andExpect(jsonPath("$.creditsDeducted", is(4)))
            .andExpect(jsonPath("$.memberFirstName", is("Ada")));

        verify(redemptionService).redeem(eq(cafeId), eq("a-secure-code"));
    }

    @Test
    void redeem_unknownCode_returns404() throws Exception {
        UUID cafeId = UUID.randomUUID();
        String token = baristaToken(cafeId);
        when(redemptionService.redeem(eq(cafeId), any()))
            .thenThrow(new ResourceNotFoundException("Redemption code not found"));

        mockMvc.perform(post("/barista/redeem")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"code\":\"does-not-exist\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void redeem_domainConflict_returns409() throws Exception {
        UUID cafeId = UUID.randomUUID();
        String token = baristaToken(cafeId);
        when(redemptionService.redeem(eq(cafeId), any()))
            .thenThrow(new ConflictException("Redemption code has already been redeemed"));

        mockMvc.perform(post("/barista/redeem")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"code\":\"a-secure-code\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void redeem_insufficientCredits_returns409() throws Exception {
        UUID cafeId = UUID.randomUUID();
        String token = baristaToken(cafeId);
        when(redemptionService.redeem(eq(cafeId), any()))
            .thenThrow(new InsufficientCreditsException("insufficient credits"));

        mockMvc.perform(post("/barista/redeem")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"code\":\"a-secure-code\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void redeem_withoutCode_returns400() throws Exception {
        UUID cafeId = UUID.randomUUID();
        String token = baristaToken(cafeId);

        mockMvc.perform(post("/barista/redeem")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest());

        verify(redemptionService, never()).redeem(any(), any());
    }

    @Test
    void redeem_cafeIdComesFromTheBaristaToken_notTheRequestBody() throws Exception {
        // RedeemCodeRequest has no cafeId field at all - the controller resolves
        // the cafe exclusively via CurrentCafeResolver.requireCafeId(authentication).
        UUID tokenCafeId = UUID.randomUUID();
        String token = baristaToken(tokenCafeId);
        when(redemptionService.redeem(eq(tokenCafeId), eq("a-secure-code"))).thenReturn(aResponse());

        mockMvc.perform(post("/barista/redeem")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"code\":\"a-secure-code\"}"))
            .andExpect(status().isOk());

        verify(redemptionService).redeem(eq(tokenCafeId), eq("a-secure-code"));
    }
}
