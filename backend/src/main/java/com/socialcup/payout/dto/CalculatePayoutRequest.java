package com.socialcup.payout.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

// Admin-triggered, on-demand only - no scheduled job. Only the period
// boundaries are accepted; every financial figure (totals, amount owed) is
// computed server-side from the existing redemption records, never trusted
// from the client.
public record CalculatePayoutRequest(
    @NotNull(message = "Period start is required")
    LocalDate periodStart,

    @NotNull(message = "Period end is required")
    LocalDate periodEnd
) {
}
