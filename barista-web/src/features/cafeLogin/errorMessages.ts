// Maps stable ApiError.code values (never the human-readable `message`) to
// user-facing copy - mirrors the mobile app's errorMessages.ts convention
// (e.g. features/subscription/errorMessages.ts).

// Used for POST /barista/login. INVALID_CREDENTIALS deliberately covers
// both "wrong PIN" and "unknown/inactive cafe" - the backend itself never
// lets a caller distinguish the two (see BaristaAuthService.login).
export function baristaLoginErrorMessage(code: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Incorrect cafe or PIN. Please try again.';
    case 'ACCOUNT_LOCKED':
      return 'This cafe account is temporarily locked due to multiple failed attempts. Please wait and try again.';
    case 'VALIDATION_ERROR':
      return 'Please select a cafe and enter the PIN.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
