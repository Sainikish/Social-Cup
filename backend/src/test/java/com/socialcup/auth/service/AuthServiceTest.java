package com.socialcup.auth.service;

import com.socialcup.auth.dto.AuthResponse;
import com.socialcup.auth.dto.LoginRequest;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.auth.dto.RefreshTokenRequest;
import com.socialcup.auth.dto.RegisterRequest;
import com.socialcup.auth.exception.AccountLockedException;
import com.socialcup.auth.exception.InvalidCredentialsException;
import com.socialcup.auth.exception.InvalidTokenException;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.Roles;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(memberRepository, passwordEncoder, tokenProvider, 15);
    }

    @Test
    void register_success() {
        RegisterRequest request = new RegisterRequest("User@example.com ", "password123", "John", "Doe");
        UUID memberId = UUID.randomUUID();

        when(memberRepository.existsByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-pwd");
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> {
            Member m = invocation.getArgument(0);
            m.setId(memberId);
            return m;
        });
        when(tokenProvider.generateAccessToken(eq(memberId.toString()), eq(List.of(Roles.MEMBER)))).thenReturn("mock-access-token");
        when(tokenProvider.generateRefreshToken(eq(memberId.toString()))).thenReturn("mock-refresh-token");

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.accessToken()).isEqualTo("mock-access-token");
        assertThat(response.refreshToken()).isEqualTo("mock-refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(900L);
        assertThat(response.user().email()).isEqualTo("user@example.com");
        assertThat(response.user().firstName()).isEqualTo("John");
        assertThat(response.user().lastName()).isEqualTo("Doe");
        assertThat(response.user().status()).isEqualTo("VISITOR");

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).save(captor.capture());
        Member saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("user@example.com");
        assertThat(saved.getPasswordHash()).isEqualTo("hashed-pwd");
    }

    @Test
    void register_duplicateEmail_throwsConflictException() {
        RegisterRequest request = new RegisterRequest("existing@example.com", "password123", "John", "Doe");
        when(memberRepository.existsByEmailAndDeletedAtIsNull("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Email already registered: existing@example.com");

        verify(memberRepository, never()).save(any());
    }

    @Test
    void login_success() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("user@example.com");
        member.setPasswordHash("hashed-pwd");
        member.setStatus(MemberStatus.ACTIVE);
        member.setFailedLoginAttempts(2);

        when(memberRepository.findByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("correct-pwd", "hashed-pwd")).thenReturn(true);
        when(tokenProvider.generateAccessToken(eq(memberId.toString()), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(eq(memberId.toString()))).thenReturn("refresh-token");

        LoginRequest request = new LoginRequest("user@example.com", "correct-pwd");
        AuthResponse response = authService.login(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.user().id()).isEqualTo(memberId);
        assertThat(member.getFailedLoginAttempts()).isZero();
        verify(memberRepository).save(member);
    }

    @Test
    void login_userNotFound_throwsInvalidCredentialsException() {
        when(memberRepository.findByEmailAndDeletedAtIsNull(anyString())).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest("unknown@example.com", "pass");

        assertThatThrownBy(() -> authService.login(request))
            .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_wrongPassword_incrementsFailedAttempts() {
        Member member = new Member();
        member.setEmail("user@example.com");
        member.setPasswordHash("hashed-pwd");
        member.setFailedLoginAttempts(1);

        when(memberRepository.findByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("wrong-pwd", "hashed-pwd")).thenReturn(false);

        LoginRequest request = new LoginRequest("user@example.com", "wrong-pwd");

        assertThatThrownBy(() -> authService.login(request))
            .isInstanceOf(InvalidCredentialsException.class);

        assertThat(member.getFailedLoginAttempts()).isEqualTo(2);
        verify(memberRepository).save(member);
    }

    @Test
    void login_fifthFailedAttempt_locksAccount() {
        Member member = new Member();
        member.setEmail("user@example.com");
        member.setPasswordHash("hashed-pwd");
        member.setFailedLoginAttempts(4);

        when(memberRepository.findByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("wrong-pwd", "hashed-pwd")).thenReturn(false);

        LoginRequest request = new LoginRequest("user@example.com", "wrong-pwd");

        assertThatThrownBy(() -> authService.login(request))
            .isInstanceOf(InvalidCredentialsException.class);

        assertThat(member.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(member.getLockedUntil()).isNotNull();
        assertThat(member.isLocked()).isTrue();
        verify(memberRepository).save(member);
    }

    @Test
    void login_lockedAccount_throwsAccountLockedException() {
        Member member = new Member();
        member.setEmail("user@example.com");
        member.setLockedUntil(Instant.now().plusSeconds(300));

        when(memberRepository.findByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(Optional.of(member));

        LoginRequest request = new LoginRequest("user@example.com", "any-pwd");

        assertThatThrownBy(() -> authService.login(request))
            .isInstanceOf(AccountLockedException.class);

        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void refreshToken_success() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("user@example.com");
        member.setStatus(MemberStatus.ACTIVE);

        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("REFRESH");
        when(claims.getSubject()).thenReturn(memberId.toString());

        when(tokenProvider.parseClaims("valid-refresh-token")).thenReturn(Optional.of(claims));
        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));
        when(tokenProvider.generateAccessToken(eq(memberId.toString()), any())).thenReturn("new-access-token");
        when(tokenProvider.generateRefreshToken(eq(memberId.toString()))).thenReturn("new-refresh-token");

        RefreshTokenRequest request = new RefreshTokenRequest("valid-refresh-token");
        AuthResponse response = authService.refreshToken(request);

        assertThat(response.accessToken()).isEqualTo("new-access-token");
        assertThat(response.refreshToken()).isEqualTo("new-refresh-token");
    }

    @Test
    void refreshToken_invalidToken_throwsInvalidTokenException() {
        when(tokenProvider.parseClaims("bad-token")).thenReturn(Optional.empty());

        RefreshTokenRequest request = new RefreshTokenRequest("bad-token");

        assertThatThrownBy(() -> authService.refreshToken(request))
            .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void getCurrentMember_success() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("user@example.com");
        member.setFirstName("John");
        member.setLastName("Doe");
        member.setStatus(MemberStatus.ACTIVE);

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));

        MemberDto dto = authService.getCurrentMember(memberId);

        assertThat(dto.id()).isEqualTo(memberId);
        assertThat(dto.email()).isEqualTo("user@example.com");
        assertThat(dto.firstName()).isEqualTo("John");
        assertThat(dto.roles()).contains(Roles.MEMBER);
    }

    @Test
    void getCurrentMember_notFound_throwsResourceNotFoundException() {
        UUID memberId = UUID.randomUUID();
        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentMember(memberId))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
