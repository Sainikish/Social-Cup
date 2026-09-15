export type AppEnvironment = 'development' | 'production' | 'test';

function resolveEnvironment(): AppEnvironment {
  const mode = import.meta.env.MODE;
  if (mode === 'production' || mode === 'test') {
    return mode;
  }
  return 'development';
}

// Local-development-only fallback, used purely so `npm run dev` works out of
// the box against a backend running on the same machine - mirrors the same
// fail-fast philosophy already established by barista-web/src/config/env.ts.
// Deliberately no assumed URL outside local development: a staging/
// production build must set VITE_API_BASE_URL itself, failing fast here is
// safer than silently shipping a guessed placeholder host.
function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL;
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8080/api';
  }

  throw new Error(
    'VITE_API_BASE_URL must be set for this environment. ' +
      'No default server URL is assumed outside local development.'
  );
}

// Same fail-fast philosophy as resolveApiBaseUrl above. Used only to build
// the barista scan/login link shown on a cafe's Barista Access section (see
// CafeDetail.tsx) - this app never calls barista-web's API, it only links a
// human admin to it, so an incorrect/missing value here breaks a displayed
// link rather than any request this app makes itself.
function resolveBaristaWebUrl(): string {
  const explicit = import.meta.env.VITE_BARISTA_WEB_URL;
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5174';
  }

  throw new Error(
    'VITE_BARISTA_WEB_URL must be set for this environment. ' +
      'No default barista-web URL is assumed outside local development.'
  );
}

const environment = resolveEnvironment();
const apiBaseUrl = resolveApiBaseUrl();
const baristaWebUrl = resolveBaristaWebUrl();

export const config = {
  environment,
  apiBaseUrl,
  baristaWebUrl,
} as const;
