package com.socialcup.auth.service;

import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.auth.dto.AuthResponse;
import com.socialcup.auth.dto.LoginRequest;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.auth.dto.RefreshTokenRequest;
import com.socialcup.auth.dto.RegisterRequest;
import com.socialcup.auth.entity.VerificationCode;
import com.socialcup.auth.entity.VerificationPurpose;
import com.socialcup.auth.exception.AccountLockedException;
import com.socialcup.auth.exception.InvalidCredentialsException;
import com.socialcup.auth.exception.InvalidTokenException;
import com.socialcup.auth.exception.InvalidVerificationCodeException;
import com.socialcup.auth.repository.VerificationCodeRepository;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.email.service.EmailService;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.Roles;
import com.socialcup.subscription.service.SubscriptionService;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberRole;
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

    @Mock
    private SubscriptionService subscriptionService;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private VerificationCodeRepository verificationCodeRepository;

    @Mock
    private EmailService emailService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
            memberRepository, passwordEncoder, tokenProvider, subscriptionService, auditLogRepository,
            verificationCodeRepository, emailService, 15);
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
        // Normal public registration must always create MEMBER - never
        // controllable by RegisterRequest, which has no role field at all.
        assertThat(saved.getRole()).isEqualTo(MemberRole.MEMBER);
        assertThat(response.user().roles()).containsExactly(Roles.MEMBER);
    }

    @Test
    void register_success_alsoIssuesAndSendsAnEmailVerificationCode() {
        RegisterRequest request = new RegisterRequest("user@example.com", "password123", "John", "Doe");
        UUID memberId = UUID.randomUUID();

        when(memberRepository.existsByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> {
            Member m = invocation.getArgument(0);
            m.setId(memberId);
            return m;
        });
        when(tokenProvider.generateAccessToken(any(), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(any())).thenReturn("refresh-token");

        authService.register(request);

        ArgumentCaptor<VerificationCode> captor = ArgumentCaptor.forClass(VerificationCode.class);
        verify(verificationCodeRepository).save(captor.capture());
        VerificationCode saved = captor.getValue();
        assertThat(saved.getPurpose()).isEqualTo(VerificationPurpose.EMAIL_VERIFICATION);
        assertThat(saved.getMember().getId()).isEqualTo(memberId);
        assertThat(saved.getExpiresAt()).isAfter(Instant.now());

        verify(emailService).sendVerificationCode(eq("user@example.com"), anyString());
    }

    // A member must still be able to register even if SES rejects the send
    // (e.g. no real AWS credentials configured yet) - see AuthService's own
    // reasoning on issueAndSendCode.
    @Test
    void register_whenVerificationEmailFailsToSend_stillCompletesRegistration() {
        RegisterRequest request = new RegisterRequest("user@example.com", "password123", "John", "Doe");
        UUID memberId = UUID.randomUUID();

        when(memberRepository.existsByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> {
            Member m = invocation.getArgument(0);
            m.setId(memberId);
            return m;
        });
        when(tokenProvider.generateAccessToken(any(), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(any())).thenReturn("refresh-token");
        org.mockito.Mockito.doThrow(new RuntimeException("SES not configured"))
            .when(emailService).sendVerificationCode(anyString(), anyString());

        AuthResponse response = authService.register(request);

        assertThat(response.accessToken()).isEqualTo("access-token");
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
        assertThat(response.user().roles()).containsExactly(Roles.MEMBER);
        verify(memberRepository).save(member);
    }

    // Proves the JWT role claim is derived from the persisted Member.role,
    // not hardcoded - the one behavior this whole feature exists to add.
    @Test
    void login_adminMember_returnsAdminRoleInTokenAndResponse() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("admin@example.com");
        member.setPasswordHash("hashed-pwd");
        member.setStatus(MemberStatus.ACTIVE);
        member.setRole(MemberRole.ADMIN);

        when(memberRepository.findByEmailAndDeletedAtIsNull("admin@example.com")).thenReturn(Optional.of(member));
        when(passwordEncoder.matches("correct-pwd", "hashed-pwd")).thenReturn(true);
        when(tokenProvider.generateAccessToken(eq(memberId.toString()), eq(List.of(Roles.ADMIN)))).thenReturn("admin-access-token");
        when(tokenProvider.generateRefreshToken(eq(memberId.toString()))).thenReturn("admin-refresh-token");

        LoginRequest request = new LoginRequest("admin@example.com", "correct-pwd");
        AuthResponse response = authService.login(request);

        assertThat(response.accessToken()).isEqualTo("admin-access-token");
        assertThat(response.user().roles()).containsExactly(Roles.ADMIN);
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
        assertThat(response.user().roles()).containsExactly(Roles.MEMBER);
    }

    // Proves refresh re-derives the role from the freshly-loaded, persisted
    // Member row - not from anything carried over in the old refresh token
    // (the mocked Claims here never mention a role at all, exactly like the
    // real refresh token payload doesn't either - see JwtTokenProvider).
    @Test
    void refreshToken_adminMember_returnsAdminRoleInTokenAndResponse() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("admin@example.com");
        member.setStatus(MemberStatus.ACTIVE);
        member.setRole(MemberRole.ADMIN);

        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("REFRESH");
        when(claims.getSubject()).thenReturn(memberId.toString());

        when(tokenProvider.parseClaims("valid-admin-refresh-token")).thenReturn(Optional.of(claims));
        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));
        when(tokenProvider.generateAccessToken(eq(memberId.toString()), eq(List.of(Roles.ADMIN)))).thenReturn("new-admin-access-token");
        when(tokenProvider.generateRefreshToken(eq(memberId.toString()))).thenReturn("new-admin-refresh-token");

        RefreshTokenRequest request = new RefreshTokenRequest("valid-admin-refresh-token");
        AuthResponse response = authService.refreshToken(request);

        assertThat(response.accessToken()).isEqualTo("new-admin-access-token");
        assertThat(response.user().roles()).containsExactly(Roles.ADMIN);
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

    // GET /auth/me must report the member's ACTUAL persisted role, never a
    // hardcoded MEMBER - this is the exact behavior that was broken before
    // this feature.
    @Test
    void getCurrentMember_adminMember_reportsAdminRole() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("admin@example.com");
        member.setStatus(MemberStatus.ACTIVE);
        member.setRole(MemberRole.ADMIN);

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));

        MemberDto dto = authService.getCurrentMember(memberId);

        assertThat(dto.roles()).containsExactly(Roles.ADMIN);
    }

    @Test
    void getCurrentMember_notFound_throwsResourceNotFoundException() {
        UUID memberId = UUID.randomUUID();
        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getCurrentMember(memberId))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- Email verification ----

    private static VerificationCode activeCode(Member member, VerificationPurpose purpose, String codeHash) {
        VerificationCode code = new VerificationCode();
        code.setMember(member);
        code.setPurpose(purpose);
        code.setCodeHash(codeHash);
        code.setExpiresAt(Instant.now().plusSeconds(600));
        return code;
    }

    @Test
    void verifyEmail_success_marksVerifiedAndConsumesTheCode() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("user@example.com");
        member.setEmailVerified(false);
        VerificationCode code = activeCode(member, VerificationPurpose.EMAIL_VERIFICATION, "hashed-code");

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));
        when(verificationCodeRepository.findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                memberId, VerificationPurpose.EMAIL_VERIFICATION))
            .thenReturn(Optional.of(code));
        when(passwordEncoder.matches("123456", "hashed-code")).thenReturn(true);

        MemberDto dto = authService.verifyEmail(memberId, "123456");

        assertThat(dto.emailVerified()).isTrue();
        assertThat(member.isEmailVerified()).isTrue();
        assertThat(member.getEmailVerifiedAt()).isNotNull();
        assertThat(code.getUsedAt()).isNotNull();
        verify(verificationCodeRepository).save(code);
        verify(memberRepository).save(member);
    }

    @Test
    void verifyEmail_alreadyVerified_isIdempotent_andNeverTouchesAnyCode() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmailVerified(true);

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));

        MemberDto dto = authService.verifyEmail(memberId, "123456");

        assertThat(dto.emailVerified()).isTrue();
        verify(verificationCodeRepository, never()).findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(any(), any());
    }

    @Test
    void verifyEmail_noActiveCode_throwsInvalidVerificationCodeException() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));
        when(verificationCodeRepository.findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                memberId, VerificationPurpose.EMAIL_VERIFICATION))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.verifyEmail(memberId, "123456"))
            .isInstanceOf(InvalidVerificationCodeException.class);
    }

    @Test
    void verifyEmail_expiredCode_throwsInvalidVerificationCodeException() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        VerificationCode code = activeCode(member, VerificationPurpose.EMAIL_VERIFICATION, "hashed-code");
        code.setExpiresAt(Instant.now().minusSeconds(1));

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));
        when(verificationCodeRepository.findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                memberId, VerificationPurpose.EMAIL_VERIFICATION))
            .thenReturn(Optional.of(code));

        assertThatThrownBy(() -> authService.verifyEmail(memberId, "123456"))
            .isInstanceOf(InvalidVerificationCodeException.class);
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void verifyEmail_tooManyFailedAttempts_throwsWithoutCheckingTheGuess() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        VerificationCode code = activeCode(member, VerificationPurpose.EMAIL_VERIFICATION, "hashed-code");
        code.setFailedAttempts(5);

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));
        when(verificationCodeRepository.findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                memberId, VerificationPurpose.EMAIL_VERIFICATION))
            .thenReturn(Optional.of(code));

        assertThatThrownBy(() -> authService.verifyEmail(memberId, "123456"))
            .isInstanceOf(InvalidVerificationCodeException.class);
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void verifyEmail_wrongCode_incrementsFailedAttemptsAndThrows() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        VerificationCode code = activeCode(member, VerificationPurpose.EMAIL_VERIFICATION, "hashed-code");

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));
        when(verificationCodeRepository.findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                memberId, VerificationPurpose.EMAIL_VERIFICATION))
            .thenReturn(Optional.of(code));
        when(passwordEncoder.matches("000000", "hashed-code")).thenReturn(false);

        assertThatThrownBy(() -> authService.verifyEmail(memberId, "000000"))
            .isInstanceOf(InvalidVerificationCodeException.class);

        assertThat(code.getFailedAttempts()).isEqualTo(1);
        assertThat(code.getUsedAt()).isNull();
        assertThat(member.isEmailVerified()).isFalse();
        verify(verificationCodeRepository).save(code);
        verify(memberRepository, never()).save(any());
    }

    @Test
    void resendVerificationEmail_success_issuesANewCode() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("user@example.com");
        member.setEmailVerified(false);

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));

        authService.resendVerificationEmail(memberId);

        verify(verificationCodeRepository).save(any(VerificationCode.class));
        verify(emailService).sendVerificationCode(eq("user@example.com"), anyString());
    }

    @Test
    void resendVerificationEmail_alreadyVerified_throwsConflictException() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmailVerified(true);

        when(memberRepository.findByIdAndDeletedAtIsNull(memberId)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> authService.resendVerificationEmail(memberId))
            .isInstanceOf(ConflictException.class);
        verify(emailService, never()).sendVerificationCode(any(), any());
    }

    // ---- Forgot / reset password ----

    @Test
    void forgotPassword_existingMember_issuesAResetCode() {
        Member member = new Member();
        member.setId(UUID.randomUUID());
        member.setEmail("user@example.com");

        when(memberRepository.findByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(Optional.of(member));

        authService.forgotPassword("User@Example.com ");

        ArgumentCaptor<VerificationCode> captor = ArgumentCaptor.forClass(VerificationCode.class);
        verify(verificationCodeRepository).save(captor.capture());
        assertThat(captor.getValue().getPurpose()).isEqualTo(VerificationPurpose.PASSWORD_RESET);
        verify(emailService).sendPasswordResetCode(eq("user@example.com"), anyString());
    }

    // Never reveals whether the email exists - no exception, no email sent,
    // no code issued, identical (empty) outcome either way from the caller's
    // perspective.
    @Test
    void forgotPassword_unknownEmail_doesNothingAndNeverThrows() {
        when(memberRepository.findByEmailAndDeletedAtIsNull(anyString())).thenReturn(Optional.empty());

        authService.forgotPassword("nobody@example.com");

        verify(verificationCodeRepository, never()).save(any());
        verify(emailService, never()).sendPasswordResetCode(any(), any());
    }

    @Test
    void resetPassword_success_setsNewPasswordLogsInAndClearsAnyLockout() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("user@example.com");
        member.setPasswordHash("old-hashed-pwd");
        member.setFailedLoginAttempts(3);
        member.setLockedUntil(Instant.now().plusSeconds(300));
        VerificationCode code = activeCode(member, VerificationPurpose.PASSWORD_RESET, "hashed-code");

        when(memberRepository.findByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(Optional.of(member));
        when(verificationCodeRepository.findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                memberId, VerificationPurpose.PASSWORD_RESET))
            .thenReturn(Optional.of(code));
        when(passwordEncoder.matches("123456", "hashed-code")).thenReturn(true);
        when(passwordEncoder.encode("newpassword123")).thenReturn("new-hashed-pwd");
        when(tokenProvider.generateAccessToken(eq(memberId.toString()), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(eq(memberId.toString()))).thenReturn("refresh-token");

        AuthResponse response = authService.resetPassword("user@example.com", "123456", "newpassword123");

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(member.getPasswordHash()).isEqualTo("new-hashed-pwd");
        assertThat(member.getFailedLoginAttempts()).isZero();
        assertThat(member.getLockedUntil()).isNull();
        assertThat(code.getUsedAt()).isNotNull();
    }

    // Indistinguishable from a wrong code - both throw the exact same
    // exception, so a caller can never learn whether an email is registered.
    @Test
    void resetPassword_unknownEmail_throwsInvalidVerificationCodeException() {
        when(memberRepository.findByEmailAndDeletedAtIsNull(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword("nobody@example.com", "123456", "newpassword123"))
            .isInstanceOf(InvalidVerificationCodeException.class);
    }

    @Test
    void resetPassword_wrongCode_throwsAndNeverChangesThePassword() {
        UUID memberId = UUID.randomUUID();
        Member member = new Member();
        member.setId(memberId);
        member.setEmail("user@example.com");
        member.setPasswordHash("old-hashed-pwd");
        VerificationCode code = activeCode(member, VerificationPurpose.PASSWORD_RESET, "hashed-code");

        when(memberRepository.findByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(Optional.of(member));
        when(verificationCodeRepository.findFirstByMemberIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
                memberId, VerificationPurpose.PASSWORD_RESET))
            .thenReturn(Optional.of(code));
        when(passwordEncoder.matches("000000", "hashed-code")).thenReturn(false);

        assertThatThrownBy(() -> authService.resetPassword("user@example.com", "000000", "newpassword123"))
            .isInstanceOf(InvalidVerificationCodeException.class);

        assertThat(member.getPasswordHash()).isEqualTo("old-hashed-pwd");
        verify(tokenProvider, never()).generateAccessToken(any(), any());
    }

    // ---- Delete account ----

    private static Member deletableMember(UUID id) {
        Member member = new Member();
        member.setId(id);
        member.setEmail("ada@example.com");
        member.setPasswordHash("hashed-pwd");
        member.setFirstName("Ada");
        member.setLastName("Lovelace");
        member.setAvatarUrl("https://example.com/ada.jpg");
        member.setGoogleId("google-123");
        member.setAppleId("apple-123");
        member.setCoffeePreferences("latte,espresso");
        member.setHomeNeighborhood("Downtown");
        member.setStatus(MemberStatus.ACTIVE);
        return member;
    }

    @Test
    void deleteAccount_success_anonymizesPii_setsDeletedAt_andWritesAnAuditLogEntry() {
        UUID memberId = UUID.randomUUID();
        Member member = deletableMember(memberId);
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(memberId)).thenReturn(Optional.of(member));
        when(memberRepository.getReferenceById(memberId)).thenReturn(member);

        authService.deleteAccount(memberId);

        assertThat(member.getEmail()).endsWith("@deleted.socialcup.invalid");
        assertThat(member.getEmail()).isNotEqualTo("ada@example.com");
        assertThat(member.getPasswordHash()).isNull();
        assertThat(member.getFirstName()).isNull();
        assertThat(member.getLastName()).isNull();
        assertThat(member.getAvatarUrl()).isNull();
        assertThat(member.getGoogleId()).isNull();
        assertThat(member.getAppleId()).isNull();
        assertThat(member.getCoffeePreferences()).isNull();
        assertThat(member.getHomeNeighborhood()).isNull();
        assertThat(member.getDeletedAt()).isNotNull();
        verify(memberRepository).save(member);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog auditLog = captor.getValue();
        assertThat(auditLog.getAction()).isEqualTo("MEMBER_ACCOUNT_DELETED");
        assertThat(auditLog.getEntityType()).isEqualTo("member");
        assertThat(auditLog.getEntityId()).isEqualTo(memberId.toString());
    }

    @Test
    void deleteAccount_generatesADifferentPlaceholderEmailEachTime_soTwoDeletedMembersNeverCollide() {
        UUID memberIdA = UUID.randomUUID();
        UUID memberIdB = UUID.randomUUID();
        Member memberA = deletableMember(memberIdA);
        Member memberB = deletableMember(memberIdB);
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(memberIdA)).thenReturn(Optional.of(memberA));
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(memberIdB)).thenReturn(Optional.of(memberB));
        when(memberRepository.getReferenceById(any())).thenReturn(memberA);

        authService.deleteAccount(memberIdA);
        authService.deleteAccount(memberIdB);

        assertThat(memberA.getEmail()).isNotEqualTo(memberB.getEmail());
    }

    @Test
    void deleteAccount_alreadyDeletedOrNonExistentMember_throwsResourceNotFoundException() {
        UUID memberId = UUID.randomUUID();
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(memberId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.deleteAccount(memberId))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(subscriptionService, never()).cancelImmediatelyForAccountDeletion(any());
        verify(memberRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }

    // The internal Stripe-calling behavior (active vs. none vs. already
    // cancelled) is SubscriptionServiceTest's own responsibility - this only
    // proves AuthService always delegates to it, unconditionally, before
    // anonymizing.
    @Test
    void deleteAccount_alwaysDelegatesSubscriptionCancellationToSubscriptionService() {
        UUID memberId = UUID.randomUUID();
        Member member = deletableMember(memberId);
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(memberId)).thenReturn(Optional.of(member));
        when(memberRepository.getReferenceById(memberId)).thenReturn(member);

        authService.deleteAccount(memberId);

        verify(subscriptionService).cancelImmediatelyForAccountDeletion(memberId);
    }

    @Test
    void deleteAccount_whenSubscriptionCancellationFails_rollsBackWithoutAnonymizingOrLoggingAnything() {
        UUID memberId = UUID.randomUUID();
        Member member = deletableMember(memberId);
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(memberId)).thenReturn(Optional.of(member));
        org.mockito.Mockito.doThrow(new ConflictException("Unable to cancel subscription: Stripe unreachable"))
            .when(subscriptionService).cancelImmediatelyForAccountDeletion(memberId);

        assertThatThrownBy(() -> authService.deleteAccount(memberId))
            .isInstanceOf(ConflictException.class);

        assertThat(member.getEmail()).isEqualTo("ada@example.com");
        assertThat(member.getDeletedAt()).isNull();
        verify(memberRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }
}
