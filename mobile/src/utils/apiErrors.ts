import type { ApiError } from '../types/api';

// Turns ApiError.fieldErrors (present only on VALIDATION_ERROR responses)
// into a plain { fieldName: message } map, generic enough for any form to
// merge into its own field-error state.
export function extractFieldErrors(apiError: ApiError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const violation of apiError.fieldErrors ?? []) {
    result[violation.field] = violation.message;
  }
  return result;
}
