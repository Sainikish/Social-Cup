import {
  EMPTY_CAFE_FORM_VALUES,
  cafeFormValuesFromDetail,
  toCafeRequestPayload,
  validateCafeForm,
} from '../../../src/features/cafes/formValues';

describe('validateCafeForm', () => {
  it('requires name and address', () => {
    const errors = validateCafeForm(EMPTY_CAFE_FORM_VALUES);

    expect(errors.name).toBe('Name is required.');
    expect(errors.address).toBe('Address is required.');
  });

  it('passes with only the required fields filled in', () => {
    const errors = validateCafeForm({ ...EMPTY_CAFE_FORM_VALUES, name: 'Daily Grind', address: '123 Main St' });

    expect(errors).toEqual({});
  });

  it('rejects an out-of-range latitude/longitude', () => {
    const errors = validateCafeForm({
      ...EMPTY_CAFE_FORM_VALUES,
      name: 'Daily Grind',
      address: '123 Main St',
      latitude: '200',
      longitude: '-200',
    });

    expect(errors.latitude).toBe('Latitude must be between -90 and 90.');
    expect(errors.longitude).toBe('Longitude must be between -180 and 180.');
  });

  it('rejects a malformed email', () => {
    const errors = validateCafeForm({
      ...EMPTY_CAFE_FORM_VALUES,
      name: 'Daily Grind',
      address: '123 Main St',
      email: 'not-an-email',
    });

    expect(errors.email).toBe('Enter a valid email address.');
  });

  it('rejects an out-of-range payout rate', () => {
    const errors = validateCafeForm({
      ...EMPTY_CAFE_FORM_VALUES,
      name: 'Daily Grind',
      address: '123 Main St',
      payoutRate: '1.5',
    });

    expect(errors.payoutRate).toBe('Payout rate must be between 0.0 and 1.0.');
  });
});

describe('toCafeRequestPayload', () => {
  it('converts blank optional fields to null, not empty strings', () => {
    const payload = toCafeRequestPayload({ ...EMPTY_CAFE_FORM_VALUES, name: 'Daily Grind', address: '123 Main St' });

    expect(payload).toMatchObject({
      name: 'Daily Grind',
      address: '123 Main St',
      neighbourhood: null,
      latitude: null,
      longitude: null,
      phoneNumber: null,
      email: null,
      website: null,
      payoutRate: null,
      vibeTags: null,
      description: null,
    });
  });

  it('parses numeric fields and trims strings', () => {
    const payload = toCafeRequestPayload({
      ...EMPTY_CAFE_FORM_VALUES,
      name: '  Daily Grind  ',
      address: '123 Main St',
      latitude: '40.7128',
      longitude: '-74.006',
      payoutRate: '0.15',
    });

    expect(payload.name).toBe('Daily Grind');
    expect(payload.latitude).toBe(40.7128);
    expect(payload.longitude).toBe(-74.006);
    expect(payload.payoutRate).toBe(0.15);
  });

  it('never invents an openingHours or photos field - the form does not present them', () => {
    const payload = toCafeRequestPayload({ ...EMPTY_CAFE_FORM_VALUES, name: 'Daily Grind', address: '123 Main St' });

    expect(payload).not.toHaveProperty('openingHours');
    expect(payload).not.toHaveProperty('photos');
  });
});

describe('cafeFormValuesFromDetail', () => {
  it('maps a public/admin detail response into form values, defaulting nulls to empty strings', () => {
    const values = cafeFormValuesFromDetail({
      name: 'Daily Grind',
      address: '123 Main St',
      neighbourhood: null,
      latitude: null,
      longitude: null,
      phoneNumber: null,
      email: null,
      website: null,
      featured: true,
      vibeTags: null,
      description: null,
    });

    expect(values.name).toBe('Daily Grind');
    expect(values.neighbourhood).toBe('');
    expect(values.featured).toBe(true);
    expect(values.payoutRate).toBe('');
  });
});
