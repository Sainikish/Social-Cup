import type { ApiError } from '../types/api';

// Turns ApiError.fieldErrors (present only on VALIDATION_ERROR responses)
// into a plain { fieldName: message } map, generic enough for any form to
// merge into its own field-error state.
export function extractFieldErrors(apiError: ApiError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const violation of apiError.fieldErrors ?? []) {
    result[violation.field] = violation.message;
  }
  return result;
}

// A screen with no feature-specific error-code mapping (unlike auth/ratings,
// which have their own errorMessages.ts) still needs to avoid showing a raw
// Axios message for a network failure or timeout - toApiError() sets
// `message` to Axios's own text in that case (e.g. "Network Error", "timeout
// of 15000ms exceeded"), which isn't useful retry guidance. Everything else
// keeps the backend's own crafted ApiError.message, which is already
// human-readable (see backend GlobalExceptionHandler).
export function genericErrorMessage(apiError: ApiError): string {
  switch (apiError.code) {
    case 'NETWORK_ERROR':
      return 'Could not reach the server. Check your connection and try again.';
    case 'REQUEST_TIMEOUT':
      return 'The request took too long. Please try again.';
    default:
      return apiError.message;
  }
}
