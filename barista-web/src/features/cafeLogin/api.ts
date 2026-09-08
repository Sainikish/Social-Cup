import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type { CafeSummaryResponse } from './types';

// GET /cafes/search is public (see backend SecurityConfig's
// PUBLIC_READ_ENDPOINTS) - it works before a barista session exists, which
// is exactly when the login screen's cafe picker needs it.
const CAFE_SEARCH_PATH = '/cafes/search';

export interface CafeSearchParams {
  q: string;
  page: number;
  size: number;
}

export async function searchCafes(params: CafeSearchParams): Promise<PageResponse<CafeSummaryResponse>> {
  const response = await apiClient.get<PageResponse<CafeSummaryResponse>>(CAFE_SEARCH_PATH, { params });
  return response.data;
}
