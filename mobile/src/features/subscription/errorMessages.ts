// Maps stable ApiError.code values (never the human-readable `message`) to
// user-facing copy - mirrors src/features/ratings/errorMessages.ts's pattern.
// RESOURCE_NOT_FOUND is deliberately absent from both: the screen interprets
// it as "not subscribed" before ever reaching one of these functions, never
// as a generic error.

// Used for POST /users/me/subscription. The backend collapses "already
// subscribed" AND any Stripe-side failure (declined card, etc.) into the
// same CONFLICT/409 (see SubscriptionService.subscribe) - it cannot be told
// apart from the response alone, so the copy covers both possibilities.
export function subscribeErrorMessage(code: string): string {
  switch (code) {
    case 'CONFLICT':
      return "We couldn't complete your subscription. Check your card details and try again.";
    case 'UNAUTHENTICATED':
      return 'Please log in to subscribe.';
    case 'VALIDATION_ERROR':
      return 'Please try again.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Used for DELETE /users/me/subscription. CONFLICT here specifically means
// "already cancelled" or "cancellation already scheduled" (see
// SubscriptionService.cancel) - the screen's own state normally prevents
// this by not showing a cancel action in either case, so this is a fallback
// for a stale screen state, not the primary path.
export function cancelErrorMessage(code: string): string {
  switch (code) {
    case 'CONFLICT':
      return 'This subscription is already cancelled or scheduled to cancel.';
    case 'RESOURCE_NOT_FOUND':
      return 'No active subscription was found.';
    case 'UNAUTHENTICATED':
      return 'Please log in to manage your subscription.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
