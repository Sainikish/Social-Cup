package com.socialcup.redemption.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.entity.CreditLedger;
import com.socialcup.credit.exception.InsufficientCreditsException;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.redemption.dto.RedemptionResponse;
import com.socialcup.redemption.entity.Redemption;
import com.socialcup.redemption.entity.RedemptionCode;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
import com.socialcup.redemption.repository.RedemptionRepository;
import com.socialcup.user.entity.Member;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
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
class RedemptionServiceTest {

    private static final UUID CAFE_ID = UUID.randomUUID();
    private static final UUID DRINK_ID = UUID.randomUUID();
    private static final UUID MEMBER_ID = UUID.randomUUID();
    private static final String CODE_VALUE = "a-secure-code";

    @Mock
    private RedemptionCodeRepository redemptionCodeRepository;

    @Mock
    private RedemptionRepository redemptionRepository;

    @Mock
    private DrinkRepository drinkRepository;

    @Mock
    private CafeRepository cafeRepository;

    @Mock
    private CreditService creditService;

    private RedemptionService redemptionService;

    @BeforeEach
    void setUp() {
        redemptionService = new RedemptionService(
            redemptionCodeRepository, redemptionRepository, drinkRepository, cafeRepository, creditService);
    }

    private static Member newMember(UUID id) {
        Member member = new Member();
        member.setId(id);
        member.setEmail("ada@example.com");
        member.setFirstName("Ada");
        return member;
    }

    private static Cafe newActiveCafe(UUID id) {
        Cafe cafe = new Cafe();
        cafe.setId(id);
        cafe.setName("Blue Bottle Coffee");
        cafe.setStatus(CafeStatus.ACTIVE);
        cafe.setPayoutRate(new BigDecimal("0.8000"));
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

    private static RedemptionCode newLiveCode(Member member, Cafe cafe, Drink drink) {
        RedemptionCode code = new RedemptionCode();
        code.setId(UUID.randomUUID());
        code.setMember(member);
        code.setCafe(cafe);
        code.setDrink(drink);
        code.setCodeValue(CODE_VALUE);
        code.setBackupCode("042917");
        code.setValidUntil(Instant.now().plusSeconds(120));
        code.setRedeemed(false);
        return code;
    }

    private void stubHappyPath(int creditPrice) {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, creditPrice);
        RedemptionCode code = newLiveCode(member, cafe, drink);

        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(cafe));
        when(creditService.deductForRedemption(eq(MEMBER_ID), eq(creditPrice), eq(code.getId().toString())))
            .thenReturn(new CreditLedger());
        when(redemptionRepository.save(any(Redemption.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(redemptionCodeRepository.save(any(RedemptionCode.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ---- Successful redemption ----

    @Test
    void redeem_success_returnsAResponseDescribingTheRedemption() {
        stubHappyPath(4);

        RedemptionResponse response = redemptionService.redeem(CAFE_ID, CODE_VALUE);

        assertThat(response.drinkId()).isEqualTo(DRINK_ID);
        assertThat(response.drinkName()).isEqualTo("Oat Milk Latte");
        assertThat(response.creditsDeducted()).isEqualTo(4);
        assertThat(response.memberFirstName()).isEqualTo("Ada");
    }

    @Test
    void redeem_success_callsCreditServiceExactlyOnce_withTheCorrectAmountAndReference() {
        stubHappyPath(4);

        redemptionService.redeem(CAFE_ID, CODE_VALUE);

        ArgumentCaptor<String> referenceCaptor = ArgumentCaptor.forClass(String.class);
        verify(creditService, times(1)).deductForRedemption(eq(MEMBER_ID), eq(4), referenceCaptor.capture());
        assertThat(referenceCaptor.getValue()).isNotBlank();
    }

    @Test
    void redeem_success_savesARedemptionWithTheCorrectFieldsAndPayoutSnapshot() {
        stubHappyPath(4);

        redemptionService.redeem(CAFE_ID, CODE_VALUE);

        ArgumentCaptor<Redemption> captor = ArgumentCaptor.forClass(Redemption.class);
        verify(redemptionRepository).save(captor.capture());
        Redemption saved = captor.getValue();
        assertThat(saved.getMember().getId()).isEqualTo(MEMBER_ID);
        assertThat(saved.getCafe().getId()).isEqualTo(CAFE_ID);
        assertThat(saved.getDrink().getId()).isEqualTo(DRINK_ID);
        assertThat(saved.getCreditsDeducted()).isEqualTo(4);
        assertThat(saved.getPayoutRate()).isEqualByComparingTo("0.8000");
    }

    @Test
    void redeem_success_marksTheCodeRedeemed_withATimestamp() {
        stubHappyPath(4);

        redemptionService.redeem(CAFE_ID, CODE_VALUE);

        ArgumentCaptor<RedemptionCode> captor = ArgumentCaptor.forClass(RedemptionCode.class);
        verify(redemptionCodeRepository).save(captor.capture());
        assertThat(captor.getValue().isRedeemed()).isTrue();
        assertThat(captor.getValue().getRedeemedAt()).isNotNull();
    }

    // ---- Unknown / wrong-cafe code ----

    @Test
    void redeem_unknownCode_throwsResourceNotFound() {
        when(redemptionCodeRepository.findByCodeValueForUpdate("does-not-exist")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, "does-not-exist"))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
        verify(redemptionRepository, never()).save(any());
    }

    @Test
    void redeem_codeBelongsToADifferentCafe_throwsResourceNotFound_notRevealingItExistsElsewhere() {
        Member member = newMember(MEMBER_ID);
        Cafe otherCafe = newActiveCafe(UUID.randomUUID());
        Drink drink = newActiveDrink(DRINK_ID, otherCafe, 4);
        RedemptionCode code = newLiveCode(member, otherCafe, drink);
        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, CODE_VALUE))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Redemption code not found");

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    // ---- Expired / already redeemed ----

    @Test
    void redeem_expiredCode_throwsConflict() {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 4);
        RedemptionCode code = newLiveCode(member, cafe, drink);
        code.setValidUntil(Instant.now().minusSeconds(1));
        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, CODE_VALUE))
            .isInstanceOf(ConflictException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    @Test
    void redeem_alreadyRedeemedCode_throwsConflict() {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 4);
        RedemptionCode code = newLiveCode(member, cafe, drink);
        code.setRedeemed(true);
        code.setRedeemedAt(Instant.now().minusSeconds(30));
        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, CODE_VALUE))
            .isInstanceOf(ConflictException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    // ---- Drink validity ----

    @Test
    void redeem_inactiveDrink_throwsConflict() {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink inactiveDrink = newActiveDrink(DRINK_ID, cafe, 4);
        inactiveDrink.setStatus(DrinkStatus.INACTIVE);
        RedemptionCode code = newLiveCode(member, cafe, inactiveDrink);
        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(inactiveDrink));

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, CODE_VALUE))
            .isInstanceOf(ConflictException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    @Test
    void redeem_archivedDrink_throwsConflict() {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 4);
        RedemptionCode code = newLiveCode(member, cafe, drink);
        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));
        // An archived drink simply never resolves via findByIdAndArchivedAtIsNull.
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, CODE_VALUE))
            .isInstanceOf(ConflictException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    // ---- Cafe validity ----

    @Test
    void redeem_inactiveCafe_throwsConflict() {
        Member member = newMember(MEMBER_ID);
        Cafe inactiveCafe = newActiveCafe(CAFE_ID);
        inactiveCafe.setStatus(CafeStatus.INACTIVE);
        Drink drink = newActiveDrink(DRINK_ID, inactiveCafe, 4);
        RedemptionCode code = newLiveCode(member, inactiveCafe, drink);
        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(inactiveCafe));

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, CODE_VALUE))
            .isInstanceOf(ConflictException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    @Test
    void redeem_archivedCafe_throwsConflict() {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 4);
        RedemptionCode code = newLiveCode(member, cafe, drink);
        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        // An archived cafe simply never resolves via findByIdAndArchivedAtIsNull.
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, CODE_VALUE))
            .isInstanceOf(ConflictException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    // ---- Backup-code redemption ----

    @Test
    void redeem_viaBackupCode_success_whenPrimaryLookupFindsNothing() {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 4);
        RedemptionCode code = newLiveCode(member, cafe, drink);
        when(redemptionCodeRepository.findByCodeValueForUpdate("042917")).thenReturn(Optional.empty());
        when(redemptionCodeRepository.findLiveByBackupCodeAndCafeIdForUpdate(eq("042917"), eq(CAFE_ID), any()))
            .thenReturn(java.util.List.of(code));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(cafe));
        when(creditService.deductForRedemption(eq(MEMBER_ID), eq(4), eq(code.getId().toString())))
            .thenReturn(new CreditLedger());
        when(redemptionRepository.save(any(Redemption.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(redemptionCodeRepository.save(any(RedemptionCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RedemptionResponse response = redemptionService.redeem(CAFE_ID, "042917");

        assertThat(response.drinkId()).isEqualTo(DRINK_ID);
        verify(creditService).deductForRedemption(eq(MEMBER_ID), eq(4), any());
    }

    @Test
    void redeem_backupCodeLookup_isNeverCalledWhenThePrimaryLookupAlreadyFoundAMatch() {
        stubHappyPath(4);

        redemptionService.redeem(CAFE_ID, CODE_VALUE);

        verify(redemptionCodeRepository, never())
            .findLiveByBackupCodeAndCafeIdForUpdate(any(), any(), any());
    }

    @Test
    void redeem_backupCode_noLiveMatchAtThisCafe_throwsResourceNotFound() {
        when(redemptionCodeRepository.findByCodeValueForUpdate("042917")).thenReturn(Optional.empty());
        when(redemptionCodeRepository.findLiveByBackupCodeAndCafeIdForUpdate(eq("042917"), eq(CAFE_ID), any()))
            .thenReturn(java.util.List.of());

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, "042917"))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    @Test
    void redeem_backupCode_ambiguousCollisionAcrossTwoLiveCodes_refusesToGuess_throwsResourceNotFound() {
        Member memberA = newMember(MEMBER_ID);
        Member memberB = newMember(UUID.randomUUID());
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 4);
        RedemptionCode codeA = newLiveCode(memberA, cafe, drink);
        RedemptionCode codeB = newLiveCode(memberB, cafe, drink);
        when(redemptionCodeRepository.findByCodeValueForUpdate("042917")).thenReturn(Optional.empty());
        when(redemptionCodeRepository.findLiveByBackupCodeAndCafeIdForUpdate(eq("042917"), eq(CAFE_ID), any()))
            .thenReturn(java.util.List.of(codeA, codeB));

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, "042917"))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(creditService, never()).deductForRedemption(any(), anyInt(), any());
    }

    // ---- Insufficient credits ----

    @Test
    void redeem_insufficientCredits_propagatesException_andCreatesNoRedemption() {
        Member member = newMember(MEMBER_ID);
        Cafe cafe = newActiveCafe(CAFE_ID);
        Drink drink = newActiveDrink(DRINK_ID, cafe, 10);
        RedemptionCode code = newLiveCode(member, cafe, drink);
        when(redemptionCodeRepository.findByCodeValueForUpdate(CODE_VALUE)).thenReturn(Optional.of(code));
        when(drinkRepository.findByIdAndArchivedAtIsNull(DRINK_ID)).thenReturn(Optional.of(drink));
        when(cafeRepository.findByIdAndArchivedAtIsNull(CAFE_ID)).thenReturn(Optional.of(cafe));
        when(creditService.deductForRedemption(eq(MEMBER_ID), eq(10), any()))
            .thenThrow(new InsufficientCreditsException("insufficient credits"));

        assertThatThrownBy(() -> redemptionService.redeem(CAFE_ID, CODE_VALUE))
            .isInstanceOf(InsufficientCreditsException.class);

        verify(redemptionRepository, never()).save(any());
        verify(redemptionCodeRepository, never()).save(any());
    }

    // ---- Member identity ----

    @Test
    void redeem_memberComesExclusivelyFromTheResolvedCode() {
        stubHappyPath(4);

        redemptionService.redeem(CAFE_ID, CODE_VALUE);

        verify(creditService).deductForRedemption(eq(MEMBER_ID), anyInt(), any());
    }

    private static int anyInt() {
        return org.mockito.ArgumentMatchers.anyInt();
    }
}
