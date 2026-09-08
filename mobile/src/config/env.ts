import { Platform } from 'react-native';

export type AppEnvironment = 'development' | 'staging' | 'production';

const BACKEND_CONTEXT_PATH = '/api';

function resolveEnvironment(): AppEnvironment {
  const configured = process.env.EXPO_PUBLIC_APP_ENV;
  if (configured === 'staging' || configured === 'production') {
    return configured;
  }
  return 'development';
}

// Local-development-only fallback, used purely so `expo start` works out of
// the box with no configuration. Android emulators reach the host machine at
// the special address 10.0.2.2 - "localhost" from inside the emulator means
// the emulator itself, not the developer's computer. iOS simulators share the
// host's network stack, so "localhost" resolves correctly there. A physical
// device on the same Wi-Fi network is neither case: it has its own network
// identity and cannot reach either address, so it must be given the
// developer's actual LAN IP explicitly via EXPO_PUBLIC_API_URL (see
// mobile/README.md "Physical device" section) - there is no way to detect
// that automatically from here.
function developmentFallbackHost(): string {
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

function resolveApiBaseUrl(environment: AppEnvironment): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.length > 0) {
    return explicit;
  }

  if (environment === 'development') {
    return `http://${developmentFallbackHost()}:8080${BACKEND_CONTEXT_PATH}`;
  }

  // Deliberately no assumed URL outside local development - see README
  // "Environment configuration". A staging/production build must set
  // EXPO_PUBLIC_API_URL itself; failing fast here is safer than silently
  // shipping a guessed placeholder host.
  throw new Error(
    `EXPO_PUBLIC_API_URL must be set for the "${environment}" environment. ` +
      'No default server URL is assumed outside local development.'
  );
}

const environment = resolveEnvironment();
const apiBaseUrl = resolveApiBaseUrl(environment);

// Publishable key only - safe for client-side use (Stripe's own convention,
// mirrored by every official Stripe SDK). Deliberately does NOT throw when
// unset, unlike apiBaseUrl above: unlike the API base URL, nothing at app
// startup needs this - only the subscribe screen does, and it surfaces a
// clear error state there rather than crashing the whole app for members who
// never open that screen.
const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export const config = {
  environment,
  apiBaseUrl,
  stripePublishableKey,
} as const;
