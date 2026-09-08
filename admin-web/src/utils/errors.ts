import type { ApiError } from '../types/api';

// Flattens ApiError.fieldErrors (present only on VALIDATION_ERROR responses)
// into a field-name -> message map, keyed by the exact backend record
// component name (e.g. "payoutRate"), for a form to look up by field.
export function extractFieldErrors(apiError: ApiError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const violation of apiError.fieldErrors ?? []) {
    result[violation.field] = violation.message;
  }
  return result;
}

// A distinct, recognizable error thrown when a login/refresh succeeds at the
// backend but the resulting member does not carry the ADMIN role. The
// backend has no such concept itself (there is no "admin login" endpoint) -
// this is purely a frontend UX guard so a valid MEMBER credential can never
// land on an Admin Web screen. The backend's own /admin/** -> hasRole(ADMIN)
// rule remains the real authorization authority regardless; this error only
// stops the frontend from treating a non-admin session as usable here.
export class AdminAccessRequiredError extends Error {
  constructor() {
    super('Admin access required.');
    this.name = 'AdminAccessRequiredError';
  }
}

// Maps stable ApiError.code values (never the human-readable `message`,
// which is backend-internal and free to change) to user-facing copy -
// mirrors the errorMessages.ts convention already established in
// mobile/barista-web (e.g. barista-web/src/features/cafeLogin/errorMessages.ts).
export function loginErrorMessage(code: string): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Incorrect email or password. Please try again.';
    case 'ACCOUNT_LOCKED':
      return 'This account is temporarily locked due to multiple failed attempts. Please wait and try again.';
    case 'ACCESS_DENIED':
      return 'You are not authorized to perform this action.';
    case 'INVALID_TOKEN':
    case 'UNAUTHENTICATED':
      return 'Your session has expired. Please log in again.';
    case 'VALIDATION_ERROR':
      return 'Please enter a valid email and password.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
