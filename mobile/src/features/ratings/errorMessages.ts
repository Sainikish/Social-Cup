// Maps stable ApiError.code values (never the human-readable `message`,
// which is free to change) to user-facing copy - mirrors
// src/features/auth/errorMessages.ts's pattern. Anything not explicitly
// listed falls back to a generic message rather than leaking a backend
// implementation detail.

// Used for GET /drinks/{drinkId}/ratings and GET /users/me/ratings|diary.
export function ratingsListErrorMessage(code: string): string {
  switch (code) {
    case 'RESOURCE_NOT_FOUND':
    case 'NOT_FOUND':
      return 'This drink could not be found.';
    case 'UNAUTHENTICATED':
      return 'Please log in to view this.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many requests. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Used for POST/PUT /drinks/{drinkId}/ratings. CONFLICT is the one case
// that gets its own specific copy: it means the member already has a rating
// for this drink (the backend enforces one rating per member per drink), so
// the fix is editing the existing rating, not retrying the same request.
export function ratingSubmitErrorMessage(code: string): string {
  switch (code) {
    case 'CONFLICT':
      return 'You already rated this drink. You can edit your existing rating.';
    case 'RESOURCE_NOT_FOUND':
    case 'NOT_FOUND':
      return 'This drink could not be found.';
    case 'UNAUTHENTICATED':
      return 'Please log in to rate this drink.';
    case 'ACCESS_DENIED':
      return 'You do not have permission to do that.';
    case 'VALIDATION_ERROR':
      return 'Please fix the highlighted fields and try again.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many requests. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
    case 'REQUEST_TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
