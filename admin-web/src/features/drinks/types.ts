// Mirrors com.socialcup.drink.entity.DrinkStatus exactly.
export type DrinkStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

// Mirrors com.socialcup.drink.dto.DrinkResponse exactly - the SAME shape
// returned by every drink-related endpoint this app can reach: the public
// GET /drinks/{id}, the public GET /cafes/{id}/drinks (embedded in each
// entry and in CafeDetailResponse/AdminCafeDetailResponse's own `drinks`
// field), and all three admin write endpoints. Unlike Cafe, there is no
// admin-only drink DTO and no field this app can see in one place but not
// another - `retailPrice` is typed nullable because the entity column
// itself has no NOT NULL constraint (com.socialcup.drink.entity.Drink),
// even though CreateDrinkRequest/UpdateDrinkRequest both require it.
export interface DrinkResponse {
  id: string;
  cafeId: string | null;
  cafeName: string | null;
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
}

// Mirrors com.socialcup.drink.dto.CreateDrinkRequest exactly. `type` is a
// plain free-text field on the backend (@Size(max=100) String) - there is
// no DrinkType enum anywhere in the backend source, so this app must not
// invent one (e.g. a fixed dropdown of drink types). `creditPrice` is a
// required primitive int on the backend (@Min(1), not nullable) - unlike
// payoutRate for cafes, it can never be safely omitted.
export interface CreateDrinkRequest {
  name: string;
  type?: string | null;
  description?: string | null;
  retailPrice: number;
  creditPrice: number;
  photoUrl?: string | null;
  signature?: boolean | null;
}

// com.socialcup.drink.dto.UpdateDrinkRequest is a structurally identical
// record to CreateDrinkRequest on the backend - kept as a distinct alias
// here so call sites read as "this is an update", matching the backend
// having two distinct DTO classes. Notably has no `cafeId` field - a
// drink's cafe association is immutable after creation on the backend
// (AdminDrinkController has no "move to another cafe" endpoint), so this
// app must not attempt to invent one.
export type UpdateDrinkRequest = CreateDrinkRequest;

// Mirrors com.socialcup.drink.dto.UpdateDrinkStatusRequest exactly.
export interface UpdateDrinkStatusRequest {
  status: DrinkStatus;
}
