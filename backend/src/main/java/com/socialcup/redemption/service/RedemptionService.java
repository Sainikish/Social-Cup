package com.socialcup.redemption.service;

import com.socialcup.cafe.entity.Cafe;
import com.socialcup.cafe.entity.CafeStatus;
import com.socialcup.cafe.repository.CafeRepository;
import com.socialcup.common.exception.ConflictException;
import com.socialcup.common.exception.ResourceNotFoundException;
import com.socialcup.credit.service.CreditService;
import com.socialcup.drink.entity.Drink;
import com.socialcup.drink.entity.DrinkStatus;
import com.socialcup.drink.repository.DrinkRepository;
import com.socialcup.redemption.dto.RedemptionResponse;
import com.socialcup.redemption.entity.Redemption;
import com.socialcup.redemption.entity.RedemptionCode;
import com.socialcup.redemption.repository.RedemptionCodeRepository;
import com.socialcup.redemption.repository.RedemptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

// Phase D: the atomic redemption transaction. A previously-issued
// RedemptionCode (Phase C) is consumed exactly once, credits are deducted via
// the existing, unmodified CreditService, and a historical Redemption row is
// created with the cafe's payout rate snapshotted at this moment - all inside
// one @Transactional method, so every part of it commits or rolls back
// together.
@Service
@Transactional
public class RedemptionService {

    private final RedemptionCodeRepository redemptionCodeRepository;
    private final RedemptionRepository redemptionRepository;
    private final DrinkRepository drinkRepository;
    private final CafeRepository cafeRepository;
    private final CreditService creditService;

    public RedemptionService(RedemptionCodeRepository redemptionCodeRepository,
                              RedemptionRepository redemptionRepository,
                              DrinkRepository drinkRepository,
                              CafeRepository cafeRepository,
                              CreditService creditService) {
        this.redemptionCodeRepository = redemptionCodeRepository;
        this.redemptionRepository = redemptionRepository;
        this.drinkRepository = drinkRepository;
        this.cafeRepository = cafeRepository;
        this.creditService = creditService;
    }

    public RedemptionResponse redeem(UUID cafeId, String codeValue) {
        // The pessimistic lock on this specific redemption_code row is acquired
        // here, before any redeemed/expiry check - see RedemptionCodeRepository
        // and the class-level concurrency note below. A second concurrent
        // redemption of the SAME code blocks on this exact line until this
        // transaction commits or rolls back.
        RedemptionCode redemptionCode = redemptionCodeRepository.findByCodeValueForUpdate(codeValue)
            .orElseThrow(() -> new ResourceNotFoundException("Redemption code not found"));

        // A code belonging to another cafe is treated identically to an unknown
        // code - never reveal that it exists (and is valid) somewhere else.
        if (!redemptionCode.getCafe().getId().equals(cafeId)) {
            throw new ResourceNotFoundException("Redemption code not found");
        }

        if (redemptionCode.isRedeemed()) {
            throw new ConflictException("Redemption code has already been redeemed");
        }

        if (!redemptionCode.isLive()) {
            throw new ConflictException("Redemption code has expired");
        }

        // Re-resolved fresh rather than trusting the code's cached associations -
        // the drink/cafe could have been deactivated after the code was
        // generated. Same existing active/not-archived lookup pattern
        // RedemptionCodeService already uses.
        Drink drink = drinkRepository.findByIdAndArchivedAtIsNull(redemptionCode.getDrink().getId())
            .filter(d -> d.getStatus() == DrinkStatus.ACTIVE)
            .orElseThrow(() -> new ConflictException("Drink is not currently available for redemption"));

        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(cafeId)
            .filter(c -> c.getStatus() == CafeStatus.ACTIVE)
            .orElseThrow(() -> new ConflictException("Cafe is not currently available for redemption"));

        UUID memberId = redemptionCode.getMember().getId();

        // Unchanged, existing Phase A method: locks the member row, re-verifies
        // the balance from credit_ledger, throws InsufficientCreditsException if
        // short, otherwise inserts the negative REDEMPTION ledger entry. Any
        // exception here rolls back this entire transaction - nothing below is
        // ever persisted.
        creditService.deductForRedemption(memberId, drink.getCreditPrice(), redemptionCode.getId().toString());

        Redemption redemption = new Redemption();
        redemption.setMember(redemptionCode.getMember());
        redemption.setCafe(cafe);
        redemption.setDrink(drink);
        redemption.setCode(redemptionCode);
        redemption.setCreditsDeducted(drink.getCreditPrice());
        redemption.setPayoutRate(cafe.getPayoutRate());
        Redemption savedRedemption = redemptionRepository.save(redemption);

        redemptionCode.setRedeemed(true);
        redemptionCode.setRedeemedAt(Instant.now());
        redemptionCodeRepository.save(redemptionCode);

        return RedemptionResponse.fromEntity(savedRedemption);
    }
}
