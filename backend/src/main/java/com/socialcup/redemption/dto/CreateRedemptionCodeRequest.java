package com.socialcup.redemption.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

// Deliberately just the drink id - no memberId (identity comes exclusively from
// CurrentUserResolver.requireMemberId, never the request body) and no cafeId
// (the cafe is derived server-side from the drink's own cafe association, see
// RedemptionCodeService, so there is nothing here for a client-supplied cafeId
// to be safely cross-checked against that the drink lookup doesn't already give us).
public record CreateRedemptionCodeRequest(
    @NotNull(message = "Drink ID is required")
    UUID drinkId
) {
}
