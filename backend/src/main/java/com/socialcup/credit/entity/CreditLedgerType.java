package com.socialcup.credit.entity;

// The three ledger transaction types supported by the approved Phase A
// credit design. MONTHLY_GRANT and VOID_REVERSAL entries carry a positive
// amount; REDEMPTION entries carry a negative amount (see CreditService).
public enum CreditLedgerType {
    MONTHLY_GRANT,
    REDEMPTION,
    VOID_REVERSAL
}
