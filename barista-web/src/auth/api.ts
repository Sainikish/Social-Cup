import { apiClient, BARISTA_LOGIN_PATH, BARISTA_REFRESH_PATH } from '../api/client';
import type { BaristaAuthResponse, BaristaLoginRequest } from './types';

// Both thin wrappers around the existing shared apiClient - no new Axios
// instance. loginBarista is called directly by AuthContext.login();
// refreshBarista is called directly by AuthContext's mount-time session
// restore (there is no GET /barista/me to "just verify" a session against,
// unlike the member app's GET /auth/me - refresh is the only side-effect-
// free way to confirm a stored refresh token is still good). This
// deliberately duplicates the one-line POST shape already private inside
// src/api/client.ts's own interceptor-internal performRefresh(), rather than
// sharing a helper across that module boundary - client.ts must stay
// self-contained with no dependency on auth/, to avoid a circular import
// (auth/api.ts already depends on api/client.ts for the shared apiClient).
export async function loginBarista(request: BaristaLoginRequest): Promise<BaristaAuthResponse> {
  const response = await apiClient.post<BaristaAuthResponse>(BARISTA_LOGIN_PATH, request);
  return response.data;
}

export async function refreshBarista(refreshToken: string): Promise<BaristaAuthResponse> {
  const response = await apiClient.post<BaristaAuthResponse>(BARISTA_REFRESH_PATH, { refreshToken });
  return response.data;
}
