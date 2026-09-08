import type { CafeHoursDto, CafePhotoDto, CreateCafeRequest } from './types';

// Plain-string form state for every field the Create/Edit form actually
// presents. Kept deliberately separate from CreateCafeRequest/UpdateCafeRequest
// (the wire types) - an <input> only ever produces strings, and an empty
// string here means "not entered", not "explicitly set to empty".
export interface CafeFormValues {
  name: string;
  address: string;
  neighbourhood: string;
  latitude: string;
  longitude: string;
  phoneNumber: string;
  email: string;
  website: string;
  payoutRate: string;
  featured: boolean;
  vibeTags: string;
  description: string;
}

export const EMPTY_CAFE_FORM_VALUES: CafeFormValues = {
  name: '',
  address: '',
  neighbourhood: '',
  latitude: '',
  longitude: '',
  phoneNumber: '',
  email: '',
  website: '',
  payoutRate: '',
  featured: false,
  vibeTags: '',
  description: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Purely presentational pre-validation: every rule here mirrors a
// constraint the backend's own CreateCafeRequest/UpdateCafeRequest already
// declares (@NotBlank, @Size, @DecimalMin/@Max, @Email) - this only gives
// faster feedback, it invents no new business rule, and the backend still
// re-validates and remains the final authority (a bypass attempt just gets
// a 400 back from the server).
export function validateCafeForm(values: CafeFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length > 255) {
    errors.name = 'Name must not exceed 255 characters.';
  }

  const address = values.address.trim();
  if (!address) {
    errors.address = 'Address is required.';
  } else if (address.length > 500) {
    errors.address = 'Address must not exceed 500 characters.';
  }

  if (values.latitude.trim()) {
    const latitude = Number(values.latitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.latitude = 'Latitude must be between -90 and 90.';
    }
  }

  if (values.longitude.trim()) {
    const longitude = Number(values.longitude);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.longitude = 'Longitude must be between -180 and 180.';
    }
  }

  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (values.payoutRate.trim()) {
    const payoutRate = Number(values.payoutRate);
    if (!Number.isFinite(payoutRate) || payoutRate < 0 || payoutRate > 1) {
      errors.payoutRate = 'Payout rate must be between 0.0 and 1.0.';
    }
  }

  return errors;
}

function toOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

// Converts validated form state into the wire payload. openingHours/photos
// are NOT produced here - this form does not present those fields at all
// (out of Phase 2 scope), so callers that need to preserve existing values
// for those two fields (the Edit screen) merge them in separately rather
// than this helper guessing at them.
export function toCafeRequestPayload(values: CafeFormValues): CreateCafeRequest {
  return {
    name: values.name.trim(),
    address: values.address.trim(),
    neighbourhood: toOptionalString(values.neighbourhood),
    latitude: toOptionalNumber(values.latitude),
    longitude: toOptionalNumber(values.longitude),
    phoneNumber: toOptionalString(values.phoneNumber),
    email: toOptionalString(values.email),
    website: toOptionalString(values.website),
    payoutRate: toOptionalNumber(values.payoutRate),
    featured: values.featured,
    vibeTags: toOptionalString(values.vibeTags),
    description: toOptionalString(values.description),
  };
}

export function cafeFormValuesFromDetail(detail: {
  name: string;
  address: string;
  neighbourhood: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  featured: boolean;
  vibeTags: string | null;
  description: string | null;
}): CafeFormValues {
  return {
    name: detail.name,
    address: detail.address,
    neighbourhood: detail.neighbourhood ?? '',
    latitude: detail.latitude != null ? String(detail.latitude) : '',
    longitude: detail.longitude != null ? String(detail.longitude) : '',
    phoneNumber: detail.phoneNumber ?? '',
    email: detail.email ?? '',
    website: detail.website ?? '',
    payoutRate: '',
    featured: detail.featured,
    vibeTags: detail.vibeTags ?? '',
    description: detail.description ?? '',
  };
}

// Preserved unchanged from whatever detail response the Edit screen last
// loaded - this form presents no UI to edit hours/photos in Phase 2, so an
// update must resend the cafe's own current values verbatim rather than
// omitting them (omitting would unconditionally wipe them - see
// CafeMapper.updateEntity, which always overwrites openingHours/photos-adjacent
// fields, though photos itself is null-preserved; openingHours is not).
export function preservedHoursAndPhotos(detail: {
  openingHours: CafeHoursDto[];
  photos: CafePhotoDto[];
}): Pick<CreateCafeRequest, 'openingHours' | 'photos'> {
  return {
    openingHours: detail.openingHours,
    photos: detail.photos,
  };
}
