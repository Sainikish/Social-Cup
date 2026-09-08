package com.socialcup.credit.service;

import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.entity.CreditLedger;
import com.socialcup.credit.entity.CreditLedgerType;
import com.socialcup.credit.exception.InsufficientCreditsException;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditServiceTest {

    private static final UUID MEMBER_ID = UUID.randomUUID();

    @Mock
    private CreditLedgerRepository creditLedgerRepository;

    @Mock
    private MemberRepository memberRepository;

    private CreditService creditService;

    @BeforeEach
    void setUp() {
        creditService = new CreditService(creditLedgerRepository, memberRepository);
    }

    private static Member newMember(UUID id) {
        Member member = new Member();
        member.setId(id);
        member.setEmail("ada@example.com");
        return member;
    }

    // ---- Balance ----

    @Test
    void getBalance_withNoLedgerEntries_returnsZero() {
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(0L);

        assertThat(creditService.getBalance(MEMBER_ID)).isZero();
    }

    @Test
    void getBalance_whenRepositoryReturnsNull_stillReturnsZeroNotNull() {
        // Defensive: COALESCE in the repository query should already prevent
        // this, but getBalance must never surface a null/NPE regardless.
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(null);

        assertThat(creditService.getBalance(MEMBER_ID)).isZero();
    }

    @Test
    void getBalance_reflectsAPositiveGrant() {
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(30L);

        assertThat(creditService.getBalance(MEMBER_ID)).isEqualTo(30L);
    }

    @Test
    void getBalance_reflectsTheSumOfMultipleLedgerEntries() {
        // 30 (grant) - 4 (redemption) + 4 (reversal) - 2 (redemption) = 28
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(28L);

        assertThat(creditService.getBalance(MEMBER_ID)).isEqualTo(28L);
    }

    @Test
    void deductForRedemption_decreasesBalance_bySavingANegativeLedgerEntry() {
        Member member = newMember(MEMBER_ID);
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(MEMBER_ID)).thenReturn(Optional.of(member));
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(10L);
        when(creditLedgerRepository.save(any(CreditLedger.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreditLedger saved = creditService.deductForRedemption(MEMBER_ID, 4, "redemption-1");

        assertThat(saved.getAmount()).isEqualTo(-4);
        assertThat(saved.getType()).isEqualTo(CreditLedgerType.REDEMPTION);
        assertThat(saved.getReference()).isEqualTo("redemption-1");
        assertThat(saved.getMember()).isEqualTo(member);
    }

    @Test
    void reversal_isAPositiveEntry_thatIncreasesBalance() {
        // getBalance has no special-casing per type - it only ever sums
        // amounts. A positive VOID_REVERSAL contributes to the balance
        // exactly like a MONTHLY_GRANT would: e.g. 10 (grant) - 4
        // (redemption) + 4 (reversal of that redemption) = 10.
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(10L);

        assertThat(creditService.getBalance(MEMBER_ID)).isEqualTo(10L);
    }

    // ---- Insufficient credits ----

    @Test
    void deductForRedemption_withInsufficientBalance_throwsAndCreatesNoLedgerEntry() {
        Member member = newMember(MEMBER_ID);
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(MEMBER_ID)).thenReturn(Optional.of(member));
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(5L);

        assertThatThrownBy(() -> creditService.deductForRedemption(MEMBER_ID, 6, "redemption-1"))
            .isInstanceOf(InsufficientCreditsException.class);

        verify(creditLedgerRepository, never()).save(any());
        // Balance is unaffected - nothing was ever persisted.
        assertThat(creditService.getBalance(MEMBER_ID)).isEqualTo(5L);
    }

    @Test
    void deductForRedemption_forUnknownMember_throwsResourceNotFound_andCreatesNoLedgerEntry() {
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(MEMBER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> creditService.deductForRedemption(MEMBER_ID, 1, "redemption-1"))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(creditLedgerRepository, never()).save(any());
    }

    // ---- Monthly grant ----

    @Test
    void grantMonthlyCredits_createsAPositiveThirtyCreditEntry_withTheCorrectMemberAndReference() {
        Member member = newMember(MEMBER_ID);
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(member));
        ArgumentCaptor<CreditLedger> captor = ArgumentCaptor.forClass(CreditLedger.class);
        when(creditLedgerRepository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        creditService.grantMonthlyCredits(MEMBER_ID, "subscription-1");

        CreditLedger saved = captor.getValue();
        assertThat(saved.getAmount()).isEqualTo(30);
        assertThat(saved.getType()).isEqualTo(CreditLedgerType.MONTHLY_GRANT);
        assertThat(saved.getMember()).isEqualTo(member);
        assertThat(saved.getReference()).isEqualTo("subscription-1");
    }

    @Test
    void grantMonthlyCredits_forUnknownMember_throwsResourceNotFound() {
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> creditService.grantMonthlyCredits(MEMBER_ID, "subscription-1"))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(creditLedgerRepository, never()).save(any());
    }

    // ---- Reset and grant (Phase E: subscription renewal, non-rollover) ----

    @Test
    void resetAndGrantMonthlyCredits_withNoExistingBalance_onlyInsertsTheGrant_noExpirationRow() {
        Member member = newMember(MEMBER_ID);
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(MEMBER_ID)).thenReturn(Optional.of(member));
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(0L);
        ArgumentCaptor<CreditLedger> captor = ArgumentCaptor.forClass(CreditLedger.class);
        when(creditLedgerRepository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        creditService.resetAndGrantMonthlyCredits(MEMBER_ID, "subscription-1");

        verify(creditLedgerRepository, times(1)).save(any(CreditLedger.class));
        assertThat(captor.getValue().getType()).isEqualTo(CreditLedgerType.MONTHLY_GRANT);
        assertThat(captor.getValue().getAmount()).isEqualTo(30);
    }

    @Test
    void resetAndGrantMonthlyCredits_withALeftoverBalance_expiresItBeforeGranting_enforcingNonRollover() {
        Member member = newMember(MEMBER_ID);
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(MEMBER_ID)).thenReturn(Optional.of(member));
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(12L);
        ArgumentCaptor<CreditLedger> captor = ArgumentCaptor.forClass(CreditLedger.class);
        when(creditLedgerRepository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        creditService.resetAndGrantMonthlyCredits(MEMBER_ID, "subscription-1");

        verify(creditLedgerRepository, times(2)).save(any(CreditLedger.class));
        List<CreditLedger> saved = captor.getAllValues();
        assertThat(saved.get(0).getType()).isEqualTo(CreditLedgerType.EXPIRATION);
        assertThat(saved.get(0).getAmount()).isEqualTo(-12);
        assertThat(saved.get(1).getType()).isEqualTo(CreditLedgerType.MONTHLY_GRANT);
        assertThat(saved.get(1).getAmount()).isEqualTo(30);
    }

    @Test
    void resetAndGrantMonthlyCredits_forUnknownMember_throwsResourceNotFound() {
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(MEMBER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> creditService.resetAndGrantMonthlyCredits(MEMBER_ID, "subscription-1"))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(creditLedgerRepository, never()).save(any());
    }

    // ---- Append-only behavior ----

    @Test
    void creditOperations_neverUpdateOrDeleteAnExistingLedgerEntry() {
        // Every mutation CreditService performs is a brand-new save() of a
        // freshly-constructed CreditLedger (see grantMonthlyCredits and
        // deductForRedemption above) - it never calls delete/deleteById on
        // the repository, which is the only way an existing row could be
        // removed, and there is no update-in-place path at all (save() on a
        // transient, id-less entity is always an INSERT, never an UPDATE).
        Member member = newMember(MEMBER_ID);
        when(memberRepository.findByIdAndDeletedAtIsNull(MEMBER_ID)).thenReturn(Optional.of(member));
        when(memberRepository.findByIdAndDeletedAtIsNullForUpdate(MEMBER_ID)).thenReturn(Optional.of(member));
        when(creditLedgerRepository.sumAmountByMemberId(MEMBER_ID)).thenReturn(30L);
        when(creditLedgerRepository.save(any(CreditLedger.class))).thenAnswer(invocation -> invocation.getArgument(0));

        creditService.grantMonthlyCredits(MEMBER_ID, "subscription-1");
        creditService.deductForRedemption(MEMBER_ID, 4, "redemption-1");

        verify(creditLedgerRepository, never()).delete(any());
        verify(creditLedgerRepository, never()).deleteById(any());
        verify(creditLedgerRepository, never()).deleteAll();
    }
}
