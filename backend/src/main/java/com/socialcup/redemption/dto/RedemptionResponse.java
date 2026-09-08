package com.socialcup.redemption.dto;

import com.socialcup.redemption.entity.Redemption;

import java.time.Instant;
import java.util.UUID;

// Deliberately minimal for the barista terminal: no member email, no member id,
// no cafe PIN, no credit ledger internals, no payout rate - just enough to
// confirm what was redeemed and for whom.
public record RedemptionResponse(
    UUID redemptionId,
    UUID drinkId,
    String drinkName,
    int creditsDeducted,
    String memberFirstName,
    Instant redeemedAt
) {
    public static RedemptionResponse fromEntity(Redemption redemption) {
        return new RedemptionResponse(
            redemption.getId(),
            redemption.getDrink().getId(),
            redemption.getDrink().getName(),
            redemption.getCreditsDeducted(),
            redemption.getMember().getFirstName(),
            redemption.getCode().getRedeemedAt()
        );
    }
}
