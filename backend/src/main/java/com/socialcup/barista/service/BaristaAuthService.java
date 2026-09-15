package com.socialcup.barista.service;

import com.socialcup.auth.exception.AccountLockedException;
import com.socialcup.auth.exception.InvalidCredentialsException;
import com.socialcup.auth.exception.InvalidTokenException;
import com.socialcup.barista.dto.BaristaAuthResponse;
import com.socialcup.barista.dto.BaristaLoginRequest;
import com.socialcup.barista.dto.CafePinResetResponse;
import com.socialcup.barista.entity.CafePin;
import com.socialcup.barista.repository.CafePinRepository;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.Roles;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Mirrors AuthService's login/lockout structure and constants exactly
// (MAX_FAILED_ATTEMPTS = 5, LOCK_DURATION = 15 minutes), adapted for a cafe
// PIN instead of a member password. Reuses the same PasswordEncoder bean
// (BCrypt) already configured in SecurityConfig - no second hashing scheme.
@Service
@Transactional
public class BaristaAuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final CafePinRepository cafePinRepository;
    private final CafeRepository cafeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final long accessTokenExpirySeconds;

    public BaristaAuthService(
            CafePinRepository cafePinRepository,
            CafeRepository cafeRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider,
            @Value("${app.security.jwt.access-token-expiry-minutes}") long accessTokenExpiryMinutes) {
        this.cafePinRepository = cafePinRepository;
        this.cafeRepository = cafeRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.accessTokenExpirySeconds = accessTokenExpiryMinutes * 60;
    }

    public BaristaAuthResponse login(BaristaLoginRequest request) {
        // Cafe usability is checked independently via the existing
        // CafeRepository, the same "not found with id: ..." pattern
        // RatingService already uses for drink/member lookups - not by
        // navigating CafePin.getCafe(), so an archived/inactive cafe is
        // rejected even if its cafe_pin row still exists (archiving a cafe
        // never deletes its pin - only a hard delete cascades). Folded into
        // the same generic InvalidCredentialsException as "wrong PIN" below,
        // matching the existing member-login masking: never let a caller
        // distinguish "no such cafe"/"cafe unavailable" from "wrong PIN".
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(request.cafeId())
            .filter(c -> c.getStatus() == CafeStatus.ACTIVE)
            .orElseThrow(InvalidCredentialsException::new);

        CafePin cafePin = cafePinRepository.findByCafeId(request.cafeId())
            .orElseThrow(InvalidCredentialsException::new);

        if (cafePin.isLocked()) {
            throw new AccountLockedException();
        }

        if (!passwordEncoder.matches(request.pin(), cafePin.getPinHash())) {
            handleFailedAttempt(cafePin);
            throw new InvalidCredentialsException();
        }

        if (cafePin.getAttempts() > 0 || cafePin.getLockedUntil() != null) {
            cafePin.setAttempts(0);
            cafePin.setLockedUntil(null);
            cafePinRepository.save(cafePin);
        }

        return generateAuthResponse(cafe.getId(), cafePin.getPinVersion());
    }

    // A separate refresh path, deliberately not folded into the existing
    // /auth/refresh - AuthService.refreshToken unconditionally looks the
    // subject up via memberRepository.findByIdAndDeletedAtIsNull, which
    // would misinterpret a cafe id as a member id (and vice versa). Rather
    // than adding a token "principal type" enum, the "cafeId" claim BOTH
    // barista tokens carry (see generateAuthResponse) IS the distinguishing
    // signal a member refresh token never has - so a member's refresh token
    // presented here is rejected for lacking that claim, without needing to
    // touch AuthService/JwtTokenProvider's existing REFRESH-type handling at
    // all.
    public BaristaAuthResponse refresh(String refreshToken) {
        Claims claims = tokenProvider.parseClaims(refreshToken)
            .orElseThrow(() -> new InvalidTokenException("Invalid or expired refresh token"));

        String tokenType = claims.get("type", String.class);
        if (!JwtTokenProvider.TokenType.REFRESH.name().equals(tokenType)) {
            throw new InvalidTokenException("Provided token is not a refresh token");
        }

        String cafeIdClaim = claims.get("cafeId", String.class);
        if (cafeIdClaim == null) {
            throw new InvalidTokenException("Provided token is not a barista refresh token");
        }

        UUID cafeId;
        try {
            cafeId = UUID.fromString(cafeIdClaim);
        } catch (IllegalArgumentException e) {
            throw new InvalidTokenException("Malformed cafe id in refresh token");
        }

        // Re-validate against current state rather than trusting the old
        // token blindly - mirrors AuthService.refreshToken re-checking
        // memberRepository.findByIdAndDeletedAtIsNull(...)/isLocked() before
        // issuing new tokens.
        CafePin cafePin = cafePinRepository.findByCafeId(cafeId)
            .orElseThrow(() -> new InvalidTokenException("Cafe not found or deactivated"));
        if (cafePin.isLocked()) {
            throw new AccountLockedException();
        }

        // The PIN-reset revocation check (PRD 8.4: "resets a PIN to sign out
        // every trusted device for that cafe at once"). A token minted before
        // this feature existed carries no claim at all, which is treated as
        // version 0 - identical to a cafe_pin row that has never been reset
        // (its column default), so nothing already deployed breaks. Once a
        // reset happens, pin_version increments and every outstanding
        // refresh token's now-stale embedded version stops matching here.
        Integer tokenPinVersion = claims.get("pinVersion", Integer.class);
        int effectiveTokenPinVersion = tokenPinVersion != null ? tokenPinVersion : 0;
        if (effectiveTokenPinVersion != cafePin.getPinVersion()) {
            throw new InvalidTokenException("Cafe PIN has been reset; please log in again");
        }

        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(cafeId)
            .filter(c -> c.getStatus() == CafeStatus.ACTIVE)
            .orElseThrow(() -> new InvalidTokenException("Cafe not found or deactivated"));

        return generateAuthResponse(cafe.getId(), cafePin.getPinVersion());
    }

    // Generates a fresh random 6-digit PIN, invalidating the old one and
    // bumping pin_version so every refresh token already out in the world
    // (every "trusted device") stops working on its next refresh - see
    // refresh()'s version check above. Creates the cafe_pin row if this cafe
    // never had one (a brand new cafe has none until an admin sets its
    // first PIN this same way).
    @Transactional
    public CafePinResetResponse resetPin(UUID cafeId) {
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(cafeId)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + cafeId));

        CafePin cafePin = cafePinRepository.findByCafeId(cafeId).orElseGet(() -> {
            CafePin created = new CafePin();
            created.setCafe(cafe);
            return created;
        });

        String plaintextPin = generateSixDigitPin();
        cafePin.setPinHash(passwordEncoder.encode(plaintextPin));
        cafePin.setPinVersion(cafePin.getPinVersion() + 1);
        cafePin.setAttempts(0);
        cafePin.setLockedUntil(null);
        cafePinRepository.save(cafePin);

        return new CafePinResetResponse(cafeId, plaintextPin);
    }

    private static final SecureRandom PIN_RANDOM = new SecureRandom();

    private String generateSixDigitPin() {
        return String.format("%06d", PIN_RANDOM.nextInt(1_000_000));
    }

    private void handleFailedAttempt(CafePin cafePin) {
        int attempts = cafePin.getAttempts() + 1;
        cafePin.setAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            cafePin.setLockedUntil(Instant.now().plus(LOCK_DURATION));
        }
        cafePinRepository.save(cafePin);
    }

    private BaristaAuthResponse generateAuthResponse(UUID cafeId, int pinVersion) {
        String subject = cafeId.toString();
        Map<String, Object> extraClaims = Map.of("cafeId", subject, "pinVersion", pinVersion);
        String accessToken = tokenProvider.generateAccessToken(subject, List.of(Roles.BARISTA), extraClaims);
        String refreshToken = tokenProvider.generateRefreshToken(subject, extraClaims);
        return BaristaAuthResponse.of(accessToken, refreshToken, accessTokenExpirySeconds, cafeId);
    }
}
