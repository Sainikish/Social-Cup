package com.socialcup.credit.dto;

// The authenticated member's own current credit balance - always
// COALESCE(SUM(credit_ledger.amount), 0) for that member (see
// CreditService.getBalance). There is no materialized balance to map from,
// so unlike RatingResponse/etc. there is no fromEntity(...) factory here.
public record CreditBalanceResponse(long balance) {
}
