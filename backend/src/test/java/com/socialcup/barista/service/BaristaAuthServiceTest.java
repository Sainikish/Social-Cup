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

        Map<String, Object> expectedClaims = Map.of("cafeId", CAFE_ID.toString(), "pinVersion", 0);
        verify(tokenProvider).generateAccessToken(CAFE_ID.toString(), List.of(Roles.BARISTA), expectedClaims);
        verify(tokenProvider).generateRefreshToken(CAFE_ID.toString(), expectedClaims);
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

    // ---- PIN reset revokes outstanding refresh tokens ----

    @Test
    void refresh_whenTokensPinVersionIsStale_throwsInvalidTokenException() {
        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("REFRESH");
        when(claims.get("cafeId", String.class)).thenReturn(CAFE_ID.toString());
        when(claims.get("pinVersion", Integer.class)).thenReturn(0);
        when(tokenProvider.parseClaims("stale-refresh")).thenReturn(Optional.of(claims));
        CafePin cafePin = newCafePin();
        cafePin.setPinVersion(1);
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(cafePin));

        assertThatThrownBy(() -> baristaAuthService.refresh("stale-refresh"))
            .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void refresh_tokenPredatingThisFeature_hasNoPinVersionClaim_treatedAsZero_stillWorksUntilAReset() {
        Claims claims = mock(Claims.class);
        when(claims.get("type", String.class)).thenReturn("REFRESH");
        when(claims.get("cafeId", String.class)).thenReturn(CAFE_ID.toString());
        when(claims.get("pinVersion", Integer.class)).thenReturn(null);
        when(tokenProvider.parseClaims("pre-existing-refresh")).thenReturn(Optional.of(claims));
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(newCafePin()));
        stubActiveCafe();
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("new-access-token");
        when(tokenProvider.generateRefreshToken(any(), any())).thenReturn("new-refresh-token");

        BaristaAuthResponse response = baristaAuthService.refresh("pre-existing-refresh");

        assertThat(response.accessToken()).isEqualTo("new-access-token");
    }

    // ---- Admin PIN reset ----

    @Test
    void resetPin_forExistingCafePin_generatesANewSixDigitPin_andIncrementsVersion() {
        stubActiveCafe();
        CafePin cafePin = newCafePin();
        cafePin.setPinVersion(2);
        cafePin.setAttempts(3);
        cafePin.setLockedUntil(Instant.now().plusSeconds(60));
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.of(cafePin));
        when(passwordEncoder.encode(any())).thenReturn("new-hashed-pin");

        CafePinResetResponse response = baristaAuthService.resetPin(CAFE_ID);

        assertThat(response.cafeId()).isEqualTo(CAFE_ID);
        assertThat(response.pin()).matches("\\d{6}");
        assertThat(cafePin.getPinHash()).isEqualTo("new-hashed-pin");
        assertThat(cafePin.getPinVersion()).isEqualTo(3);
        assertThat(cafePin.getAttempts()).isZero();
        assertThat(cafePin.getLockedUntil()).isNull();
        verify(cafePinRepository).save(cafePin);
    }

    @Test
    void resetPin_forCafeWithNoExistingPinRow_createsOne_startingAtVersionOne() {
        stubActiveCafe();
        when(cafePinRepository.findByCafeId(CAFE_ID)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("new-hashed-pin");

        CafePinResetResponse response = baristaAuthService.resetPin(CAFE_ID);

        assertThat(response.pin()).matches("\\d{6}");
        org.mockito.ArgumentCaptor<CafePin> captor = org.mockito.ArgumentCaptor.forClass(CafePin.class);
        verify(cafePinRepository).save(captor.capture());
        assertThat(captor.getValue().getPinVersion()).isEqualTo(1);
        assertThat(captor.getValue().getCafe().getId()).isEqualTo(CAFE_ID);
    }

    @Test
    void resetPin_forNonexistentCafe_throwsResourceNotFound() {
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> baristaAuthService.resetPin(CAFE_ID))
            .isInstanceOf(com.socialcup.common.exception.ResourceNotFoundException.class);

        verify(cafePinRepository, never()).save(any());
    }
}
