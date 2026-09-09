// Mirrors com.socialcup.redemption.dto.RedeemCodeRequest exactly - just the
// code, never a cafeId (the backend derives the acting cafe exclusively
// from the authenticated BARISTA JWT - see CurrentCafeResolver).
//
// `code` accepts either the primary redemption code or the short 6-digit
// backup code shown by the mobile app - RedemptionService.redeem() tries
// the primary code first, then falls back to a cafe-scoped backup-code
// lookup (see README.md "Backup-code redemption" - no longer a limitation,
// this app requires no change to support it: whatever the QR scanner reads
// or the barista types manually is sent here unchanged either way).
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
