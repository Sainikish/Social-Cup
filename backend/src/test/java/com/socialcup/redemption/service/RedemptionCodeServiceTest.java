package com.socialcup.redemption.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.exception.InsufficientCreditsException;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.redemption.dto.CreateRedemptionCodeRequest;
import com.socialcup.redemption.dto.RedemptionCodeResponse;
import com.socialcup.redemption.entity.RedemptionCode;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedemptionCodeServiceTest {

    private static final UUID MEMBER_ID = UUID.randomUUID();
    private static final UUID DRINK_ID = UUID.randomUUID();
    private static final UUID CAFE_ID = UUID.randomUUID();

    @Mock
    private RedemptionCodeRepository redemptionCodeRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private DrinkRepository drinkRepository;

    @Mock
    private CafeRepository cafeRepository;

    @Mock
    private CreditService creditService;

    private RedemptionCodeService redemptionCodeService;

    @BeforeEach
    void setUp() {
        redemptionCodeService = new RedemptionCodeService(
            redemptionCodeRepository, memberRepository, drinkRepository, cafeRepository, creditService);
    }

    private static Member newMember(UUID id) {
        Member member = new Member();
        member.setId(id);
        member.setEmail("ada@example.com");
        return member;
    }

    private static Cafe newActiveCafe(UUID id) {
        Cafe cafe = new Cafe();
        cafe.setId(id);
        cafe.setName("Blue Bottle Coffee");
        cafe.setStatus(CafeStatus.ACTIVE);
        return cafe;
    }

    private static Drink newActiveDrink(UUID id, Cafe cafe, int creditPrice) {
        Drink drink = new Drink();
        drink.setId(id);
        drink.setCafe(cafe);
        drink.setName("Oat Milk Latte");
        drink.setCreditPrice(creditPrice);
        drink.setStatus(DrinkStatus.ACTIVE);
        return drink;
    }

    private void stubHappyPath(int creditPrice, long balance) {
        stubHappyPath(creditPrice, balance, List.of());
    }

    private void stubHappyPath(int creditPrice, long balance, List<RedemptionCode> existingLiveCodes) {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, creditPrice);

        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(member));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(cafe));
        when(creditService.getBalance(MEMBER_ID)).thenReturn(balance);
        when(redemptionCodeRepository.findAllByMemberIdAndRedeemedFalseAndValidUntilAfter(eq(MEMBER_ID), any()))
            .thenReturn(existingLiveCodes);
        when(redemptionCodeRepository.save(any(RedemptionCode.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ---- Successful generation ----

    @Test
    void generateCode_success_returnsAResponseWithACodeAndBackupCode() {
        stubHappyPath(4, 10L);

        RedemptionCodeResponse response = redemptionCodeService.generateCode(
            MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));

        assertThat(response.code()).isNotBlank();
        assertThat(response.backupCode()).isNotBlank();
        assertThat(response.creditPrice()).isEqualTo(4);
    }

    @Test
    void generateCode_persistsACodeBelongingToTheAuthenticatedMember() {
        stubHappyPath(4, 10L);

        redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));

        ArgumentCaptor<RedemptionCode> captor = ArgumentCaptor.forClass(RedemptionCode.class);
        verify(redemptionCodeRepository).save(captor.capture());
        assertThat(captor.getValue().getMember().getId()).isEqualTo(MEMBER_ID);
    }

    @Test
    void generateCode_associatesTheCorrectDrink() {
        stubHappyPath(4, 10L);

        redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));

        ArgumentCaptor<RedemptionCode> captor = ArgumentCaptor.forClass(RedemptionCode.class);
        verify(redemptionCodeRepository).save(captor.capture());
        assertThat(captor.getValue().getDrink().getId()).isEqualTo(DRINK_ID);
    }

    @Test
    void generateCode_associatesTheCafeDerivedFromTheDrink_notAnArbitraryCafe() {
        stubHappyPath(4, 10L);

        redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));

        ArgumentCaptor<RedemptionCode> captor = ArgumentCaptor.forClass(RedemptionCode.class);
        verify(redemptionCodeRepository).save(captor.capture());
        assertThat(captor.getValue().getCafe().getId()).isEqualTo(CAFE_ID);
    }

    @Test
    void generateCode_setsValidUntilApproximatelyFiveMinutesFromNow() {
        stubHappyPath(4, 10L);

        Instant before = Instant.now();
        redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));
        Instant after = Instant.now();

        ArgumentCaptor<RedemptionCode> captor = ArgumentCaptor.forClass(RedemptionCode.class);
        verify(redemptionCodeRepository).save(captor.capture());
        Instant validUntil = captor.getValue().getValidUntil();
        assertThat(validUntil).isAfterOrEqualTo(before.plusSeconds(295));
        assertThat(validUntil).isBeforeOrEqualTo(after.plusSeconds(305));
    }

    @Test
    void generateCode_startsWithRedeemedFalse() {
        stubHappyPath(4, 10L);

        redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));

        ArgumentCaptor<RedemptionCode> captor = ArgumentCaptor.forClass(RedemptionCode.class);
        verify(redemptionCodeRepository).save(captor.capture());
        assertThat(captor.getValue().isRedeemed()).isFalse();
        assertThat(captor.getValue().getRedeemedAt()).isNull();
    }

    @Test
    void generateCode_memberIdentityComesFromTheParameterSuppliedByTheController_notTheRequestBody() {
        // CreateRedemptionCodeRequest carries no memberId field at all - the only
        // way the service could resolve "which member" is the memberId argument,
        // which the controller derives exclusively from CurrentUserResolver.
        stubHappyPath(4, 10L);

        redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));

        verify(memberRepository).findByIdAndDeletedAtIsNull(MEMBER_ID);
    }

    // ---- Secure code generation ----

    @Test
    void generateCode_twoConsecutiveCalls_produceDifferentUnpredictableCodes() {
        stubHappyPath(4, 10L);

        RedemptionCodeResponse first = redemptionCodeService.generateCode(
            MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));
        RedemptionCodeResponse second = redemptionCodeService.generateCode(
            MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));

        assertThat(first.code()).isNotEqualTo(second.code());
        assertThat(first.backupCode()).isNotEqualTo(second.backupCode());
        // Not derived from any predictable/guessable source.
        assertThat(first.code()).doesNotContain(MEMBER_ID.toString());
        assertThat(first.code()).doesNotContain(DRINK_ID.toString());
    }

    // ---- Single live code rule ----

    @Test
    void generateCode_invalidatesThePreviousLiveCode_bySettingItsValidUntilToNow() {
        RedemptionCode previousLiveCode = new RedemptionCode();
        previousLiveCode.setValidUntil(Instant.now().plusSeconds(120));
        stubHappyPath(4, 10L, List.of(previousLiveCode));

        Instant before = Instant.now();
        redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));
        Instant after = Instant.now();

        assertThat(previousLiveCode.getValidUntil()).isBetween(before, after.plusSeconds(1));
        assertThat(previousLiveCode.isRedeemed()).isFalse();
        verify(redemptionCodeRepository, times(2)).save(any(RedemptionCode.class));
    }

    @Test
    void generateCode_alreadyRedeemedHistoricalCode_isNeverTreatedAsLive_soNothingIsInvalidated() {
        // findAllByMemberIdAndRedeemedFalseAndValidUntilAfter itself excludes
        // redeemed=true rows by construction - a historical redeemed code simply
        // never comes back from that query, so there is nothing for
        // invalidateExistingLiveCodes to touch.
        stubHappyPath(4, 10L);

        redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID));

        verify(redemptionCodeRepository, times(1)).save(any(RedemptionCode.class));
    }

    // ---- Member validity ----

    @Test
    void generateCode_forDeletedOrUnknownMember_throwsResourceNotFound() {
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID)))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(redemptionCodeRepository, never()).save(any());
    }

    // ---- Drink validity ----

    @Test
    void generateCode_forNonexistentDrink_throwsResourceNotFound() {
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID)))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(redemptionCodeRepository, never()).save(any());
    }

    @Test
    void generateCode_forInactiveDrink_throwsConflict() {
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink inactiveDrink = newActiveDrink(DRINK_ID, cafe, 4);
        inactiveDrink.setStatus(DrinkStatus.INACTIVE);

        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(inactiveDrink));

        assertThatThrownBy(() -> redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID)))
            .isInstanceOf(ConflictException.class);

        verify(redemptionCodeRepository, never()).save(any());
    }

    @Test
    void generateCode_whenDrinksCafeIsInactive_throwsConflict() {
        Cafe inactiveCafe = newActiveCafe(CAFE_ID);
        inactiveCafe.setStatus(CafeStatus.INACTIVE);
        Drink drink = newActiveDrink(DRINK_ID, inactiveCafe, 4);

        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(inactiveCafe));

        assertThatThrownBy(() -> redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID)))
            .isInstanceOf(ConflictException.class);

        verify(redemptionCodeRepository, never()).save(any());
    }

    @Test
    void generateCode_whenDrinksCafeIsArchived_throwsConflict() {
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 4);

        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        // An archived cafe simply never resolves via findByIdAndArchivedAtIsNull.
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID)))
            .isInstanceOf(ConflictException.class);

        verify(redemptionCodeRepository, never()).save(any());
    }

    // ---- Credit pre-check ----

    @Test
    void generateCode_withInsufficientCredits_throwsInsufficientCredits_andCreatesNoCode() {
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 10);

        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(newMember(MEMBER_ID)));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(cafe));
        when(creditService.getBalance(MEMBER_ID)).thenReturn(4L);

        assertThatThrownBy(() -> redemptionCodeService.generateCode(MEMBER_ID, new CreateRedemptionCodeRequest(DRINK_ID)))
            .isInstanceOf(InsufficientCreditsException.class);

        verify(redemptionCodeRepository, never()).save(any());
    }
}
