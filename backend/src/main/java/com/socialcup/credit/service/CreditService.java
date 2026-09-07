package com.socialcup.credit.service;

import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.entity.CreditLedger;
import com.socialcup.credit.entity.CreditLedgerType;
import com.socialcup.credit.exception.InsufficientCreditsException;
import com.socialcup.credit.repository.CreditLedgerRepository;
import com.socialcup.user.entity.Member;
import com.socialcup.user.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class CreditService {

    // Fixed by the existing Social Cup business requirement (monthly
    // subscription grant) - never accepted from a caller/client, so an
    // untrusted request can never mint an arbitrary number of credits.
    private static final int MONTHLY_GRANT_AMOUNT = 30;

    private final CreditLedgerRepository creditLedgerRepository;
    private final MemberRepository memberRepository;

    public CreditService(CreditLedgerRepository creditLedgerRepository, MemberRepository memberRepository) {
        this.creditLedgerRepository = creditLedgerRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional(readOnly = true)
    public long getBalance(UUID memberId) {
        return currentBalance(memberId);
    }

    public CreditLedger grantMonthlyCredits(UUID memberId, String reference) {
        Member member = memberRepository.findByIdAndDeletedAtIsNull(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + memberId));

        CreditLedger entry = new CreditLedger();
        entry.setMember(member);
        entry.setAmount(MONTHLY_GRANT_AMOUNT);
        entry.setType(CreditLedgerType.MONTHLY_GRANT);
        entry.setReference(reference);
        return creditLedgerRepository.save(entry);
    }

    // Internal capability for the future Redemption module - deliberately
    // not exposed as a public member-facing endpoint in this phase. A member
    // must never be able to trigger an arbitrary deduction directly; only
    // server-side code (the eventual RedemptionService) should call this.
    //
    // Concurrency: memberRepository.findByIdAndDeletedAtIsNullForUpdate
    // acquires a PESSIMISTIC_WRITE lock on the member row for the duration
    // of this transaction. A second concurrent call for the SAME member
    // blocks at that line until the first call's transaction commits or
    // rolls back - so the balance computed just below can never be stale
    // relative to a deduction that already committed, and two concurrent
    // deductions can never both succeed against the same credits.
    public CreditLedger deductForRedemption(UUID memberId, int amount, String reference) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deduction amount must be positive");
        }

        Member member = memberRepository.findByIdAndDeletedAtIsNullForUpdate(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + memberId));

        long balance = currentBalance(memberId);
        if (balance < amount) {
            throw new InsufficientCreditsException(
                "Member " + memberId + " has insufficient credits: balance=" + balance + ", requested=" + amount);
        }

        CreditLedger entry = new CreditLedger();
        entry.setMember(member);
        entry.setAmount(-amount);
        entry.setType(CreditLedgerType.REDEMPTION);
        entry.setReference(reference);
        return creditLedgerRepository.save(entry);
    }

    private long currentBalance(UUID memberId) {
        Long sum = creditLedgerRepository.sumAmountByMemberId(memberId);
        return sum != null ? sum : 0L;
    }
}
