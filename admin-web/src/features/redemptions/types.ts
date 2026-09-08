// Mirrors com.socialcup.redemption.dto.AdminRedemptionResponse exactly -
// every value here is read verbatim from the backend's already-persisted
// Redemption row (and its member/cafe/drink associations). Nothing here is
// recalculated client-side, and there is no request DTO anywhere in this
// feature - GET /admin/redemptions is the only endpoint, and it is read-only.
export interface AdminRedemptionResponse {
  redemptionId: string;
  memberId: string;
  memberEmail: string;
  cafeId: string;
  cafeName: string;
  drinkId: string;
  drinkName: string;
  creditsDeducted: number;
  payoutRate: number;
  createdAt: string;
}

// Every one of these mirrors an optional @RequestParam on
// AdminRedemptionController.getRedemptions - cafeId/memberId/drinkId are
// UUID strings, from/to are ISO yyyy-MM-dd dates (to is inclusive of the
// whole day, per the backend's exclusive-upper-bound conversion). All are
// genuinely optional; omitting one omits it from the request entirely
// rather than sending it as an empty string.
export interface RedemptionFilters {
  cafeId?: string;
  memberId?: string;
  drinkId?: string;
  from?: string;
  to?: string;
}

// Adds the backend's pagination/sort params to the filters above - the same
// three GET /admin/redemptions also accepts (page/size default to backend's
// own Pageable defaults when omitted; sort defaults to "createdAt,desc" at
// the API layer below so newest redemptions show first without the caller
// having to specify it every time).
export interface RedemptionListParams extends RedemptionFilters {
  page?: number;
  size?: number;
  sort?: string;
}
