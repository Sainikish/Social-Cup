// Mirrors the cafes/drinks/members errorMessages.ts convention: map stable
// ApiError.code values to user-facing copy, never the raw backend message.
export function subscriptionErrorMessage(code: string): string {
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'Your session has expired. Please log in again.';
    case 'ACCESS_DENIED':
      return 'You are not authorized to view subscriptions.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
