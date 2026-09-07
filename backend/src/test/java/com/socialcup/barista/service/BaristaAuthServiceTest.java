package com.socialcup.barista.service;

import com.socialcup.auth.exception.AccountLockedException;
import com.socialcup.auth.exception.InvalidCredentialsException;
import com.socialcup.auth.exception.InvalidTokenException;
import com.socialcup.barista.dto.BaristaAuthResponse;
import com.socialcup.barista.dto.BaristaLoginRequest;
import com.socialcup.barista.entity.CafePin;
import com.socialcup.barista.repository.CafePinRepository;
import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.security.JwtTokenProvider;
import com.socialcup.security.Roles;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BaristaAuthServiceTest {

    private static final UUID CAFE_ID = UUID.randomUUID();

    @Mock
    private CafePinRepository cafePinRepository;

    @Mock
    private CafeRepository cafeRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    private BaristaAuthService baristaAuthService;

    @BeforeEach
    void setUp() {
        baristaAuthService = new BaristaAuthService(cafePinRepository, cafeRepository, passwordEncoder, tokenProvider, 15);
    }

    private static Cafe activeCafe(UUID id) {
        Cafe cafe = new Cafe();
        cafe.setId(id);
        cafe.setName("Blue Bottle Coffee");
        cafe.setStatus(CafeStatus.ACTIVE);
        return cafe;
    }

    private static CafePin newCafePin() {
        CafePin cafePin = new CafePin();
        cafePin.setPinHash("hashed-pin");
        return cafePin;
    }

    private void stubActiveCafe() {
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(activeCafe(CAFE_ID)));
    }

    // ---- Successful login ----

    @Test
    void login_withCorrectCafeIdAndPin_issuesBaristaTokens_andResetsAttempts() {
        stubActiveCafe();
        CafePin cafePin = newCafePin();
        cafePin.setAttempts(3);
        cafePin.setLockedUntil(null);
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(cafePin));
        when(passwordEncoder.matches("1234", "hashed-pin")).thenReturn(true);
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(any(), any())).thenReturn("refresh-token");

        BaristaAuthResponse response = baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "1234"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.cafeId()).isEqualTo(CAFE_ID);
        assertThat(cafePin.getAttempts()).isZero();
        assertThat(cafePin.getLockedUntil()).isNull();
        verify(cafePinRepository).save(cafePin);
    }

    @Test
    void login_success_issuesTokenWithCorrectSubjectRoleAndCafeIdClaim() {
        stubActiveCafe();
        CafePin cafePin = newCafePin();
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(cafePin));
        when(passwordEncoder.matches("1234", "hashed-pin")).thenReturn(true);
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(any(), any())).thenReturn("refresh-token");

        baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "1234"));

        verify(tokenProvider).generateAccessToken(
            CAFE_ID.toString(), List.of(Roles.BARISTA), Map.of("cafeId", CAFE_ID.toString()));
        verify(tokenProvider).generateRefreshToken(CAFE_ID.toString(), Map.of("cafeId", CAFE_ID.toString()));
    }

    // ---- Invalid PIN ----

    @Test
    void login_withWrongPin_throwsInvalidCredentials_andIncrementsAttempts() {
        stubActiveCafe();
        CafePin cafePin = newCafePin();
        cafePin.setAttempts(1);
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(cafePin));
        when(passwordEncoder.matches("0000", "hashed-pin")).thenReturn(false);

        assertThatThrownBy(() -> baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "0000")))
            .isInstanceOf(InvalidCredentialsException.class);

        assertThat(cafePin.getAttempts()).isEqualTo(2);
        verify(cafePinRepository).save(cafePin);
    }

    // ---- Lockout ----

    @Test
    void login_fifthFailedAttempt_locksTheCafePin() {
        stubActiveCafe();
        CafePin cafePin = newCafePin();
        cafePin.setAttempts(4);
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(cafePin));
        when(passwordEncoder.matches("0000", "hashed-pin")).thenReturn(false);

        assertThatThrownBy(() -> baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "0000")))
            .isInstanceOf(InvalidCredentialsException.class);

        assertThat(cafePin.getAttempts()).isEqualTo(5);
        assertThat(cafePin.getLockedUntil()).isNotNull();
        assertThat(cafePin.isLocked()).isTrue();
    }

    @Test
    void login_whenCafePinIsLocked_throwsAccountLockedException_withoutCheckingThePin() {
        stubActiveCafe();
        CafePin cafePin = newCafePin();
        cafePin.setLockedUntil(Instant.now().plusSeconds(300));
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(cafePin));

        assertThatThrownBy(() -> baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "1234")))
            .isInstanceOf(AccountLockedException.class);

        verify(passwordEncoder, never()).matches(any(), any());
    }

    // ---- Lockout expiration ----

    @Test
    void login_afterLockExpires_permitsAuthenticationAgain() {
        stubActiveCafe();
        CafePin cafePin = newCafePin();
        cafePin.setLockedUntil(Instant.now().minusSeconds(1));
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(cafePin));
        when(passwordEncoder.matches("1234", "hashed-pin")).thenReturn(true);
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("access-token");
        when(tokenProvider.generateRefreshToken(any(), any())).thenReturn("refresh-token");

        BaristaAuthResponse response = baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "1234"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(cafePin.getLockedUntil()).isNull();
    }

    // ---- Cafe validity ----

    @Test
    void login_forNonexistentCafe_throwsInvalidCredentials() {
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "1234")))
            .isInstanceOf(InvalidCredentialsException.class);

        verify(cafePinRepository, never()).findByCafeId(any());
    }

    @Test
    void login_forInactiveCafe_throwsInvalidCredentials() {
        Cafe inactiveCafe = activeCafe(CAFE_ID);
        inactiveCafe.setStatus(CafeStatus.INACTIVE);
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(inactiveCafe));

        assertThatThrownBy(() -> baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "1234")))
            .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_forArchivedCafe_throwsInvalidCredentials() {
        // findByIdAndArchivedAtIsNull already excludes archived cafes at the
        // repository level - an archived cafe simply never resolves here.
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> baristaAuthService.login(new BaristaLoginRequest(CAFE_ID, "1234")))
            .isInstanceOf(InvalidCredentialsException.class);
    }

    // ---- Refresh ----

    @Test
    void refresh_withValidBaristaRefreshToken_issuesNewTokens() {
        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("REFRESH");
        when(claims.get("cafeId", String.class)).thenReturn(CAFE_ID.toString());
        when(tokenProvider.parseClaims("valid-refresh")).thenReturn(Optional.of(claims));
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(newCafePin()));
        stubActiveCafe();
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("new-access-token");
        when(tokenProvider.generateRefreshToken(any(), any())).thenReturn("new-refresh-token");

        BaristaAuthResponse response = baristaAuthService.refresh("valid-refresh");

        assertThat(response.accessToken()).isEqualTo("new-access-token");
        assertThat(response.cafeId()).isEqualTo(CAFE_ID);
    }

    @Test
    void refresh_withMemberRefreshToken_isRejected_becauseItHasNoCafeIdClaim() {
        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("REFRESH");
        when(claims.get("cafeId", String.class)).thenReturn(null);
        when(tokenProvider.parseClaims("member-refresh")).thenReturn(Optional.of(claims));

        assertThatThrownBy(() -> baristaAuthService.refresh("member-refresh"))
            .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void refresh_withInvalidToken_throwsInvalidTokenException() {
        when(tokenProvider.parseClaims("bad-token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> baristaAuthService.refresh("bad-token"))
            .isInstanceOf(InvalidTokenException.class);
    }
}
