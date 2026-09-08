const REFRESH_TOKEN_KEY = 'barista.refreshToken';
const CAFE_ID_KEY = 'barista.cafeId';

export interface StoredSession {
  refreshToken: string;
  cafeId: string;
}

// sessionStorage only, and only for what the existing backend contract
// actually requires something to persist: the refresh token (needed to call
// POST /barista/refresh after a page reload) and cafeId (informational on
// the frontend - the backend re-derives and re-validates the real cafe
// identity from the JWT on every request, this is only shown in the UI).
// sessionStorage is cleared automatically when the tab/browser closes,
// unlike localStorage. The access token itself is deliberately NEVER stored
// here - it is held in memory only (see src/api/client.ts).
export function saveSession(session: StoredSession): void {
  sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  sessionStorage.setItem(CAFE_ID_KEY, session.cafeId);
}

export function getStoredRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredCafeId(): string | null {
  return sessionStorage.getItem(CAFE_ID_KEY);
}

export function clearSession(): void {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(CAFE_ID_KEY);
}
