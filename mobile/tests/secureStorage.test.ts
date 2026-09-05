import * as authStorage from '../src/storage/authStorage';

describe('secure token storage abstraction', () => {
  it('can be imported and exposes the expected functions', () => {
    expect(typeof authStorage.saveAuthTokens).toBe('function');
    expect(typeof authStorage.getAccessToken).toBe('function');
    expect(typeof authStorage.getRefreshToken).toBe('function');
    expect(typeof authStorage.clearAuthTokens).toBe('function');
  });
});
