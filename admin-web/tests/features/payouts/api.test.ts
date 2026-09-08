import { apiClient } from '../../../src/api/client';
import { calculatePayout, getAllPayouts, getPayoutsForCafe, markPayoutPaid } from '../../../src/features/payouts/api';
import type {
  CalculatePayoutRequest,
  MarkPayoutPaidRequest,
  PayoutResponse,
} from '../../../src/features/payouts/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);

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

  it('getAllPayouts calls GET /admin/payouts with no query parameters', async () => {
    mockGet.mockResolvedValue({ data: [SAMPLE_PAYOUT] });

    const result = await getAllPayouts();

    expect(mockGet).toHaveBeenCalledWith('/admin/payouts');
    expect(mockGet.mock.calls[0]).toHaveLength(1);
    expect(result).toEqual([SAMPLE_PAYOUT]);
  });

  it('markPayoutPaid calls PATCH /admin/cafes/{cafeId}/payouts/{payoutId} with exactly the mark-paid fields', async () => {
    const paidPayout: PayoutResponse = { ...SAMPLE_PAYOUT, amountPaid: 168.0, paymentReference: 'ACH-9988', paymentDate: '2026-09-01' };
    mockPatch.mockResolvedValue({ data: paidPayout });

    const request: MarkPayoutPaidRequest = {
      amountPaid: 168.0,
      paymentReference: 'ACH-9988',
      paymentDate: '2026-09-01',
    };

    const result = await markPayoutPaid('cafe-1', 'payout-1', request);

    expect(mockPatch).toHaveBeenCalledWith('/admin/cafes/cafe-1/payouts/payout-1', request);
    expect(Object.keys(request).sort()).toEqual(['amountPaid', 'paymentReference', 'paymentDate'].sort());
    expect(result).toEqual(paidPayout);
  });

  it('markPayoutPaid propagates a 404 RESOURCE_NOT_FOUND error unchanged', async () => {
    const notFoundError = {
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'Payout not found' } },
      toJSON: () => ({}),
    };
    mockPatch.mockRejectedValue(notFoundError);

    await expect(
      markPayoutPaid('cafe-1', 'missing-payout', { amountPaid: 10, paymentReference: 'REF', paymentDate: '2026-09-01' })
    ).rejects.toBe(notFoundError);
  });

  it('markPayoutPaid propagates a 409 CONFLICT (already paid) error unchanged', async () => {
    const conflictError = {
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'Payout has already been marked as paid' } },
      toJSON: () => ({}),
    };
    mockPatch.mockRejectedValue(conflictError);

    await expect(
      markPayoutPaid('cafe-1', 'payout-1', { amountPaid: 10, paymentReference: 'REF', paymentDate: '2026-09-01' })
    ).rejects.toBe(conflictError);
  });

  it('getAllPayouts propagates a 403 ACCESS_DENIED error unchanged', async () => {
    const forbiddenError = {
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(forbiddenError);

    await expect(getAllPayouts()).rejects.toBe(forbiddenError);
  });
});
