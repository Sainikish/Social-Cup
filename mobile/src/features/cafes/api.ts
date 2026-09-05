import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type {
  CafeDetailResponse,
  CafeListParams,
  CafeSearchParams,
  CafeSummaryResponse,
  DrinkResponse,
} from './types';

// All five functions are thin wrappers around the existing shared apiClient
// (see src/api/client.ts) - no new Axios instance, no manual Authorization
// header. These are public GET endpoints; the request interceptor already
// attaches a token when one exists and omits it otherwise, which is exactly
// what an anonymous-or-authenticated browse experience needs.
const CAFES_PATH = '/cafes';

export interface PageRequestParams {
  page: number;
  size: number;
}

export async function getCafes(
  params: CafeListParams & PageRequestParams
): Promise<PageResponse<CafeSummaryResponse>> {
  const response = await apiClient.get<PageResponse<CafeSummaryResponse>>(CAFES_PATH, {
    params: {
      neighbourhood: params.neighbourhood,
      featured: params.featured,
      page: params.page,
      size: params.size,
    },
  });
  return response.data;
}

export async function searchCafes(
  params: CafeSearchParams & PageRequestParams
): Promise<PageResponse<CafeSummaryResponse>> {
  const response = await apiClient.get<PageResponse<CafeSummaryResponse>>(`${CAFES_PATH}/search`, {
    params: {
      q: params.q,
      neighbourhood: params.neighbourhood,
      lat: params.lat,
      lng: params.lng,
      page: params.page,
      size: params.size,
    },
  });
  return response.data;
}

export async function getFeaturedCafes(
  params: PageRequestParams
): Promise<PageResponse<CafeSummaryResponse>> {
  const response = await apiClient.get<PageResponse<CafeSummaryResponse>>(`${CAFES_PATH}/featured`, {
    params,
  });
  return response.data;
}

export async function getCafeById(id: string): Promise<CafeDetailResponse> {
  const response = await apiClient.get<CafeDetailResponse>(`${CAFES_PATH}/${id}`);
  return response.data;
}

export async function getCafeDrinks(
  id: string,
  params: PageRequestParams
): Promise<PageResponse<DrinkResponse>> {
  const response = await apiClient.get<PageResponse<DrinkResponse>>(`${CAFES_PATH}/${id}/drinks`, {
    params,
  });
  return response.data;
}
