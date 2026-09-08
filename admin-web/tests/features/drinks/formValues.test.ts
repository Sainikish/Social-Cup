import {
  drinkFormValuesFromResponse,
  EMPTY_DRINK_FORM_VALUES,
  toDrinkRequestPayload,
  validateDrinkForm,
} from '../../../src/features/drinks/formValues';
import type { DrinkResponse } from '../../../src/features/drinks/types';

describe('validateDrinkForm', () => {
  it('requires name, retail price and credit price', () => {
    const errors = validateDrinkForm(EMPTY_DRINK_FORM_VALUES);

    expect(errors.name).toBe('Name is required.');
    expect(errors.retailPrice).toBe('Retail price is required.');
    expect(errors.creditPrice).toBe('Credit price is required.');
  });

  it('passes with only the required fields filled in', () => {
    const errors = validateDrinkForm({
      ...EMPTY_DRINK_FORM_VALUES,
      name: 'Iced Latte',
      retailPrice: '4.50',
      creditPrice: '2',
    });

    expect(errors).toEqual({});
  });

  it('rejects a retail price below 0.01', () => {
    const errors = validateDrinkForm({
      ...EMPTY_DRINK_FORM_VALUES,
      name: 'Iced Latte',
      retailPrice: '0',
      creditPrice: '2',
    });

    expect(errors.retailPrice).toBe('Retail price must be at least 0.01.');
  });

  it('rejects a non-integer or zero credit price', () => {
    const errors = validateDrinkForm({
      ...EMPTY_DRINK_FORM_VALUES,
      name: 'Iced Latte',
      retailPrice: '4.50',
      creditPrice: '1.5',
    });

    expect(errors.creditPrice).toBe('Credit price must be a whole number of at least 1.');

    const zeroErrors = validateDrinkForm({
      ...EMPTY_DRINK_FORM_VALUES,
      name: 'Iced Latte',
      retailPrice: '4.50',
      creditPrice: '0',
    });

    expect(zeroErrors.creditPrice).toBe('Credit price must be a whole number of at least 1.');
  });
});

describe('toDrinkRequestPayload', () => {
  it('converts blank optional fields to null, and parses numeric fields independently', () => {
    const payload = toDrinkRequestPayload({
      ...EMPTY_DRINK_FORM_VALUES,
      name: '  Iced Latte  ',
      retailPrice: '4.50',
      creditPrice: '2',
    });

    expect(payload).toEqual({
      name: 'Iced Latte',
      type: null,
      description: null,
      retailPrice: 4.5,
      creditPrice: 2,
      photoUrl: null,
      signature: false,
    });
  });

  it('never derives creditPrice from retailPrice or vice versa', () => {
    const payload = toDrinkRequestPayload({
      ...EMPTY_DRINK_FORM_VALUES,
      name: 'Iced Latte',
      retailPrice: '100',
      creditPrice: '1',
    });

    expect(payload.retailPrice).toBe(100);
    expect(payload.creditPrice).toBe(1);
  });
});

describe('drinkFormValuesFromResponse', () => {
  it('maps a DrinkResponse into form values, defaulting nulls to empty strings', () => {
    const drink: DrinkResponse = {
      id: 'drink-1',
      cafeId: 'cafe-1',
      cafeName: 'Daily Grind',
      name: 'Iced Latte',
      type: null,
      description: null,
      retailPrice: 4.5,
      creditPrice: 2,
      photoUrl: null,
      signature: true,
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const values = drinkFormValuesFromResponse(drink);

    expect(values.name).toBe('Iced Latte');
    expect(values.type).toBe('');
    expect(values.retailPrice).toBe('4.5');
    expect(values.creditPrice).toBe('2');
    expect(values.signature).toBe(true);
  });
});
