import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type {
  AdminCafeDetailResponse,
  AdminCafePinResetResponse,
  CafePhotoDto,
  CafeStatus,
  CafeSummaryResponse,
  CreateCafeRequest,
  UpdateCafeRequest,
  UpdateCafeStatusRequest,
} from './types';

// Public, unauthenticated /cafes/search (the same one mobile/barista-web
// consume) - ACTIVE cafes only. Kept only for whatever still legitimately
// wants an active-only search; admin management uses the admin endpoints
// below instead, which see every status including archived.
const PUBLIC_CAFES_PATH = '/cafes';

// Admin-only cafe endpoints. Mirrors AdminCafeController exactly:
//   GET /admin/cafes         -> PageResponse<CafeSummaryResponse> (any status, archived included)
//   GET /admin/cafes/{id}    -> AdminCafeDetailResponse (any status, archived included)
//   POST/PUT/PATCH ...       -> AdminCafeDetailResponse
const ADMIN_CAFES_PATH = '/admin/cafes';

export interface CafeSearchParams {
  q: string;
  page?: number;
  size?: number;
}

export async function searchCafes(params: CafeSearchParams): Promise<PageResponse<CafeSummaryResponse>> {
  const response = await apiClient.get<PageResponse<CafeSummaryResponse>>(`${PUBLIC_CAFES_PATH}/search`, {
    params: { q: params.q, page: params.page ?? 0, size: params.size ?? 20 },
  });
  return response.data;
}

export interface CafeAdminSearchParams {
  q?: string;
  status?: CafeStatus;
  page?: number;
  size?: number;
}

export async function searchCafesForAdmin(
  params: CafeAdminSearchParams = {}
): Promise<PageResponse<CafeSummaryResponse>> {
  const response = await apiClient.get<PageResponse<CafeSummaryResponse>>(ADMIN_CAFES_PATH, {
    params: {
      q: params.q,
      status: params.status,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });
  return response.data;
}

// Any status, archived included - unlike the old public-endpoint fallback
// this replaced, this can open a cafe regardless of its status, so an
// archived cafe (only ever reachable via searchCafesForAdmin above) is
// never a dead end once opened.
export async function getCafeByIdForAdmin(id: string): Promise<AdminCafeDetailResponse> {
  const response = await apiClient.get<AdminCafeDetailResponse>(`${ADMIN_CAFES_PATH}/${id}`);
  return response.data;
}

export async function createCafe(request: CreateCafeRequest): Promise<AdminCafeDetailResponse> {
  const response = await apiClient.post<AdminCafeDetailResponse>(ADMIN_CAFES_PATH, request);
  return response.data;
}

export async function updateCafe(id: string, request: UpdateCafeRequest): Promise<AdminCafeDetailResponse> {
  const response = await apiClient.put<AdminCafeDetailResponse>(`${ADMIN_CAFES_PATH}/${id}`, request);
  return response.data;
}

export async function updateCafeStatus(
  id: string,
  request: UpdateCafeStatusRequest
): Promise<AdminCafeDetailResponse> {
  const response = await apiClient.patch<AdminCafeDetailResponse>(`${ADMIN_CAFES_PATH}/${id}/status`, request);
  return response.data;
}

// Backend requires an existing cafeId (see AdminCafeController), so this can
// only ever run from the detail/edit screen for an already-created cafe -
// never from the create form, which has no id yet. Returns just the one
// newly-created photo, not the whole cafe - the caller merges it into
// whatever cafe detail it already has in hand (see CafeDetail).
export async function addCafePhoto(cafeId: string, file: File): Promise<CafePhotoDto> {
  const formData = new FormData();
  formData.append('photo', file);
  const response = await apiClient.post<CafePhotoDto>(`${ADMIN_CAFES_PATH}/${cafeId}/photos`, formData);
  return response.data;
}

export async function removeCafePhoto(cafeId: string, photoId: string): Promise<void> {
  await apiClient.delete(`${ADMIN_CAFES_PATH}/${cafeId}/photos/${photoId}`);
}

// NOT yet implemented on the backend - see AdminCafePinResetResponse in
// ./types for the assumed contract this is built against. Needs to be added
// as separate backend work before this call will actually succeed.
export async function resetCafePin(cafeId: string): Promise<AdminCafePinResetResponse> {
  const response = await apiClient.post<AdminCafePinResetResponse>(`${ADMIN_CAFES_PATH}/${cafeId}/pin/reset`);
  return response.data;
}
