import { apiClient } from '../../../src/api/client';
import {
  getCafeById,
  getCafeDrinks,
  getCafes,
  getFeaturedCafes,
  searchCafes,
} from '../../../src/features/cafes/api';
import type {
  CafeDetailResponse,
  CafeSummaryResponse,
  DrinkResponse,
} from '../../../src/features/cafes/types';
import type { PageResponse } from '../../../src/types/api';

jest.mock('../../../src/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const SAMPLE_CAFE: CafeSummaryResponse = {
  id: 'cafe-1',
  name: 'Blue Bottle Coffee',
  address: '300 Main St',
  neighbourhood: 'Downtown',
  latitude: 40.7128,
  longitude: -74.006,
  featured: true,
  status: 'ACTIVE',
  vibeTags: 'cozy,quiet',
  primaryPhotoUrl: 'https://example.com/photo.jpg',
  distanceKm: null,
};

function pageOf(content: CafeSummaryResponse[]): PageResponse<CafeSummaryResponse> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('cafes api', () => {
  it('getCafes calls GET /cafes with neighbourhood, featured, page, size', async () => {
    mockGet.mockResolvedValue({ data: pageOf([SAMPLE_CAFE]) });

    const result = await getCafes({ neighbourhood: 'Downtown', featured: true, page: 0, size: 20 });

    expect(mockGet).toHaveBeenCalledWith('/cafes', {
      params: { neighbourhood: 'Downtown', featured: true, page: 0, size: 20 },
    });
    expect(result.content).toEqual([SAMPLE_CAFE]);
  });

  it('searchCafes calls GET /cafes/search with q, neighbourhood, lat, lng, page, size', async () => {
    mockGet.mockResolvedValue({ data: pageOf([SAMPLE_CAFE]) });

    const result = await searchCafes({ q: 'blue', neighbourhood: 'Downtown', page: 0, size: 20 });

    expect(mockGet).toHaveBeenCalledWith('/cafes/search', {
      params: { q: 'blue', neighbourhood: 'Downtown', lat: undefined, lng: undefined, page: 0, size: 20 },
    });
    expect(result.content).toEqual([SAMPLE_CAFE]);
  });

  it('getFeaturedCafes calls GET /cafes/featured with page, size', async () => {
    mockGet.mockResolvedValue({ data: pageOf([SAMPLE_CAFE]) });

    const result = await getFeaturedCafes({ page: 0, size: 20 });

    expect(mockGet).toHaveBeenCalledWith('/cafes/featured', { params: { page: 0, size: 20 } });
    expect(result.content).toEqual([SAMPLE_CAFE]);
  });

  it('getCafeById calls GET /cafes/{id}', async () => {
    const detail: CafeDetailResponse = {
      id: 'cafe-1',
      name: 'Blue Bottle Coffee',
      address: '300 Main St',
      neighbourhood: 'Downtown',
      latitude: 40.7128,
      longitude: -74.006,
      openingHours: [],
      phoneNumber: null,
      email: null,
      website: null,
      featured: true,
      vibeTags: null,
      description: null,
      status: 'ACTIVE',
      photos: [],
      drinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockGet.mockResolvedValue({ data: detail });

    const result = await getCafeById('cafe-1');

    expect(mockGet).toHaveBeenCalledWith('/cafes/cafe-1');
    expect(result).toEqual(detail);
    // The public detail type must never carry payoutRate.
    expect(result).not.toHaveProperty('payoutRate');
  });

  it('getCafeDrinks calls GET /cafes/{id}/drinks with page, size', async () => {
    const drink: DrinkResponse = {
      id: 'drink-1',
      cafeId: 'cafe-1',
      cafeName: 'Blue Bottle Coffee',
      name: 'Cortado',
      type: 'Espresso',
      description: null,
      retailPrice: 4.5,
      creditPrice: 4,
      photoUrl: null,
      signature: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockGet.mockResolvedValue({
      data: {
        content: [drink],
        page: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    const result = await getCafeDrinks('cafe-1', { page: 0, size: 50 });

    expect(mockGet).toHaveBeenCalledWith('/cafes/cafe-1/drinks', { params: { page: 0, size: 50 } });
    expect(result.content).toEqual([drink]);
  });
});
