import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type { CreateRatingRequest, DrinkRatingResponse, RatingResponse, UpdateRatingRequest } from './types';

// Verified directly against RatingController.java and UserRatingController.java
// - no other rating endpoints exist on the backend. All five functions go
// through the existing shared apiClient: no new Axios instance, no manual
// Authorization header (the request interceptor attaches a token when one
// exists and omits it otherwise, which is exactly right here - the GET below
// is public, the rest require auth and rely on the backend to enforce that).
const DRINKS_PATH = '/drinks';
const USERS_ME_PATH = '/users/me';

export interface PageRequestParams {
  page: number;
  size: number;
}

export async function getDrinkRatings(
  drinkId: string,
  params: PageRequestParams
): Promise<PageResponse<DrinkRatingResponse>> {
  const response = await apiClient.get<PageResponse<DrinkRatingResponse>>(
    `${DRINKS_PATH}/${drinkId}/ratings`,
    { params }
  );
  return response.data;
}

export async function createRating(drinkId: string, request: CreateRatingRequest): Promise<RatingResponse> {
  const response = await apiClient.post<RatingResponse>(`${DRINKS_PATH}/${drinkId}/ratings`, request);
  return response.data;
}

export async function updateRating(drinkId: string, request: UpdateRatingRequest): Promise<RatingResponse> {
  const response = await apiClient.put<RatingResponse>(`${DRINKS_PATH}/${drinkId}/ratings`, request);
  return response.data;
}

export async function getMyRatings(params: PageRequestParams): Promise<PageResponse<RatingResponse>> {
  const response = await apiClient.get<PageResponse<RatingResponse>>(`${USERS_ME_PATH}/ratings`, {
    params,
  });
  return response.data;
}

export async function getMyDiary(params: PageRequestParams): Promise<PageResponse<RatingResponse>> {
  const response = await apiClient.get<PageResponse<RatingResponse>>(`${USERS_ME_PATH}/diary`, {
    params,
  });
  return response.data;
}
