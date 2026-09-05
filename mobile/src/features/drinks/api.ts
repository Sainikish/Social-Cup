import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type { DrinkResponse } from './types';

// Only these two endpoints exist publicly on the backend (verified directly
// against DrinkController.java) - no search, no filters, no /drinks?cafeId=.
// Both go through the existing shared apiClient: no new Axios instance, no
// manual Authorization header (these are public GET routes; the request
// interceptor attaches a token when one exists and omits it otherwise).
const DRINKS_PATH = '/drinks';

export interface PageRequestParams {
  page: number;
  size: number;
}

export async function getSignatureDrinks(params: PageRequestParams): Promise<PageResponse<DrinkResponse>> {
  const response = await apiClient.get<PageResponse<DrinkResponse>>(`${DRINKS_PATH}/signature`, {
    params,
  });
  return response.data;
}

export async function getDrinkById(id: string): Promise<DrinkResponse> {
  const response = await apiClient.get<DrinkResponse>(`${DRINKS_PATH}/${id}`);
  return response.data;
}
