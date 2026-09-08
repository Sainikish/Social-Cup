import { apiClient } from '../../src/api/client';
import { loginBarista, refreshBarista } from '../../src/auth/api';
import type { BaristaAuthResponse } from '../../src/auth/types';

vi.mock('../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/api/client')>('../../src/api/client');
  return { ...actual, apiClient: { post: vi.fn() } };
});

const mockPost = vi.mocked(apiClient.post);

const SAMPLE_RESPONSE: BaristaAuthResponse = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  cafeId: 'cafe-1',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('auth api', () => {
  it('loginBarista calls POST /barista/login with cafeId and pin', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_RESPONSE });

    const result = await loginBarista({ cafeId: 'cafe-1', pin: '1234' });

    expect(mockPost).toHaveBeenCalledWith('/barista/login', { cafeId: 'cafe-1', pin: '1234' });
    expect(result).toEqual(SAMPLE_RESPONSE);
  });

  it('refreshBarista calls POST /barista/refresh with only the refresh token', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_RESPONSE });

    const result = await refreshBarista('refresh-1');

    expect(mockPost).toHaveBeenCalledWith('/barista/refresh', { refreshToken: 'refresh-1' });
    expect(result).toEqual(SAMPLE_RESPONSE);
  });

  it('login errors propagate unchanged for the caller to map (e.g. INVALID_CREDENTIALS)', async () => {
    const backendError = {
      isAxiosError: true,
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(backendError);

    await expect(loginBarista({ cafeId: 'cafe-1', pin: 'wrong' })).rejects.toBe(backendError);
  });
});
