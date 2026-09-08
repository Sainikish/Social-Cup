package com.socialcup.payout.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.payout.dto.CalculatePayoutRequest;
import com.socialcup.payout.dto.MarkPayoutPaidRequest;
import com.socialcup.payout.dto.PayoutResponse;
import com.socialcup.payout.entity.Payout;
import com.socialcup.payout.repository.PayoutRepository;
import com.socialcup.redemption.entity.Redemption;
import com.socialcup.redemption.repository.RedemptionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

// Admin-triggered, on-demand only (no @Scheduled job, per the approved Phase E
// decisions) - pure reconciliation/reporting. No money is actually moved
// here; amount_owed is calculated and persisted for a human to act on
// out-of-band. Every figure comes from existing `redemption` rows, each of
// which already carries its own historically-snapshotted payout_rate (Phase
// D) - a later change to Cafe.payoutRate can never retroactively alter a
// payout already calculated from those rows.
@Service
@Transactional
public class PayoutService {

    private final PayoutRepository payoutRepository;
    private final CafeRepository cafeRepository;
    private final RedemptionRepository redemptionRepository;

    public PayoutService(PayoutRepository payoutRepository,
                          CafeRepository cafeRepository,
                          RedemptionRepository redemptionRepository) {
        this.payoutRepository = payoutRepository;
        this.cafeRepository = cafeRepository;
        this.redemptionRepository = redemptionRepository;
    }

    public PayoutResponse calculatePayout(UUID cafeId, CalculatePayoutRequest request) {
        // Not filtered to non-archived: a payout can legitimately be
        // calculated for a cafe that has since closed/archived, to settle a
        // final payment - only a cafe that never existed at all is rejected.
        Cafe cafe = cafeRepository.findById(cafeId)
            .orElseThrow(() -> new ResourceNotFoundException("Cafe not found with id: " + cafeId));

        if (payoutRepository.existsByCafeIdAndPeriodStartAndPeriodEnd(cafeId, request.periodStart(), request.periodEnd())) {
            throw new ConflictException("A payout has already been calculated for this cafe and period");
        }

        Instant periodStartInstant = request.periodStart().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant periodEndExclusive = request.periodEnd().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        List<Redemption> redemptions = redemptionRepository.findAllByCafeIdAndCreatedAtBetween(
            cafeId, periodStartInstant, periodEndExclusive);

        int totalRedemptions = redemptions.size();
        int totalCredits = redemptions.stream().mapToInt(Redemption::getCreditsDeducted).sum();
        BigDecimal amountOwed = redemptions.stream()
            .map(r -> r.getPayoutRate().multiply(BigDecimal.valueOf(r.getCreditsDeducted())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Payout payout = new Payout();
        payout.setCafe(cafe);
        payout.setPeriodStart(request.periodStart());
        payout.setPeriodEnd(request.periodEnd());
        payout.setTotalRedemptions(totalRedemptions);
        payout.setTotalCredits(totalCredits);
        payout.setAmountOwed(amountOwed);

        try {
            Payout saved = payoutRepository.saveAndFlush(payout);
            return PayoutResponse.fromEntity(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("A payout has already been calculated for this cafe and period");
        }
    }

    @Transactional(readOnly = true)
    public List<PayoutResponse> getPayoutsForCafe(UUID cafeId) {
        if (!cafeRepository.existsById(cafeId)) {
            throw new ResourceNotFoundException("Cafe not found with id: " + cafeId);
        }
        return payoutRepository.findAllByCafeId(cafeId).stream()
            .map(PayoutResponse::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PayoutResponse> getAllPayouts() {
        return payoutRepository.findAll().stream()
            .map(PayoutResponse::fromEntity)
            .toList();
    }

    public PayoutResponse markPayoutAsPaid(UUID cafeId, UUID payoutId, MarkPayoutPaidRequest request) {
        if (!cafeRepository.existsById(cafeId)) {
            throw new ResourceNotFoundException("Cafe not found with id: " + cafeId);
        }
        // Pessimistic write lock acquired here, before the already-paid check,
        // so a second concurrent mark-paid call for the SAME payout blocks on
        // this line until this transaction commits or rolls back - it then
        // reads the now-updated row and correctly throws ConflictException
        // below, rather than racing this transaction to also set amountPaid.
        Payout payout = payoutRepository.findByIdAndCafeIdForUpdate(payoutId, cafeId)
            .orElseThrow(() -> new ResourceNotFoundException("Payout not found with id: " + payoutId + " for cafe: " + cafeId));

        if (payout.getAmountPaid() != null) {
            throw new ConflictException("Payout has already been marked as paid");
        }

        payout.setAmountPaid(request.amountPaid());
        payout.setPaymentReference(request.paymentReference());
        payout.setPaymentDate(request.paymentDate());

        Payout saved = payoutRepository.save(payout);
        return PayoutResponse.fromEntity(saved);
    }
}
