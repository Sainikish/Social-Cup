const MAX_NOTE_LENGTH = 140;

// Client-side pre-checks only - the backend is the actual source of truth
// (see backend CreateRatingRequest/UpdateRatingRequest). These mirror those
// exact constraints so a user gets instant feedback instead of a round trip
// for an error the client could already see coming.

// Mirrors CreateRatingRequest.rating / UpdateRatingRequest.rating:
// @Min(1) @Max(5). `undefined` (no star tapped yet) is also invalid - a
// rating submission always requires an explicit 1-5 selection.
export function validateRatingValue(rating: number | undefined): string | undefined {
  if (rating === undefined) {
    return 'Select a rating from 1 to 5 stars';
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'Rating must be between 1 and 5 stars';
  }
  return undefined;
}

// Mirrors CreateRatingRequest.note / UpdateRatingRequest.note:
// @Size(max = 140), optional otherwise.
export function validateRatingNote(note: string): string | undefined {
  if (note.length > MAX_NOTE_LENGTH) {
    return `Note must not exceed ${MAX_NOTE_LENGTH} characters`;
  }
  return undefined;
}
