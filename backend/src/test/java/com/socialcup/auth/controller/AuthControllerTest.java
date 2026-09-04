package com.socialcup.auth.controller;

import com.socialcup.auth.dto.AuthResponse;
import com.socialcup.auth.dto.LoginRequest;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.auth.dto.RefreshTokenRequest;
import com.socialcup.auth.dto.RegisterRequest;
import com.socialcup.auth.exception.InvalidCredentialsException;
import com.socialcup.auth.service.AuthService;
import com.socialcup.common.exception.ConflictException;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
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
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private AuthService authService;

    @Test
    void register_success_returnsCreated() throws Exception {
        UUID memberId = UUID.randomUUID();
        MemberDto userDto = new MemberDto(memberId, "newuser@example.com", "John", "Doe", null, "VISITOR", List.of(Roles.MEMBER), Instant.now());
        AuthResponse authResponse = AuthResponse.of("mock-access", "mock-refresh", 900, userDto);

        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "newuser@example.com",
                        "password": "strongPassword123",
                        "firstName": "John",
                        "lastName": "Doe"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.accessToken", is("mock-access")))
            .andExpect(jsonPath("$.refreshToken", is("mock-refresh")))
            .andExpect(jsonPath("$.tokenType", is("Bearer")))
            .andExpect(jsonPath("$.expiresIn", is(900)))
            .andExpect(jsonPath("$.user.email", is("newuser@example.com")));
    }

    @Test
    void register_validationFailure_returns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "invalid-email",
                        "password": "short"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
            .andExpect(jsonPath("$.fieldErrors", notNullValue()));
    }

    @Test
    void register_duplicateEmail_returns409Conflict() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
            .thenThrow(new ConflictException("Email already registered: dup@example.com"));

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "dup@example.com",
                        "password": "strongPassword123"
                    }
                    """))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("CONFLICT")))
            .andExpect(jsonPath("$.message", is("Email already registered: dup@example.com")));
    }

    @Test
    void login_success_returns200() throws Exception {
        UUID memberId = UUID.randomUUID();
        MemberDto userDto = new MemberDto(memberId, "user@example.com", "John", "Doe", null, "ACTIVE", List.of(Roles.MEMBER), Instant.now());
        AuthResponse authResponse = AuthResponse.of("access-token", "refresh-token", 900, userDto);

        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "user@example.com",
                        "password": "password123"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", is("access-token")))
            .andExpect(jsonPath("$.user.email", is("user@example.com")));
    }

    @Test
    void login_invalidCredentials_returns401() throws Exception {
        when(authService.login(any(LoginRequest.class)))
            .thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "user@example.com",
                        "password": "wrongpassword"
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("INVALID_CREDENTIALS")));
    }

    @Test
    void refresh_success_returns200() throws Exception {
        UUID memberId = UUID.randomUUID();
        MemberDto userDto = new MemberDto(memberId, "user@example.com", "John", "Doe", null, "ACTIVE", List.of(Roles.MEMBER), Instant.now());
        AuthResponse authResponse = AuthResponse.of("new-access-token", "new-refresh-token", 900, userDto);

        when(authService.refreshToken(any(RefreshTokenRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "refreshToken": "valid-refresh-token"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", is("new-access-token")))
            .andExpect(jsonPath("$.refreshToken", is("new-refresh-token")));
    }

    @Test
    void me_withValidBearerToken_returns200() throws Exception {
        UUID memberId = UUID.randomUUID();
        String token = tokenProvider.generateAccessToken(memberId.toString(), List.of(Roles.MEMBER));

        MemberDto userDto = new MemberDto(memberId, "user@example.com", "John", "Doe", null, "ACTIVE", List.of(Roles.MEMBER), Instant.now());
        when(authService.getCurrentMember(memberId)).thenReturn(userDto);

        mockMvc.perform(get("/auth/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id", is(memberId.toString())))
            .andExpect(jsonPath("$.email", is("user@example.com")))
            .andExpect(jsonPath("$.firstName", is("John")));
    }

    @Test
    void me_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code", is("UNAUTHENTICATED")));
    }
}
