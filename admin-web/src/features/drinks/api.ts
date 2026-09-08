import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type { CreateDrinkRequest, DrinkResponse, UpdateDrinkRequest, UpdateDrinkStatusRequest } from './types';

// Public, unauthenticated endpoints. GET /cafes/{id}/drinks
// (CafeController.getCafeDrinks) hardcodes includeInactive=false
// (DrinkService.getDrinksByCafe) - ACTIVE drinks only, same limitation as
// the drinks embedded in CafeDetailResponse. GET /drinks/{id}
// (DrinkController.getDrinkById) uses findByIdAndArchivedAtIsNull - it
// finds ACTIVE and INACTIVE drinks, but never an ARCHIVED one.
const PUBLIC_CAFES_PATH = '/cafes';
const PUBLIC_DRINKS_PATH = '/drinks';

// Admin-only endpoints. There is no admin drink-list endpoint and no admin
// get-drink-by-id endpoint - AdminDrinkController only exposes PUT and
// PATCH .../status; creation lives on AdminCafeController instead
// (POST /admin/cafes/{cafeId}/drinks). Do not add a GET here.
const ADMIN_CAFES_PATH = '/admin/cafes';
const ADMIN_DRINKS_PATH = '/admin/drinks';

export interface DrinksByCafeParams {
  cafeId: string;
  page?: number;
  size?: number;
}

export async function getDrinksByCafe(params: DrinksByCafeParams): Promise<PageResponse<DrinkResponse>> {
  const response = await apiClient.get<PageResponse<DrinkResponse>>(
    `${PUBLIC_CAFES_PATH}/${params.cafeId}/drinks`,
    { params: { page: params.page ?? 0, size: params.size ?? 50 } }
  );
  return response.data;
}

export async function getPublicDrinkById(id: string): Promise<DrinkResponse> {
  const response = await apiClient.get<DrinkResponse>(`${PUBLIC_DRINKS_PATH}/${id}`);
  return response.data;
}

export async function createDrink(cafeId: string, request: CreateDrinkRequest): Promise<DrinkResponse> {
  const response = await apiClient.post<DrinkResponse>(`${ADMIN_CAFES_PATH}/${cafeId}/drinks`, request);
  return response.data;
}

export async function updateDrink(id: string, request: UpdateDrinkRequest): Promise<DrinkResponse> {
  const response = await apiClient.put<DrinkResponse>(`${ADMIN_DRINKS_PATH}/${id}`, request);
  return response.data;
}

export async function updateDrinkStatus(id: string, request: UpdateDrinkStatusRequest): Promise<DrinkResponse> {
  const response = await apiClient.patch<DrinkResponse>(`${ADMIN_DRINKS_PATH}/${id}/status`, request);
  return response.data;
}
