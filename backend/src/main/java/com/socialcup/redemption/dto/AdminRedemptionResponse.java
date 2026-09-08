package com.socialcup.redemption.dto;

import com.socialcup.redemption.entity.Redemption;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

// Full historical detail for admin reporting, unlike the deliberately minimal
// barista-facing RedemptionResponse: exposes memberId/memberEmail/cafeId/
// cafeName/drinkId/drinkName plus the snapshotted payoutRate. Every value here
// is read verbatim from the already-persisted Redemption row (and its
// member/cafe/drink associations) - nothing is recalculated, and this DTO has
// no path back to mutating any of it.
public record AdminRedemptionResponse(
    UUID redemptionId,
    UUID memberId,
    String memberEmail,
    UUID cafeId,
    String cafeName,
    UUID drinkId,
    String drinkName,
    int creditsDeducted,
    BigDecimal payoutRate,
    Instant createdAt
) {
    public static AdminRedemptionResponse fromEntity(Redemption redemption) {
        return new AdminRedemptionResponse(
            redemption.getId(),
            redemption.getMember().getId(),
            redemption.getMember().getEmail(),
            redemption.getCafe().getId(),
            redemption.getCafe().getName(),
            redemption.getDrink().getId(),
            redemption.getDrink().getName(),
            redemption.getCreditsDeducted(),
            redemption.getPayoutRate(),
            redemption.getCreatedAt()
        );
    }
}
