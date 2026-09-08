// Maps stable ApiError.code values (never the human-readable `message`,
// which can contain internal detail like a raw balance/memberId - see
// RedemptionCodeService.generateCode) to user-facing copy - mirrors
// src/features/subscription/errorMessages.ts's pattern.

// Used for POST /users/me/redemption-codes.
export function createRedemptionCodeErrorMessage(code: string): string {
  switch (code) {
    case 'INSUFFICIENT_CREDITS':
      return "You don't have enough credits for this drink.";
    case 'CONFLICT':
      return 'This drink is currently unavailable for redemption.';
    case 'RESOURCE_NOT_FOUND':
      return 'This drink is no longer available.';
    case 'UNAUTHENTICATED':
      return 'Please log in to redeem a drink.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
