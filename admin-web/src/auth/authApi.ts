import { apiClient, AUTH_LOGIN_PATH, AUTH_REFRESH_PATH } from '../api/client';
import type { AdminAuthResponse, AdminLoginRequest } from './types';

// Both thin wrappers around the existing shared apiClient - no new Axios
// instance, and no new backend endpoint: this is the exact same
// POST /auth/login and POST /auth/refresh every member uses. There is no
// /admin/login - the ADMIN role comes from the persisted Member.role the
// backend returns in `user.roles`, never from a separate admin-only path.
//
// This deliberately duplicates the one-line POST shape already private
// inside src/api/client.ts's own interceptor-internal performRefresh(),
// rather than sharing a helper across that module boundary - client.ts must
// stay self-contained with no dependency on auth/, to avoid a circular
// import (this file already depends on api/client.ts for the shared
// apiClient). Mirrors barista-web/src/auth/api.ts's exact same trade-off.
export async function loginAdmin(request: AdminLoginRequest): Promise<AdminAuthResponse> {
  const response = await apiClient.post<AdminAuthResponse>(AUTH_LOGIN_PATH, request);
  return response.data;
}

export async function refreshAdmin(refreshToken: string): Promise<AdminAuthResponse> {
  const response = await apiClient.post<AdminAuthResponse>(AUTH_REFRESH_PATH, { refreshToken });
  return response.data;
}
