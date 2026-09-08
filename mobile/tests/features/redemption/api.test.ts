import { apiClient } from '../../../src/api/client';
import { createRedemptionCode } from '../../../src/features/redemption/api';
import type { RedemptionCodeResponse } from '../../../src/features/redemption/types';

jest.mock('../../../src/api/client', () => ({
  apiClient: { post: jest.fn() },
}));

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const SAMPLE_RESPONSE: RedemptionCodeResponse = {
  code: 'sJ3f9x2k',
  backupCode: '004821',
  validUntil: '2026-01-01T00:05:00Z',
  drinkId: 'drink-1',
  drinkName: 'Cortado',
  cafeId: 'cafe-1',
  cafeName: 'Blue Bottle Coffee',
  creditPrice: 4,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('redemption api', () => {
  it('createRedemptionCode calls POST /users/me/redemption-codes with only drinkId', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_RESPONSE });

    const result = await createRedemptionCode('drink-1');

    expect(mockPost).toHaveBeenCalledWith('/users/me/redemption-codes', { drinkId: 'drink-1' });
    expect(result).toEqual(SAMPLE_RESPONSE);
  });

  it('never sends anything beyond drinkId in the request body', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_RESPONSE });

    await createRedemptionCode('drink-1');

    const [, sentBody] = mockPost.mock.calls[0];
    expect(Object.keys(sentBody as object)).toEqual(['drinkId']);
  });

  it('propagates a rejected request (e.g. an INSUFFICIENT_CREDITS 409) to the caller unchanged', async () => {
    const backendError = {
      isAxiosError: true,
      response: { status: 409, data: { code: 'INSUFFICIENT_CREDITS', message: 'insufficient credits' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(backendError);

    await expect(createRedemptionCode('drink-1')).rejects.toBe(backendError);
  });
});
