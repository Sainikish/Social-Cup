package com.socialcup.admin.dto;

import java.math.BigDecimal;

// Read-only, server-aggregated summary counts/sums over existing persisted
// data (Member/Cafe/Drink/Redemption/Payout) - every value here comes from a
// database COUNT/SUM, never a value accepted from the client, and nothing in
// this feature mutates any of those records. This is exactly the
// member/cafe/drink/redemption/payout summary value set the project calls
// for - there is no pre-existing dashboard-metrics specification anywhere in
// the repo (checked before implementing), so no additional metric beyond
// this set is invented.
public record AdminDashboardMetricsResponse(
    long totalMembers,
    long totalActiveCafes,
    long totalActiveDrinks,
    long totalRedemptions,
    long totalCreditsRedeemed,
    BigDecimal totalPayoutAmountOwed,
    BigDecimal totalPayoutAmountPaid
) {
}
