import { redemptionErrorMessage } from '../../../src/features/redemption/errorMessages';

describe('redemptionErrorMessage', () => {
  it('maps RESOURCE_NOT_FOUND (also covers a foreign-cafe code, per the backend treating both identically)', () => {
    expect(redemptionErrorMessage('RESOURCE_NOT_FOUND')).toBe('Code not found or invalid.');
  });

  it('maps INSUFFICIENT_CREDITS', () => {
    expect(redemptionErrorMessage('INSUFFICIENT_CREDITS')).toBe('The member does not have enough credits.');
  });

  it('maps UNAUTHENTICATED', () => {
    expect(redemptionErrorMessage('UNAUTHENTICATED')).toBe('Your session has expired. Please log in again.');
  });

  it('maps ACCESS_DENIED', () => {
    expect(redemptionErrorMessage('ACCESS_DENIED')).toBe('You are not authorized to perform this action.');
  });

  it('maps ACCOUNT_LOCKED', () => {
    expect(redemptionErrorMessage('ACCOUNT_LOCKED')).toBe('This cafe account is temporarily locked.');
  });

  it('maps network/timeout errors', () => {
    expect(redemptionErrorMessage('NETWORK_ERROR')).toBe(
      'Could not reach the server. Check your connection and try again.'
    );
    expect(redemptionErrorMessage('REQUEST_TIMEOUT')).toBe(
      'Could not reach the server. Check your connection and try again.'
    );
  });

  it('falls back to a generic message for an unrecognized code', () => {
    expect(redemptionErrorMessage('SOMETHING_ELSE')).toBe('Something went wrong. Please try again.');
  });

  describe('CONFLICT sub-cases (disambiguated via the backend message text)', () => {
    it('maps an already-redeemed conflict', () => {
      expect(redemptionErrorMessage('CONFLICT', 'Redemption code has already been redeemed')).toBe(
        'This code has already been used.'
      );
    });

    it('maps an expired conflict', () => {
      expect(redemptionErrorMessage('CONFLICT', 'Redemption code has expired')).toBe('This code has expired.');
    });

    it('maps a drink-unavailable conflict', () => {
      expect(redemptionErrorMessage('CONFLICT', 'Drink is not currently available for redemption')).toBe(
        'This drink is no longer available.'
      );
    });

    it('maps a cafe-unavailable conflict the same way', () => {
      expect(redemptionErrorMessage('CONFLICT', 'Cafe is not currently available for redemption')).toBe(
        'This drink is no longer available.'
      );
    });

    it('falls back to a generic conflict message for unrecognized wording - never the raw backend message', () => {
      expect(redemptionErrorMessage('CONFLICT', 'some unexpected new backend wording')).toBe(
        'This code could not be redeemed.'
      );
    });

    it('falls back to the generic conflict message when no message is provided at all', () => {
      expect(redemptionErrorMessage('CONFLICT')).toBe('This code could not be redeemed.');
    });
  });
});
