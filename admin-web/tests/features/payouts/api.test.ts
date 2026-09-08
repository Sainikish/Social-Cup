import { apiClient } from '../../../src/api/client';
import { calculatePayout, getPayoutsForCafe } from '../../../src/features/payouts/api';
import type { CalculatePayoutRequest, PayoutResponse } from '../../../src/features/payouts/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn() } };
});

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

const SAMPLE_PAYOUT: PayoutResponse = {
  id: 'payout-1',
  cafeId: 'cafe-1',
  periodStart: '2026-08-01',
  periodEnd: '2026-08-31',
  totalRedemptions: 42,
  totalCredits: 84,
  amountOwed: 168.0,
  amountPaid: null,
  paymentReference: null,
  paymentDate: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('payouts api', () => {
  it('getPayoutsForCafe calls GET /admin/cafes/{cafeId}/payouts', async () => {
    mockGet.mockResolvedValue({ data: [SAMPLE_PAYOUT] });

    const result = await getPayoutsForCafe('cafe-1');

    expect(mockGet).toHaveBeenCalledWith('/admin/cafes/cafe-1/payouts');
    expect(result).toEqual([SAMPLE_PAYOUT]);
  });

  it('calculatePayout calls POST /admin/cafes/{cafeId}/payouts with period boundaries', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_PAYOUT });

    const request: CalculatePayoutRequest = {
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
    };

    const result = await calculatePayout('cafe-1', request);

    expect(mockPost).toHaveBeenCalledWith('/admin/cafes/cafe-1/payouts', request);
    expect(result).toEqual(SAMPLE_PAYOUT);
  });

  it('propagates a 404 RESOURCE_NOT_FOUND error unchanged', async () => {
    const notFoundError = {
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'Cafe not found' } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(notFoundError);

    await expect(getPayoutsForCafe('nonexistent')).rejects.toBe(notFoundError);
  });

  it('propagates a 401 UNAUTHENTICATED error unchanged', async () => {
    const unauthenticatedError = {
      isAxiosError: true,
      response: { status: 401, data: { code: 'UNAUTHENTICATED', message: 'Auth required' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(unauthenticatedError);

    await expect(calculatePayout('cafe-1', { periodStart: '2026-01-01', periodEnd: '2026-01-31' })).rejects.toBe(
      unauthenticatedError
    );
  });
});
