import { baristaLoginErrorMessage } from '../../../src/features/cafeLogin/errorMessages';

describe('baristaLoginErrorMessage', () => {
  it('maps INVALID_CREDENTIALS', () => {
    expect(baristaLoginErrorMessage('INVALID_CREDENTIALS')).toBe('Incorrect cafe or PIN. Please try again.');
  });

  it('maps ACCOUNT_LOCKED', () => {
    expect(baristaLoginErrorMessage('ACCOUNT_LOCKED')).toBe(
      'This cafe account is temporarily locked due to multiple failed attempts. Please wait and try again.'
    );
  });

  it('maps VALIDATION_ERROR', () => {
    expect(baristaLoginErrorMessage('VALIDATION_ERROR')).toBe('Please select a cafe and enter the PIN.');
  });

  it('maps network/timeout errors', () => {
    expect(baristaLoginErrorMessage('NETWORK_ERROR')).toBe(
      'Could not reach the server. Check your connection and try again.'
    );
    expect(baristaLoginErrorMessage('REQUEST_TIMEOUT')).toBe(
      'Could not reach the server. Check your connection and try again.'
    );
  });

  it('falls back to a generic message for an unrecognized code', () => {
    expect(baristaLoginErrorMessage('SOMETHING_ELSE')).toBe('Something went wrong. Please try again.');
  });
});
