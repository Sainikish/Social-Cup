package com.socialcup.credit.controller;

import com.socialcup.common.exception.GlobalExceptionHandler;
import com.socialcup.common.web.ApiErrorResponseWriter;
import com.socialcup.config.CorsProperties;
import com.socialcup.config.RateLimitProperties;
import com.socialcup.config.SecurityConfig;
import com.socialcup.config.WebConfig;
import com.socialcup.credit.service.CreditService;
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

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserCreditController.class)
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
class UserCreditControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CreditService creditService;

    @Test
    void getMyCreditBalance_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/users/me/credits"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }

    @Test
    void getMyCreditBalance_authenticated_returns200_withBalanceFromTheTokenSubject() throws Exception {
        UUID memberId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));

        when(creditService.getBalance(eq(memberId))).thenReturn(26L);

        mockMvc.perform(get("/users/me/credits").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.balance", is(26)));
    }
}
