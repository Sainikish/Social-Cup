package com.socialcup.barista.controller;

import com.socialcup.auth.exception.AccountLockedException;
import com.socialcup.auth.exception.InvalidCredentialsException;
import com.socialcup.barista.dto.BaristaAuthResponse;
import com.socialcup.barista.service.BaristaAuthService;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BaristaAuthController.class)
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
class BaristaAuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BaristaAuthService baristaAuthService;

    @Test
    void login_withValidCredentials_returns200_withAuthResponse() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(baristaAuthService.login(any())).thenReturn(
            BaristaAuthResponse.of("access-token", "refresh-token", 900L, cafeId));

        mockMvc.perform(post("/barista/login")
                .contentType("application/json")
                .content("{\"cafeId\":\"" + cafeId + "\",\"pin\":\"1234\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", is("access-token")))
            .andExpect(jsonPath("$.refreshToken", is("refresh-token")))
            .andExpect(jsonPath("$.tokenType", is("Bearer")))
            .andExpect(jsonPath("$.cafeId", is(cafeId.toString())));
    }

    @Test
    void login_withoutRequestBody_returns400() throws Exception {
        mockMvc.perform(post("/barista/login")
                .contentType("application/json")
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void login_withInvalidCredentials_returns401() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(baristaAuthService.login(any())).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/barista/login")
                .contentType("application/json")
                .content("{\"cafeId\":\"" + cafeId + "\",\"pin\":\"0000\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void login_whenCafePinIsLocked_returns423OrAppropriateLockedStatus() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(baristaAuthService.login(any())).thenThrow(new AccountLockedException());

        mockMvc.perform(post("/barista/login")
                .contentType("application/json")
                .content("{\"cafeId\":\"" + cafeId + "\",\"pin\":\"1234\"}"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void refresh_withValidRefreshToken_returns200_withNewTokens() throws Exception {
        UUID cafeId = UUID.randomUUID();
        when(baristaAuthService.refresh("a-refresh-token")).thenReturn(
            BaristaAuthResponse.of("new-access-token", "new-refresh-token", 900L, cafeId));

        mockMvc.perform(post("/barista/refresh")
                .contentType("application/json")
                .content("{\"refreshToken\":\"a-refresh-token\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", is("new-access-token")))
            .andExpect(jsonPath("$.cafeId", is(cafeId.toString())));
    }
}
