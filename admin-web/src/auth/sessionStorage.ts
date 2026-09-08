const REFRESH_TOKEN_KEY = 'admin.refreshToken';

export interface StoredSession {
  refreshToken: string;
}

// sessionStorage only, and only for the one thing the existing backend
// contract actually requires something to persist: the refresh token
// (needed to call POST /auth/refresh after a page reload). Unlike
// barista-web there is no cafeId to persist here - an admin's identity is
// re-derived entirely from the JWT/backend response on every restore, never
// stored client-side. sessionStorage is cleared automatically when the tab/
// browser closes, unlike localStorage. The access token itself is
// deliberately NEVER stored here - it is held in memory only (see
// src/api/client.ts).
export function saveSession(session: StoredSession): void {
  sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

export function getStoredRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearSession(): void {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
