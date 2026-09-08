import { apiClient } from '../../../src/api/client';
import { getRedemptions } from '../../../src/features/redemptions/api';
import type { AdminRedemptionResponse } from '../../../src/features/redemptions/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } };
});

const mockGet = vi.mocked(apiClient.get);

const SAMPLE_REDEMPTION: AdminRedemptionResponse = {
  redemptionId: 'redemption-1',
  memberId: 'member-1',
  memberEmail: 'ada@example.com',
  cafeId: 'cafe-1',
  cafeName: 'Blue Bottle Coffee',
  drinkId: 'drink-1',
  drinkName: 'Oat Milk Latte',
  creditsDeducted: 4,
  payoutRate: 0.8,
  createdAt: '2026-01-15T10:00:00Z',
};

const EMPTY_PAGE = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('redemptions api', () => {
  it('getRedemptions with no filters calls GET /admin/redemptions with only page/size/sort defaults', async () => {
    mockGet.mockResolvedValue({ data: EMPTY_PAGE });

    await getRedemptions();

    expect(mockGet).toHaveBeenCalledWith('/admin/redemptions', {
      params: {
        cafeId: undefined,
        memberId: undefined,
        drinkId: undefined,
        from: undefined,
        to: undefined,
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
      },
    });
  });

  it('getRedemptions passes every filter and pagination param through exactly', async () => {
    mockGet.mockResolvedValue({ data: EMPTY_PAGE });

    await getRedemptions({
      cafeId: 'cafe-1',
      memberId: 'member-1',
      drinkId: 'drink-1',
      from: '2026-01-01',
      to: '2026-01-31',
      page: 2,
      size: 50,
      sort: 'createdAt,asc',
    });

    expect(mockGet).toHaveBeenCalledWith('/admin/redemptions', {
      params: {
        cafeId: 'cafe-1',
        memberId: 'member-1',
        drinkId: 'drink-1',
        from: '2026-01-01',
        to: '2026-01-31',
        page: 2,
        size: 50,
        sort: 'createdAt,asc',
      },
    });
  });

  it('getRedemptions returns the PageResponse content unchanged', async () => {
    mockGet.mockResolvedValue({
      data: { ...EMPTY_PAGE, content: [SAMPLE_REDEMPTION], totalElements: 1, totalPages: 1, empty: false },
    });

    const result = await getRedemptions();

    expect(result.content).toEqual([SAMPLE_REDEMPTION]);
    expect(result.totalElements).toBe(1);
  });

  it('getRedemptions propagates a 403 ACCESS_DENIED error unchanged', async () => {
    const forbiddenError = {
      isAxiosError: true,
      response: { status: 403, data: { code: 'ACCESS_DENIED', message: 'denied' } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(forbiddenError);

    await expect(getRedemptions()).rejects.toBe(forbiddenError);
  });

  it('getRedemptions propagates a 400 TYPE_MISMATCH error unchanged for an invalid filter', async () => {
    const typeMismatchError = {
      isAxiosError: true,
      response: { status: 400, data: { code: 'TYPE_MISMATCH', message: "Parameter 'cafeId' has an invalid value" } },
      toJSON: () => ({}),
    };
    mockGet.mockRejectedValue(typeMismatchError);

    await expect(getRedemptions({ cafeId: 'not-a-uuid' })).rejects.toBe(typeMismatchError);
  });
});
