// Maps stable ApiError.code values (never the human-readable `message`,
// which is free to change) to user-facing copy. Anything not explicitly
// listed falls back to a generic message rather than leaking a backend
// implementation detail.
export function loginErrorMessage(code: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Incorrect email or password.';
    case 'ACCOUNT_LOCKED':
      return 'Your account is temporarily locked. Please try again later.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function registerErrorMessage(code: string): string {
  switch (code) {
    case 'CONFLICT':
      return 'An account with this email already exists.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
