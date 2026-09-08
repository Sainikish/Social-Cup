package com.socialcup.redemption.dto;

import jakarta.validation.constraints.NotBlank;

// Deliberately just the code - no memberId, cafeId, drinkId, credit price, or
// payout rate. Member/cafe/drink come from the resolved RedemptionCode itself;
// the cafe performing the redemption comes exclusively from
// CurrentCafeResolver.requireCafeId(authentication), never from this body.
public record RedeemCodeRequest(
    @NotBlank(message = "Code is required")
    String code
) {
}
