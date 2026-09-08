import { apiClient } from '../../../src/api/client';
import { redeemCode } from '../../../src/features/redemption/api';
import type { RedemptionResponse } from '../../../src/features/redemption/types';

vi.mock('../../../src/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

const mockPost = vi.mocked(apiClient.post);

const SAMPLE_RESPONSE: RedemptionResponse = {
  redemptionId: 'redemption-1',
  drinkId: 'drink-1',
  drinkName: 'Oat Milk Latte',
  creditsDeducted: 4,
  memberFirstName: 'Ada',
  redeemedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('redemption api', () => {
  it('redeemCode calls POST /barista/redeem with only the code', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_RESPONSE });

    const result = await redeemCode('abc123');

    expect(mockPost).toHaveBeenCalledWith('/barista/redeem', { code: 'abc123' });
    expect(result).toEqual(SAMPLE_RESPONSE);
  });

  it('never sends anything beyond the code (never a cafeId)', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_RESPONSE });

    await redeemCode('abc123');

    const [, sentBody] = mockPost.mock.calls[0];
    expect(Object.keys(sentBody as object)).toEqual(['code']);
  });

  it('propagates a rejected request unchanged', async () => {
    const backendError = {
      isAxiosError: true,
      response: { status: 409, data: { code: 'INSUFFICIENT_CREDITS', message: 'insufficient credits' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(backendError);

    await expect(redeemCode('abc123')).rejects.toBe(backendError);
  });
});
