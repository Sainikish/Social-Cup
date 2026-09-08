// Mirrors com.socialcup.credit.dto.CreditBalanceResponse exactly - the only
// shape GET /users/me/credits returns. There is no materialized ledger/
// history endpoint for members (verified against UserCreditController and
// CreditLedgerRepository) - balance is the sole authoritative figure the
// backend exposes.
export interface CreditBalanceResponse {
  balance: number;
}
