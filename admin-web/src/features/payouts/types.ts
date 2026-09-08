// Mirrors com.socialcup.payout.dto.PayoutResponse exactly - the only
// payout shape either endpoint returns. amountPaid/paymentReference/
// paymentDate are nullable (no NOT NULL constraint on those columns) and,
// per the Phase 6 backend inspection, are never actually written by any
// existing service method - they are always null today. This app must
// display that honestly, never infer "paid" from their absence.
export interface PayoutResponse {
  id: string;
  cafeId: string;
  periodStart: string;
  periodEnd: string;
  totalRedemptions: number;
  totalCredits: number;
  amountOwed: number;
  amountPaid: number | null;
  paymentReference: string | null;
  paymentDate: string | null;
}

// Mirrors com.socialcup.payout.dto.CalculatePayoutRequest exactly - only
// the period boundaries. Every financial figure in the response
// (totalRedemptions, totalCredits, amountOwed) is computed entirely
// server-side from existing redemption records; this app never sends or
// derives any of them.
export interface CalculatePayoutRequest {
  periodStart: string;
  periodEnd: string;
}

// Mirrors com.socialcup.payout.dto.MarkPayoutPaidRequest exactly - the ONLY
// three fields PATCH /admin/cafes/{cafeId}/payouts/{payoutId} accepts.
// There is no field here for amountOwed, totalRedemptions, totalCredits,
// periodStart/periodEnd, or cafe - the request DTO structurally cannot
// carry them, and this app never adds one.
export interface MarkPayoutPaidRequest {
  amountPaid: number;
  paymentReference: string;
  paymentDate: string;
}
