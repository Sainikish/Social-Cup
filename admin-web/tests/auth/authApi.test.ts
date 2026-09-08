import { apiClient } from '../../src/api/client';
import { loginAdmin, refreshAdmin } from '../../src/auth/authApi';
import type { AdminAuthResponse } from '../../src/auth/types';

vi.mock('../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/api/client')>('../../src/api/client');
  return { ...actual, apiClient: { post: vi.fn() } };
});

const mockPost = vi.mocked(apiClient.post);

const SAMPLE_RESPONSE: AdminAuthResponse = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: {
    id: 'member-1',
    email: 'admin@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    avatarUrl: null,
    status: 'ACTIVE',
    roles: ['ADMIN'],
    createdAt: '2026-01-01T00:00:00Z',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authApi', () => {
  it('loginAdmin calls POST /auth/login with exactly email and password', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_RESPONSE });

    const result = await loginAdmin({ email: 'admin@example.com', password: 'correct-horse-battery-staple' });

    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@example.com',
      password: 'correct-horse-battery-staple',
    });
    const [, sentBody] = mockPost.mock.calls[0];
    // Never sends a role - LoginRequest has no such field, and this app
    // must never invent one.
    expect(Object.keys(sentBody as object)).toEqual(['email', 'password']);
    expect(result).toEqual(SAMPLE_RESPONSE);
  });

  it('refreshAdmin calls POST /auth/refresh with only the refresh token', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_RESPONSE });

    const result = await refreshAdmin('refresh-1');

    expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-1' });
    expect(result).toEqual(SAMPLE_RESPONSE);
  });

  it('login errors propagate unchanged for the caller to map (e.g. INVALID_CREDENTIALS)', async () => {
    const backendError = {
      isAxiosError: true,
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(backendError);

    await expect(loginAdmin({ email: 'admin@example.com', password: 'wrong' })).rejects.toBe(backendError);
  });

  it('account-locked errors propagate unchanged for the caller to map', async () => {
    const backendError = {
      isAxiosError: true,
      response: { status: 401, data: { code: 'ACCOUNT_LOCKED', message: 'Account is temporarily locked' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(backendError);

    await expect(loginAdmin({ email: 'admin@example.com', password: 'wrong' })).rejects.toBe(backendError);
  });
});
