// Mirrors the mobile/barista-web errorMessages.ts convention: map stable
// ApiError.code values to user-facing copy, never the raw backend message.
export function cafeErrorMessage(code: string): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Please fix the highlighted fields and try again.';
    case 'CONFLICT':
      return 'A cafe with this name and address already exists.';
    case 'RESOURCE_NOT_FOUND':
      return 'This cafe could not be found.';
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
