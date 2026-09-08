// Mirrors com.socialcup.redemption.dto.RedeemCodeRequest exactly - just the
// code, never a cafeId (the backend derives the acting cafe exclusively
// from the authenticated BARISTA JWT - see CurrentCafeResolver).
//
// TODO: Backup-code redemption requires an explicit backend decision.
// Current backend redemption accepts the primary redemption code only -
// RedemptionCodeRepository has no lookup by backup_code at all (verified
// against source). `code` here is always the primary code, whether it came
// from the QR scanner or manual entry (see README.md "Known limitation").
export interface RedeemCodeRequest {
  code: string;
}

// Mirrors com.socialcup.redemption.dto.RedemptionResponse exactly.
export interface RedemptionResponse {
  redemptionId: string;
  drinkId: string;
  drinkName: string;
  creditsDeducted: number;
  memberFirstName: string;
  redeemedAt: string;
}

// The one thing the /result screen actually needs to render: either the
// successful response, or an already-mapped, safe-to-display message. There
// is no "loading"/"idle" case here - that lives in the mutation state the
// screen reads directly (see hooks.ts).
export type RedemptionOutcome =
  | { status: 'success'; data: RedemptionResponse }
  | { status: 'error'; message: string };
