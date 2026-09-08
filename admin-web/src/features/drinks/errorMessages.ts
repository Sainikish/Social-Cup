// Mirrors the cafes/mobile/barista-web errorMessages.ts convention: map
// stable ApiError.code values to user-facing copy, never the raw backend
// message.
export function drinkErrorMessage(code: string): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Please fix the highlighted fields and try again.';
    case 'CONFLICT':
      return 'A drink with this name already exists for this cafe.';
    case 'RESOURCE_NOT_FOUND':
      return 'This drink could not be found.';
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
