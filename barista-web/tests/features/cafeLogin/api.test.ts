import { apiClient } from '../../../src/api/client';
import { searchCafes } from '../../../src/features/cafeLogin/api';
import type { CafeSummaryResponse } from '../../../src/features/cafeLogin/types';
import type { PageResponse } from '../../../src/types/api';

vi.mock('../../../src/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

const mockGet = vi.mocked(apiClient.get);

const SAMPLE_CAFE: CafeSummaryResponse = {
  id: 'cafe-1',
  name: 'Blue Bottle Coffee',
  address: '123 Main St',
  neighbourhood: 'Downtown',
  latitude: null,
  longitude: null,
  featured: false,
  status: 'ACTIVE',
  vibeTags: null,
  primaryPhotoUrl: null,
  distanceKm: null,
};

function samplePage(): PageResponse<CafeSummaryResponse> {
  return {
    content: [SAMPLE_CAFE],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    first: true,
    last: true,
    empty: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cafeLogin api', () => {
  it('searchCafes calls GET /cafes/search with q, page, and size', async () => {
    mockGet.mockResolvedValue({ data: samplePage() });

    const result = await searchCafes({ q: 'blue', page: 0, size: 20 });

    expect(mockGet).toHaveBeenCalledWith('/cafes/search', { params: { q: 'blue', page: 0, size: 20 } });
    expect(result.content).toEqual([SAMPLE_CAFE]);
  });
});
