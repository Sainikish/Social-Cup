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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

// Phase C only: issues the member's redemption code. Deliberately does not
// deduct credits, insert a credit_ledger entry, create a redemption record, or
// ever set redeemed=true - all of that is Phase D's atomic redemption
// transaction, which does not exist yet.
@Service
@Transactional
public class RedemptionCodeService {

    private static final Duration VALIDITY_DURATION = Duration.ofMinutes(5);
    private static final int CODE_RANDOM_BYTES = 24;
    private static final int BACKUP_CODE_BOUND = 1_000_000;

    private final RedemptionCodeRepository redemptionCodeRepository;
    private final MemberRepository memberRepository;
    private final DrinkRepository drinkRepository;
    private final CafeRepository cafeRepository;
    private final CreditService creditService;
    private final SecureRandom secureRandom = new SecureRandom();

    public RedemptionCodeService(RedemptionCodeRepository redemptionCodeRepository,
                                  MemberRepository memberRepository,
                                  DrinkRepository drinkRepository,
                                  CafeRepository cafeRepository,
                                  CreditService creditService) {
        this.redemptionCodeRepository = redemptionCodeRepository;
        this.memberRepository = memberRepository;
        this.drinkRepository = drinkRepository;
        this.cafeRepository = cafeRepository;
        this.creditService = creditService;
    }

    public RedemptionCodeResponse generateCode(UUID memberId, CreateRedemptionCodeRequest request) {
        Member member = memberRepository.findByIdAndDeletedAtIsNull(memberId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + memberId));

        Drink drink = drinkRepository.findByIdAndArchivedAtIsNull(request.drinkId())
            .orElseThrow(() -> new ResourceNotFoundException("Drink not found with id: " + request.drinkId()));

        if (drink.getStatus() != DrinkStatus.ACTIVE) {
            throw new ConflictException("Drink is not currently available for redemption");
        }

        // The cafe association comes from the drink's own database relationship,
        // never from a client-supplied cafe id - see CreateRedemptionCodeRequest.
        // Re-resolved (rather than trusting drink.getCafe() as-is) so the same
        // active/not-archived check BaristaAuthService.login already applies to a
        // cafe is applied here too, using the existing CafeRepository convention.
        Cafe cafe = cafeRepository.findByIdAndArchivedAtIsNull(drink.getCafe().getId())
            .filter(c -> c.getStatus() == CafeStatus.ACTIVE)
            .orElseThrow(() -> new ConflictException("Cafe is not currently available for redemption"));

        // Soft pre-check only, via the existing read-only CreditService.getBalance
        // - no deduction, no ledger entry, no reservation. The authoritative check
        // (and the actual deduction) remains Phase D's atomic redemption transaction.
        long balance = creditService.getBalance(memberId);
        if (balance < drink.getCreditPrice()) {
            throw new InsufficientCreditsException(
                "Member " + memberId + " has insufficient credits: balance=" + balance
                    + ", required=" + drink.getCreditPrice());
        }

        invalidateExistingLiveCodes(memberId);

        Instant now = Instant.now();
        RedemptionCode redemptionCode = new RedemptionCode();
        redemptionCode.setMember(member);
        redemptionCode.setCafe(cafe);
        redemptionCode.setDrink(drink);
        redemptionCode.setCodeValue(generateSecureCode());
        redemptionCode.setBackupCode(generateBackupCode());
        redemptionCode.setValidUntil(now.plus(VALIDITY_DURATION));
        redemptionCode.setRedeemed(false);

        RedemptionCode saved = redemptionCodeRepository.save(redemptionCode);
        return RedemptionCodeResponse.fromEntity(saved);
    }

    // Only one live code may exist per member (see class-level note). A previous
    // live code is never deleted and never rewritten as "redeemed" - it is simply
    // no longer live, represented by moving its own valid_until back to now, the
    // same column/mechanism that already governs whether any code is live.
    private void invalidateExistingLiveCodes(UUID memberId) {
        List<RedemptionCode> liveCodes =
            redemptionCodeRepository.findAllByMemberIdAndRedeemedFalseAndValidUntilAfter(memberId, Instant.now());
        Instant invalidatedAt = Instant.now();
        for (RedemptionCode liveCode : liveCodes) {
            liveCode.setValidUntil(invalidatedAt);
            redemptionCodeRepository.save(liveCode);
        }
    }

    // 192 bits of SecureRandom entropy, URL-safe base64 encoded (~32 characters,
    // well within code_value's VARCHAR(50)) - not derived from the member id, a
    // UUID, a timestamp, or any sequential/database-assigned value.
    private String generateSecureCode() {
        byte[] randomBytes = new byte[CODE_RANDOM_BYTES];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    // Short manual-entry fallback for backup_code (VARCHAR(10), NOT NULL on the
    // existing schema) - a 6-digit number, independently drawn from the same
    // SecureRandom instance as the primary code.
    private String generateBackupCode() {
        int value = secureRandom.nextInt(BACKUP_CODE_BOUND);
        return String.format("%06d", value);
    }
}
