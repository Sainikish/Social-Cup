import { apiClient } from '../../../src/api/client';
import { getDashboardMetrics } from '../../../src/features/dashboardMetrics/api';
import type { AdminDashboardMetricsResponse } from '../../../src/features/dashboardMetrics/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } };
});

const mockGet = vi.mocked(apiClient.get);

const SAMPLE_METRICS: AdminDashboardMetricsResponse = {
  totalMembers: 42,
  totalActiveCafes: 7,
  totalActiveDrinks: 15,
  totalRedemptions: 300,
  totalCreditsRedeemed: 1200,
  totalPayoutAmountOwed: 960.0,
  totalPayoutAmountPaid: 640.0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dashboard metrics api', () => {
  it('getDashboardMetrics calls GET /admin/dashboard/metrics with no parameters', async () => {
    mockGet.mockResolvedValue({ data: SAMPLE_METRICS });

    await getDashboardMetrics();

    expect(mockGet).toHaveBeenCalledWith('/admin/dashboard/metrics');
  });

  it('getDashboardMetrics returns the response body unchanged', async () => {
    mockGet.mockResolvedValue({ data: SAMPLE_METRICS });

    const result = await getDashboardMetrics();

    expect(result).toEqual(SAMPLE_METRICS);
  });

  it('getDashboardMetrics returns all-zero values from an empty backend dataset unchanged', async () => {
    const zeroMetrics: AdminDashboardMetricsResponse = {
      totalMembers: 0,
      totalActiveCafes: 0,
      totalActiveDrinks: 0,
      totalRedemptions: 0,
      totalCreditsRedeemed: 0,
      totalPayoutAmountOwed: 0,
      totalPayoutAmountPaid: 0,
    };
    mockGet.mockResolvedValue({ data: zeroMetrics });

    const result = await getDashboardMetrics();

    expect(result).toEqual(zeroMetrics);
  });

  it('getDashboardMetrics propagates a 403 ACCESS_DENIED error unchanged', async () => {
    const forbiddenError = {
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(forbiddenError);

    await expect(getDashboardMetrics()).rejects.toBe(forbiddenError);
  });

  it('getDashboardMetrics propagates a network error unchanged', async () => {
    const networkError = {
      isAxiosError: true,
      response: undefined,
      code: 'ECONNABORTED',
      message: 'timeout',
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(networkError);

    await expect(getDashboardMetrics()).rejects.toBe(networkError);
  });
});
