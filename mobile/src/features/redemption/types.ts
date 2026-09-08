// Mirrors com.socialcup.redemption.dto.RedemptionCodeResponse exactly
// (verified directly against the backend source, not assumed). validUntil is
// an Instant, serialized as an ISO-8601 string - the authoritative expiration
// for this code; nothing here is computed or duplicated client-side.
export interface RedemptionCodeResponse {
  code: string;
  backupCode: string;
  validUntil: string;
  drinkId: string;
  drinkName: string;
  cafeId: string;
  cafeName: string;
  creditPrice: number;
}

// Mirrors com.socialcup.redemption.dto.CreateRedemptionCodeRequest exactly -
// deliberately just the drink id, nothing else (see that DTO's own comment:
// no memberId, no cafeId).
export interface CreateRedemptionCodeRequest {
  drinkId: string;
}
