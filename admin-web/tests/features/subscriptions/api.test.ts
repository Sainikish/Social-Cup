import { apiClient } from '../../../src/api/client';
import { getAllSubscriptions } from '../../../src/features/subscriptions/api';
import type { AdminSubscriptionResponse } from '../../../src/features/subscriptions/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { get: vi.fn() } };
});

const mockGet = vi.mocked(apiClient.get);

const SAMPLE_SUBSCRIPTION: AdminSubscriptionResponse = {
  subscriptionId: 'sub-1',
  memberId: 'member-1',
  memberEmail: 'ada@example.com',
  status: 'ACTIVE',
  currentPeriodStart: '2026-01-01',
  currentPeriodEnd: '2026-02-01',
  cancelAtPeriodEnd: false,
  paymentFailedCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('subscriptions api', () => {
  it('getAllSubscriptions calls GET /admin/subscriptions with no query parameters', async () => {
    mockGet.mockResolvedValue({ data: [SAMPLE_SUBSCRIPTION] });

    const result = await getAllSubscriptions();

    expect(mockGet).toHaveBeenCalledWith('/admin/subscriptions');
    expect(mockGet.mock.calls[0]).toHaveLength(1);
    expect(result).toEqual([SAMPLE_SUBSCRIPTION]);
  });

  it('maps the response into the exact AdminSubscriptionResponse shape, with no invented fields', async () => {
    mockGet.mockResolvedValue({ data: [SAMPLE_SUBSCRIPTION] });

    const [result] = await getAllSubscriptions();

    expect(Object.keys(result).sort()).toEqual(
      [
        'subscriptionId',
        'memberId',
        'memberEmail',
        'status',
        'currentPeriodStart',
        'currentPeriodEnd',
        'cancelAtPeriodEnd',
        'paymentFailedCount',
      ].sort()
    );
    expect(result).not.toHaveProperty('stripeCustomerId');
    expect(result).not.toHaveProperty('stripeSubscriptionId');
  });

  it('propagates a 401 UNAUTHENTICATED error unchanged', async () => {
    const unauthenticatedError = {
      isAxiosError: true,
      response: { status: 401, data: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(unauthenticatedError);

    await expect(getAllSubscriptions()).rejects.toBe(unauthenticatedError);
  });

  it('propagates a 403 ACCESS_DENIED error unchanged', async () => {
    const forbiddenError = {
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'You do not have permission' } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(forbiddenError);

    await expect(getAllSubscriptions()).rejects.toBe(forbiddenError);
  });

  it('propagates a generic server error unchanged', async () => {
    const serverError = {
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'boom' } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(serverError);

    await expect(getAllSubscriptions()).rejects.toBe(serverError);
  });
});
