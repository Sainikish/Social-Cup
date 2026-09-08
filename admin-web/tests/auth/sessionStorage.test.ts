import { clearSession, getStoredRefreshToken, saveSession } from '../../src/auth/sessionStorage';

beforeEach(() => {
  sessionStorage.clear();
});

describe('auth/sessionStorage', () => {
  it('persists the refresh token in sessionStorage', () => {
    saveSession({ refreshToken: 'refresh-1' });

    expect(getStoredRefreshToken()).toBe('refresh-1');
    expect(sessionStorage.getItem('admin.refreshToken')).toBe('refresh-1');
  });

  it('stores nothing else in sessionStorage - no access token, no cafeId, no user data', () => {
    saveSession({ refreshToken: 'refresh-1' });

    expect(sessionStorage.length).toBe(1);
  });

  it('returns null when nothing has been stored', () => {
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('clearSession removes the stored refresh token entirely', () => {
    saveSession({ refreshToken: 'refresh-1' });
    clearSession();

    expect(getStoredRefreshToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});
