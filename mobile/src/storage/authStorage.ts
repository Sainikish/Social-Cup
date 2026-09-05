import * as SecureStore from 'expo-secure-store';

// Encrypted on-device storage (Keychain on iOS, Keystore-backed EncryptedSharedPreferences
// on Android) for the two JWTs the backend issues - see backend/README.md "Authentication
// & authorization". Deliberately holds ONLY these two values: never the user's password,
// and never anything else, so this stays a narrow, auditable surface. This module is
// read/write only - the decision of *when* to call /auth/refresh lives in
// src/api/client.ts's response interceptor, and session state lives in
// src/features/auth/AuthContext.tsx; neither screens nor those modules should
// reach into SecureStore directly, only through the functions here.
const ACCESS_TOKEN_KEY = 'socialcup.accessToken';
const REFRESH_TOKEN_KEY = 'socialcup.refreshToken';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveAuthTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
