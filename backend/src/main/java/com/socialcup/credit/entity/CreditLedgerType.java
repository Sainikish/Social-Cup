package com.socialcup.credit.entity;

// The ledger transaction types supported by the approved credit design.
// MONTHLY_GRANT and VOID_REVERSAL entries carry a positive amount;
// REDEMPTION and EXPIRATION entries carry a negative amount (see
// CreditService).
public enum CreditLedgerType {
    MONTHLY_GRANT,
    REDEMPTION,
    VOID_REVERSAL,
    // Phase E: zeroes a member's balance immediately before a MONTHLY_GRANT
    // on subscription renewal, enforcing non-rollover (see
    // CreditService.resetAndGrantMonthlyCredits). Never used standalone.
    EXPIRATION
}
