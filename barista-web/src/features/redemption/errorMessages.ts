// Maps stable ApiError.code values to user-facing copy - mirrors the
// codebase-wide errorMessages.ts convention (never display `message`
// directly; it is backend-internal and free to change).
//
// One deliberate, narrow exception: the three CONFLICT sub-cases below DO
// inspect the backend's message text via conflictErrorMessage(). The
// backend collapses "already redeemed", "expired", and "drink/cafe
// unavailable" into the exact same single CONFLICT code (see
// RedemptionService.redeem and RedemptionCodeService.generateCode) - `code`
// alone cannot distinguish them, and the product requirement is that a
// barista sees which of the three actually happened. The substrings checked
// are copied directly from those methods' real exception messages
// ("Redemption code has already been redeemed", "...has expired", "...is
// not currently available for redemption"). If a future backend wording
// change breaks this match, it simply falls through to a generic CONFLICT
// message below - the raw backend string is never rendered either way.
export function redemptionErrorMessage(code: string, message?: string): string {
  switch (code) {
    case 'RESOURCE_NOT_FOUND':
      // Deliberately identical whether the code is genuinely unknown or
      // belongs to another cafe (see RedemptionService.redeem) - the
      // frontend must never disclose that a code exists elsewhere.
      return 'Code not found or invalid.';
    case 'CONFLICT':
      return conflictErrorMessage(message);
    case 'INSUFFICIENT_CREDITS':
      return 'The member does not have enough credits.';
    case 'UNAUTHENTICATED':
      return 'Your session has expired. Please log in again.';
    case 'ACCESS_DENIED':
      return 'You are not authorized to perform this action.';
    case 'ACCOUNT_LOCKED':
      return 'This cafe account is temporarily locked.';
    case 'VALIDATION_ERROR':
      return 'Please scan or enter a code.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function conflictErrorMessage(message?: string): string {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('already been redeemed')) {
    return 'This code has already been used.';
  }
  if (normalized.includes('expired')) {
    return 'This code has expired.';
  }
  if (normalized.includes('not currently available for redemption')) {
    return 'This drink is no longer available.';
  }
  return 'This code could not be redeemed.';
}
