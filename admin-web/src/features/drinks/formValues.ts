import type { CreateDrinkRequest, DrinkResponse } from './types';

// Plain-string form state for every field the Create/Edit form presents.
// Kept separate from CreateDrinkRequest/UpdateDrinkRequest (the wire
// types) - an <input> only ever produces strings.
export interface DrinkFormValues {
  name: string;
  type: string;
  description: string;
  retailPrice: string;
  creditPrice: string;
  photoUrl: string;
  signature: boolean;
}

export const EMPTY_DRINK_FORM_VALUES: DrinkFormValues = {
  name: '',
  type: '',
  description: '',
  retailPrice: '',
  creditPrice: '',
  photoUrl: '',
  signature: false,
};

// Purely presentational pre-validation: every rule mirrors a constraint
// CreateDrinkRequest/UpdateDrinkRequest already declares (@NotBlank, @Size,
// @NotNull/@DecimalMin, @Min) - faster feedback only, no new business rule.
// The backend still re-validates and remains the final authority.
export function validateDrinkForm(values: DrinkFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = 'Name is required.';
  } else if (name.length > 255) {
    errors.name = 'Name must not exceed 255 characters.';
  }

  if (values.type.trim().length > 100) {
    errors.type = 'Type must not exceed 100 characters.';
  }

  if (values.photoUrl.trim().length > 2048) {
    errors.photoUrl = 'Photo URL must not exceed 2048 characters.';
  }

  const retailPriceTrimmed = values.retailPrice.trim();
  if (!retailPriceTrimmed) {
    errors.retailPrice = 'Retail price is required.';
  } else {
    const retailPrice = Number(retailPriceTrimmed);
    if (!Number.isFinite(retailPrice) || retailPrice < 0.01) {
      errors.retailPrice = 'Retail price must be at least 0.01.';
    }
  }

  const creditPriceTrimmed = values.creditPrice.trim();
  if (!creditPriceTrimmed) {
    errors.creditPrice = 'Credit price is required.';
  } else {
    const creditPrice = Number(creditPriceTrimmed);
    if (!Number.isInteger(creditPrice) || creditPrice < 1) {
      errors.creditPrice = 'Credit price must be a whole number of at least 1.';
    }
  }

  return errors;
}

function toOptionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Converts validated form state into the wire payload. There is no
// computed relationship between retailPrice and creditPrice - both are
// independent, directly-entered values; neither is ever derived from the
// other client-side.
export function toDrinkRequestPayload(values: DrinkFormValues): CreateDrinkRequest {
  return {
    name: values.name.trim(),
    type: toOptionalString(values.type),
    description: toOptionalString(values.description),
    retailPrice: Number(values.retailPrice.trim()),
    creditPrice: Number(values.creditPrice.trim()),
    photoUrl: toOptionalString(values.photoUrl),
    signature: values.signature,
  };
}

// Unlike Cafe's payoutRate, DrinkResponse is the SAME shape returned by
// every endpoint this app reaches (public or admin) - there is no field
// this can be missing that an edit form would need to treat as "unknown".
export function drinkFormValuesFromResponse(drink: DrinkResponse): DrinkFormValues {
  return {
    name: drink.name,
    type: drink.type ?? '',
    description: drink.description ?? '',
    retailPrice: drink.retailPrice != null ? String(drink.retailPrice) : '',
    creditPrice: String(drink.creditPrice),
    photoUrl: drink.photoUrl ?? '',
    signature: drink.signature,
  };
}
