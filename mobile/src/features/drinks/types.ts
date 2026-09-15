// Mirrors com.socialcup.drink.entity.DrinkStatus exactly. This is the
// canonical definition - src/features/cafes/types.ts re-exports it rather
// than declaring its own copy, since a cafe's drink list uses the exact
// same backend DTO.
export type DrinkStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

// Mirrors com.socialcup.drink.dto.DrinkResponse exactly - returned by both
// GET /drinks/{id} and GET /drinks/signature (and, unrelated to this
// module, GET /cafes/{id}/drinks - see src/features/cafes/api.ts).
//
// com.socialcup.drink.dto.DrinkSummaryResponse also exists on the backend
// but is never actually returned by any endpoint (confirmed against
// DrinkController) - there is deliberately no mobile type for it.
export interface DrinkResponse {
  id: string;
  cafeId: string;
  cafeName: string;
  name: string;
  type: string | null;
  description: string | null;
  retailPrice: number | null;
  creditPrice: number;
  photoUrl: string | null;
  signature: boolean;
  status: DrinkStatus;
  createdAt: string;
  updatedAt: string;
  // Both being added to DrinkResponse by a parallel backend workstream as of
  // this writing - optional here because this client may run against a
  // backend build from before or after that rollout. A drink with no ratings
  // yet is expected to report averageRating: null (not merely omit the
  // field), but both are treated identically by every consumer: render the
  // "New" badge (see RatingSummaryBadge in features/ratings), never "0" or
  // a crash. ratingCount defaults to being read as 0 when absent.
  averageRating?: number | null;
  ratingCount?: number;
}
