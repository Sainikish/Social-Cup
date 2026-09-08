// Mirrors com.socialcup.cafe.entity.CafeStatus exactly.
export type CafeStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

// Mirrors com.socialcup.cafe.dto.CafeSummaryResponse exactly - returned by
// GET /cafes/search, which this feature uses for the login screen's cafe
// picker. Copied from the mobile app's own features/cafes/types.ts (same
// backend DTO); only the fields the picker actually reads are used, but the
// full shape is kept for fidelity rather than an ad hoc subset.
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
