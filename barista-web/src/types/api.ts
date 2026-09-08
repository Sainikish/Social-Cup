// Mirrors com.socialcup.common.dto.PageResponse<T> exactly (field names and
// shape) - every paginated backend endpoint returns this. Copied verbatim
// from the mobile app's own src/types/api.ts (same backend, same DTO).
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Mirrors com.socialcup.common.dto.FieldViolation - present only inside
// ApiError.fieldErrors, and only for validation failures.
export interface FieldViolation {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

// Mirrors com.socialcup.common.dto.ApiError - the shape of every error
// response from the backend, regardless of which layer produced it. `code`
// is the stable, machine-readable identifier to branch on - never `message`
// (human-readable, may change) or `status` alone (several codes can share
// the same HTTP status).
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  code: string;
  message: string;
  path: string;
  requestId: string;
  fieldErrors?: FieldViolation[];
}
