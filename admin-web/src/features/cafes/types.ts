// Mirrors com.socialcup.cafe.entity.CafeStatus exactly.
export type CafeStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

// Mirrors com.socialcup.cafe.dto.CafeHoursDto exactly.
export interface CafeHoursDto {
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

// Mirrors com.socialcup.cafe.dto.CafePhotoDto exactly.
export interface CafePhotoDto {
  id: string | null;
  photoUrl: string;
  caption: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

// Mirrors com.socialcup.cafe.dto.CafeSummaryResponse exactly - the shape
// returned by the public GET /cafes/search (and /cafes, /cafes/featured).
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

// Mirrors com.socialcup.cafe.dto.CafeDetailResponse exactly - the public
// GET /cafes/{id} response. Deliberately has NO payoutRate field - the
// backend's own public DTO omits it, this is not an oversight here.
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
  createdAt: string;
  updatedAt: string;
}

// Mirrors com.socialcup.cafe.dto.AdminCafeDetailResponse exactly - returned
// only by the admin create/update/status endpoints, never by a GET (no such
// admin GET endpoint exists). The one field the public CafeDetailResponse
// lacks is payoutRate.
export interface AdminCafeDetailResponse {
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
  payoutRate: number | null;
  featured: boolean;
  vibeTags: string | null;
  description: string | null;
  status: CafeStatus;
  photos: CafePhotoDto[];
  createdAt: string;
  updatedAt: string;
}

// Mirrors com.socialcup.cafe.dto.CreateCafeRequest exactly - field names,
// optionality and nullability. No field exists here that the backend DTO
// does not declare.
export interface CreateCafeRequest {
  name: string;
  address: string;
  neighbourhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: CafeHoursDto[] | null;
  phoneNumber?: string | null;
  email?: string | null;
  website?: string | null;
  payoutRate?: number | null;
  featured?: boolean | null;
  vibeTags?: string | null;
  description?: string | null;
  photos?: CafePhotoDto[] | null;
}

// com.socialcup.cafe.dto.UpdateCafeRequest is a structurally identical
// record to CreateCafeRequest on the backend (same fields, same
// validations) - kept as a distinct alias here (rather than reusing
// CreateCafeRequest directly at call sites) so call sites read as "this is
// an update", matching the backend having two distinct DTO classes.
export type UpdateCafeRequest = CreateCafeRequest;

// Mirrors com.socialcup.cafe.dto.UpdateCafeStatusRequest exactly.
export interface UpdateCafeStatusRequest {
  status: CafeStatus;
}
