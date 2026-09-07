package com.socialcup.redemption.dto;

import com.socialcup.redemption.entity.RedemptionCode;

import java.time.Instant;
import java.util.UUID;

// Deliberately omits the redemption_code row's own internal id, member id, and
// redeemed/redeemedAt state - the caller is always the member who just generated
// this code, so none of that adds anything the response needs. code/backupCode
// are the two credentials to present at the cafe; validUntil is the authoritative
// expiration (see RedemptionCodeService); the rest identifies what was selected.
public record RedemptionCodeResponse(
    String code,
    String backupCode,
    Instant validUntil,
    UUID drinkId,
    String drinkName,
    UUID cafeId,
    String cafeName,
    int creditPrice
) {
    public static RedemptionCodeResponse fromEntity(RedemptionCode redemptionCode) {
        return new RedemptionCodeResponse(
            redemptionCode.getCodeValue(),
            redemptionCode.getBackupCode(),
            redemptionCode.getValidUntil(),
            redemptionCode.getDrink().getId(),
            redemptionCode.getDrink().getName(),
            redemptionCode.getCafe().getId(),
            redemptionCode.getCafe().getName(),
            redemptionCode.getDrink().getCreditPrice()
        );
    }
}
