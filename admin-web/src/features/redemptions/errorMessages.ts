// Maps stable ApiError.code values to user-facing copy, avoiding raw
// backend exception messages.
export function redemptionErrorMessage(code: string): string {
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'TYPE_MISMATCH':
      return 'Please check the filters and try again.';
    case 'UNAUTHENTICATED':
      return 'Your session has expired. Please log in again.';
    case 'ACCESS_DENIED':
      return 'You are not authorized to perform this action.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
