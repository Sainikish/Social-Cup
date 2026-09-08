import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type {
  AdminCafeDetailResponse,
  CafeDetailResponse,
  CafeSummaryResponse,
  CreateCafeRequest,
  UpdateCafeRequest,
  UpdateCafeStatusRequest,
} from './types';

// Public, unauthenticated cafe endpoints (the same ones mobile/barista-web
// consume) - only /search is used here, to select a known ACTIVE cafe for
// an admin operation. There is no admin cafe listing endpoint, so this is
// deliberately NOT presented anywhere as "all cafes".
const PUBLIC_CAFES_PATH = '/cafes';

// Admin-only cafe endpoints (POST/PUT/PATCH). There is no admin GET here -
// none exists on the backend (AdminCafeController has no @GetMapping) - do
// not add one.
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

// Public cafe detail - used to pre-fill the Edit form when the admin arrives
// at /cafes/:id without a freshly-created/updated AdminCafeDetailResponse
// already in hand. Deliberately has no payoutRate - see CafeDetail screen
// for how that gap is surfaced rather than hidden.
export async function getPublicCafeById(id: string): Promise<CafeDetailResponse> {
  const response = await apiClient.get<CafeDetailResponse>(`${PUBLIC_CAFES_PATH}/${id}`);
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
