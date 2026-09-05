import { create, isAxiosError, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { config } from '../config/env';
import { clearAuthTokens, getAccessToken, getRefreshToken, saveAuthTokens } from '../storage/authStorage';
import type { ApiError } from '../types/api';
import type { AuthResponse } from '../types/auth';
import { notifyAuthExpired } from './authSession';

// Exported so api/auth.ts's refresh() call can reuse the exact same literal,
// rather than risking two copies drifting apart - this path is also read
// back below to recognize "the failing request WAS the refresh call itself"
// and avoid recursing into another refresh attempt.
export const AUTH_REFRESH_PATH = '/auth/refresh';

export const apiClient = create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attaches the stored access token to every outgoing request. Never attaches
// an Authorization header when no token is stored - the request is simply
// sent as anonymous, and the backend's own public/authenticated route rules
// (see backend SecurityConfig) decide whether that's sufficient.
apiClient.interceptors.request.use(async (requestConfig) => {
  const accessToken = await getAccessToken();
  if (accessToken) {
    requestConfig.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return requestConfig;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Single-flight refresh: if several requests 401 around the same moment,
// only the first one calls POST /auth/refresh - every other one just awaits
// this same in-flight promise and retries with whatever token it resolves
// to, instead of each firing its own refresh request.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const storedRefreshToken = await getRefreshToken();
  if (!storedRefreshToken) {
    throw new Error('No refresh token available to attempt a refresh with');
  }

  const response = await apiClient.post<AuthResponse>(AUTH_REFRESH_PATH, {
    refreshToken: storedRefreshToken,
  });

  await saveAuthTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });

  return response.data.accessToken;
}

// Flow: request -> 401 UNAUTHENTICATED -> read stored refreshToken ->
// POST /auth/refresh -> save the new access+refresh token pair -> retry the
// ORIGINAL request exactly once with the new access token. A request that
// already carries the `_retry` marker (i.e. this is itself a retried
// request) is never retried again, and the refresh call itself is never
// retried through this path - both guard against 401 -> refresh -> retry ->
// 401 -> refresh -> ... looping forever. If refresh fails, stored tokens are
// cleared and every subscriber (AuthContext) is notified so the app can drop
// back to an unauthenticated state; the ORIGINAL 401 is what the caller sees.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      throw error;
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const responseData = error.response?.data as ApiError | undefined;

    const isUnauthenticated = error.response?.status === 401 && responseData?.code === 'UNAUTHENTICATED';
    const isRefreshCallItself = originalRequest?.url === AUTH_REFRESH_PATH;
    const alreadyRetried = originalRequest?._retry === true;

    if (!isUnauthenticated || isRefreshCallItself || alreadyRetried || !originalRequest) {
      throw error;
    }

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;

      originalRequest._retry = true;
      originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return await apiClient.request(originalRequest);
    } catch {
      await clearAuthTokens();
      notifyAuthExpired();
      throw error;
    }
  }
);

// Normalizes any request failure - a backend ApiError response, a network
// failure, a timeout, anything else - into the same ApiError shape (see
// src/types/api.ts), so calling code only ever needs to branch on `.code`,
// never on whether the request reached the server at all.
export function toApiError(error: unknown): ApiError {
  if (isAxiosError(error)) {
    const data = (error as AxiosError<ApiError>).response?.data;
    if (data && typeof data === 'object' && 'code' in data) {
      return data;
    }

    return {
      timestamp: new Date().toISOString(),
      status: error.response?.status ?? 0,
      error: error.response?.statusText ?? 'Network Error',
      code: error.code === 'ECONNABORTED' ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
      message: error.message,
      path: error.config?.url ?? '',
      requestId: '',
    };
  }

  return {
    timestamp: new Date().toISOString(),
    status: 0,
    error: 'Unknown Error',
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    path: '',
    requestId: '',
  };
}
