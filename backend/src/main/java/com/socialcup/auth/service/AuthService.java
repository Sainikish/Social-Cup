package com.socialcup.auth.service;

import com.socialcup.auth.dto.AuthResponse;
import com.socialcup.auth.dto.LoginRequest;
import com.socialcup.auth.dto.MemberDto;
import com.socialcup.auth.dto.RefreshTokenRequest;
import com.socialcup.auth.dto.RegisterRequest;
import com.socialcup.admin.entity.AuditLog;
import com.socialcup.admin.repository.AuditLogRepository;
import com.socialcup.auth.exception.AccountLockedException;
import com.socialcup.auth.exception.InvalidCredentialsException;
import com.socialcup.auth.exception.InvalidTokenException;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.subscription.service.SubscriptionService;
import com.socialcup.user.entity.Member;
import com.socialcup.user.entity.MemberRole;
import com.socialcup.user.entity.MemberStatus;
import com.socialcup.user.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    private static final String ACTION_ACCOUNT_DELETED = "MEMBER_ACCOUNT_DELETED";
    private static final String ENTITY_TYPE_MEMBER = "member";
    // Never a real, deliverable address - only used so the DB-level UNIQUE
    // constraint on member.email is satisfied by a value that can never
    // collide with another deleted member (a fresh UUID per call) or with a
    // real registration, while freeing the original email up for reuse - see
    // deleteAccount below.
    private static final String DELETED_EMAIL_DOMAIN = "deleted.socialcup.invalid";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final SubscriptionService subscriptionService;
    private final AuditLogRepository auditLogRepository;
    private final long accessTokenExpirySeconds;

    public AuthService(
            MemberRepository memberRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            SubscriptionService subscriptionService,
            AuditLogRepository auditLogRepository,
            @Value("${app.security.jwt.access-token-expiry-minutes:15}") long accessTokenExpiryMinutes) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.subscriptionService = subscriptionService;
        this.auditLogRepository = auditLogRepository;
        this.accessTokenExpirySeconds = accessTokenExpiryMinutes * 60;
    }

    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        if (memberRepository.existsByEmailAndDeletedAtIsNull(normalizedEmail)) {
            throw new ConflictException("Email already registered: " + normalizedEmail);
        }

        Member member = new Member();
        member.setEmail(normalizedEmail);
        member.setPasswordHash(passwordEncoder.encode(request.password()));
        member.setFirstName(request.firstName() != null ? request.firstName().trim() : null);
        member.setLastName(request.lastName() != null ? request.lastName().trim() : null);
        member.setStatus(MemberStatus.VISITOR);
        // RegisterRequest has no role field at all (nothing client-supplied
        // could ever reach this line) - explicit here anyway, the same way
        // status above is explicitly set despite Member.role already
        // defaulting to MEMBER, so this invariant reads as deliberate rather
        // than incidental.
        member.setRole(MemberRole.MEMBER);

        Member savedMember = memberRepository.save(member);
        return generateAuthResponse(savedMember);
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        Member member = memberRepository.findByEmailAndDeletedAtIsNull(normalizedEmail)
            .orElseThrow(InvalidCredentialsException::new);

        if (member.isLocked()) {
            throw new AccountLockedException();
        }

        if (!passwordEncoder.matches(request.password(), member.getPasswordHash())) {
            handleFailedLogin(member);
            throw new InvalidCredentialsException();
        }

        if (member.getFailedLoginAttempts() > 0 || member.getLockedUntil() != null) {
            member.setFailedLoginAttempts(0);
            member.setLockedUntil(null);
            memberRepository.save(member);
        }

        return generateAuthResponse(member);
    }

    public AuthResponse refreshToken(RefreshTokenRequest request) {
        var claimsOpt = tokenProvider.parseClaims(request.refreshToken());
        if (claimsOpt.isEmpty()) {
            throw new InvalidTokenException("Invalid or expired refresh token");
        }

        var claims = claimsOpt.get();
        String tokenType = claims.get("type", String.class);
        if (!JwtTokenProvider.TokenType.REFRESH.name().equals(tokenType)) {
            throw new InvalidTokenException("Provided token is not a refresh token");
        }

        UUID memberId;
        try {
            memberId = UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException e) {
            throw new InvalidTokenException("Malformed subject in refresh token");
        }

        Member member = memberRepository.findByIdAndDeletedAtIsNull(memberId)
            .orElseThrow(() -> new InvalidTokenException("Member not found or deactivated"));

        if (member.isLocked()) {
            throw new AccountLockedException();
        }

        return generateAuthResponse(member);
    }

    @Transactional(readOnly = true)
    public MemberDto getCurrentMember(UUID memberId) {
        Member member = memberRepository.findByIdAndDeletedAtIsNull(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + memberId));
        return MemberDto.fromEntity(member);
    }

    // Soft-delete/anonymize only - the member row itself is never removed,
    // since subscription/credit_ledger/redemption_code/redemption all have an
    // ON DELETE CASCADE foreign key to it (see V001__Initial_Schema.sql) and a
    // real hard delete would silently destroy the historical redemption/payout
    // records cafes' statements depend on. findByIdAndDeletedAtIsNullForUpdate
    // acquires the same PESSIMISTIC_WRITE lock CreditService already uses for
    // this member row, so a concurrent redemption and this deletion serialize
    // against each other: whichever transaction commits first wins, and the
    // other either completes normally (if it got there first) or fails
    // cleanly against the now-deleted row (if this one got there first) -
    // never a partial state.
    public void deleteAccount(UUID memberId) {
        Member member = memberRepository.findByIdAndDeletedAtIsNullForUpdate(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + memberId));

        // Must happen before anonymizing below: an active subscription must
        // never keep billing a card against an account that no longer has a
        // real email/name on file. A Stripe failure here throws and rolls
        // back this entire transaction - nothing is anonymized unless the
        // subscription (if any) was actually cancelled.
        subscriptionService.cancelImmediatelyForAccountDeletion(memberId);

        // A unique, non-guessable, unreachable placeholder - never the
        // original email left in place (member.email has a DB-level UNIQUE
        // constraint, so leaving it would block a real future re-registration
        // with that same address) and never exposed through any API response
        // for a deleted member.
        member.setEmail("deleted-" + UUID.randomUUID() + "@" + DELETED_EMAIL_DOMAIN);
        member.setPasswordHash(null);
        member.setFirstName(null);
        member.setLastName(null);
        member.setAvatarUrl(null);
        member.setGoogleId(null);
        member.setAppleId(null);
        member.setCoffeePreferences(null);
        member.setHomeNeighborhood(null);
        member.setDeletedAt(Instant.now());
        memberRepository.save(member);

        // Historical redemption/credit_ledger/subscription/rating rows are
        // deliberately left completely untouched - see class-level note above.
        AuditLog auditLog = new AuditLog();
        auditLog.setActor(memberRepository.getReferenceById(memberId));
        auditLog.setAction(ACTION_ACCOUNT_DELETED);
        auditLog.setEntityType(ENTITY_TYPE_MEMBER);
        auditLog.setEntityId(memberId.toString());
        auditLogRepository.save(auditLog);
    }

    private void handleFailedLogin(Member member) {
        int attempts = member.getFailedLoginAttempts() + 1;
        member.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            member.setLockedUntil(Instant.now().plus(LOCK_DURATION));
        }
        memberRepository.save(member);
    }

    // The persisted Member.role is the sole source of truth for this claim -
    // never a hardcoded value, and never anything read from a request body
    // or the previous refresh token (refreshToken() above re-reads member
    // fresh from memberRepository before calling this, so a member promoted
    // or demoted since their last token was issued gets the CURRENT role on
    // their very next login or refresh, not a stale one).
    private AuthResponse generateAuthResponse(Member member) {
        List<String> roles = List.of(member.getRole().name());
        String accessToken = tokenProvider.generateAccessToken(member.getId().toString(), roles);
        String refreshToken = tokenProvider.generateRefreshToken(member.getId().toString());
        MemberDto memberDto = MemberDto.fromEntity(member);

        return AuthResponse.of(accessToken, refreshToken, accessTokenExpirySeconds, memberDto);
    }
}
