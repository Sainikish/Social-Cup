// Canonical Drink types now live in features/drinks (Phase 7.4). Imported
// (for use in CafeDetailResponse.drinks below) and re-exported (so every
// existing import of `DrinkResponse`/`DrinkStatus` from this module keeps
// working unchanged) rather than maintaining two copies of the same
// backend DTO shape.
import type { DrinkResponse, DrinkStatus } from '../drinks/types';

export type { DrinkResponse, DrinkStatus };

// Mirrors com.socialcup.cafe.entity.CafeStatus exactly.
export type CafeStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

// Mirrors com.socialcup.cafe.dto.CafeSummaryResponse exactly - returned by
// GET /cafes, GET /cafes/search, and GET /cafes/featured.
export interface CafeSummaryResponse {
  id: string;
  name: string;
  address: string;
  neighbourhood: string | null;
  latitude: number | null;
  longitude: number | null;
  featured: boolean;
  status: CafeStatus;
  vibeTags: string | null;
  primaryPhotoUrl: string | null;
  distanceKm: number | null;
}

// Mirrors com.socialcup.cafe.dto.CafeHoursDto. openTime/closeTime are
// LocalTime, serialized as "HH:mm:ss" strings; both are null when isClosed.
export interface CafeHoursDto {
  dayOfWeek: DayOfWeek;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

// Mirrors com.socialcup.cafe.dto.CafePhotoDto. The backend does not
// guarantee display-order sorting in its response (see CafeMapper.mapPhotos)
// - sorting by displayOrder is this client's responsibility, done in
// CafePhotoGallery.
export interface CafePhotoDto {
  id: string;
  photoUrl: string;
  caption: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

// Mirrors com.socialcup.cafe.dto.CafeDetailResponse exactly - returned by
// GET /cafes/{id}. IMPORTANT: this intentionally has no payoutRate field -
// that only ever exists on the backend's admin-only AdminCafeDetailResponse,
// which this public mobile feature must never reference.
//
// Note `drinks` is present here (the backend embeds a member's active
// drinks in the detail response), but the cafe detail screen deliberately
// fetches drinks via the separate GET /cafes/{id}/drinks call instead (see
// features/cafes/hooks.ts) - this field exists only for type fidelity with
// the backend contract, it is not read for rendering.
export interface CafeDetailResponse {
  id: string;
  name: string;
  address: string;
  neighbourhood: string | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: CafeHoursDto[];
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  featured: boolean;
  vibeTags: string | null;
  description: string | null;
  status: CafeStatus;
  photos: CafePhotoDto[];
  drinks: DrinkResponse[];
  createdAt: string;
  updatedAt: string;
}

// Matches GET /cafes' actual supported query parameters exactly (see
// CafeController.getCafes) - neighbourhood and featured only. No search text
// here; that belongs to CafeSearchParams below.
export interface CafeListParams {
  neighbourhood?: string;
  featured?: boolean;
}

// Matches GET /cafes/search's actual supported query parameters exactly
// (see CafeController.searchCafes): q, neighbourhood, lat, lng. Note
// "featured" is NOT a supported search parameter on the backend - it only
// exists on the plain list endpoint above, so it is deliberately absent here
// rather than invented.
export interface CafeSearchParams {
  q?: string;
  neighbourhood?: string;
  lat?: number;
  lng?: number;
}
