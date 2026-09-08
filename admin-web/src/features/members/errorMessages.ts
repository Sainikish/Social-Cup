// Mirrors the cafes/drinks errorMessages.ts convention: map stable
// ApiError.code values to user-facing copy, never the raw backend message.
// CONFLICT covers BOTH "already suspended" and "not currently suspended" -
// the backend uses the same code for both (see AdminMemberService), only
// the human-readable message differs, and that message is not something
// this app branches on.
export function memberErrorMessage(code: string): string {
  switch (code) {
    case 'CONFLICT':
      return "This action could not be completed - the member's status may already have changed. Refresh and try again.";
    case 'RESOURCE_NOT_FOUND':
      return 'No member exists with this ID.';
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
