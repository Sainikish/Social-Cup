// Mirrors com.socialcup.rating.dto.RatingAuthorResponse exactly. Deliberately
// narrower than MemberDto (which additionally exposes email, status, roles,
// createdAt) - those fields belong to a member viewing their own profile,
// not to anyone reading someone else's review. `id` lets the UI detect
// "this rating is mine" without a dedicated backend field for it.
export interface RatingAuthorResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

// Mirrors com.socialcup.rating.dto.DrinkRatingResponse exactly - the PUBLIC
// view returned by GET /drinks/{drinkId}/ratings. `author` is null only when
// the backend's underlying member relation is null (see RatingMapper).
export interface DrinkRatingResponse {
  id: string;
  drinkId: string;
  rating: number;
  note: string | null;
  author: RatingAuthorResponse | null;
  createdAt: string;
  updatedAt: string;
}

// Mirrors com.socialcup.rating.dto.RatingResponse exactly - the OWN-rating
// view returned by POST/PUT /drinks/{drinkId}/ratings and by
// GET /users/me/ratings and GET /users/me/diary. Carries drink/cafe context
// rather than reviewer identity, since the caller already knows who they are.
export interface RatingResponse {
  id: string;
  drinkId: string;
  drinkName: string;
  cafeId: string;
  cafeName: string;
  rating: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// Mirrors com.socialcup.rating.dto.CreateRatingRequest exactly:
// @Min(1) @Max(5) int rating, @Size(max = 140) String note.
export interface CreateRatingRequest {
  rating: number;
  note?: string;
}

// Mirrors com.socialcup.rating.dto.UpdateRatingRequest - identical shape to
// CreateRatingRequest on the backend, kept as a distinct type here so a
// create-vs-update call site can never accidentally swap them.
export interface UpdateRatingRequest {
  rating: number;
  note?: string;
}
