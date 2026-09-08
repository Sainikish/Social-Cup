import { apiClient } from '../../../src/api/client';
import { cancelSubscription, getMySubscription, subscribe } from '../../../src/features/subscription/api';
import type { SubscriptionResponse } from '../../../src/features/subscription/types';

jest.mock('../../../src/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

const ACTIVE_SUBSCRIPTION: SubscriptionResponse = {
  status: 'ACTIVE',
  currentPeriodStart: '2026-01-01',
  currentPeriodEnd: '2026-02-01',
  cancelAtPeriodEnd: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('subscription api', () => {
  it('getMySubscription calls GET /users/me/subscription', async () => {
    mockGet.mockResolvedValue({ data: ACTIVE_SUBSCRIPTION });

    const result = await getMySubscription();

    expect(mockGet).toHaveBeenCalledWith('/users/me/subscription');
    expect(result).toEqual(ACTIVE_SUBSCRIPTION);
  });

  it('subscribe calls POST /users/me/subscription with only paymentMethodId', async () => {
    mockPost.mockResolvedValue({ data: ACTIVE_SUBSCRIPTION });

    const result = await subscribe({ paymentMethodId: 'pm_123' });

    expect(mockPost).toHaveBeenCalledWith('/users/me/subscription', { paymentMethodId: 'pm_123' });
    expect(result).toEqual(ACTIVE_SUBSCRIPTION);
    // Never sends anything beyond the opaque PaymentMethod id.
    const [, sentBody] = mockPost.mock.calls[0];
    expect(Object.keys(sentBody as object)).toEqual(['paymentMethodId']);
  });

  it('cancelSubscription calls DELETE /users/me/subscription', async () => {
    const cancelled: SubscriptionResponse = { ...ACTIVE_SUBSCRIPTION, cancelAtPeriodEnd: true };
    mockDelete.mockResolvedValue({ data: cancelled });

    const result = await cancelSubscription();

    expect(mockDelete).toHaveBeenCalledWith('/users/me/subscription');
    expect(result).toEqual(cancelled);
  });
});
