import { apiClient } from '../../../src/api/client';
import { createCafe, getPublicCafeById, searchCafes, updateCafe, updateCafeStatus } from '../../../src/features/cafes/api';
import type { AdminCafeDetailResponse, CafeDetailResponse, CreateCafeRequest } from '../../../src/features/cafes/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } };
});

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockPatch = vi.mocked(apiClient.patch);

const SAMPLE_CREATE_REQUEST: CreateCafeRequest = {
  name: 'Daily Grind',
  address: '123 Main St',
  neighbourhood: 'Downtown',
  latitude: 40.7128,
  longitude: -74.006,
  phoneNumber: '555-0100',
  email: 'hello@dailygrind.test',
  website: 'https://dailygrind.test',
  payoutRate: 0.1,
  featured: true,
  vibeTags: 'cozy,quiet',
  description: 'A cozy neighbourhood cafe.',
};

const SAMPLE_ADMIN_DETAIL: AdminCafeDetailResponse = {
  id: 'cafe-1',
  name: 'Daily Grind',
  address: '123 Main St',
  neighbourhood: 'Downtown',
  latitude: 40.7128,
  longitude: -74.006,
  openingHours: [],
  phoneNumber: '555-0100',
  email: 'hello@dailygrind.test',
  website: 'https://dailygrind.test',
  payoutRate: 0.1,
  featured: true,
  vibeTags: 'cozy,quiet',
  description: 'A cozy neighbourhood cafe.',
  status: 'ACTIVE',
  photos: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const SAMPLE_PUBLIC_DETAIL: CafeDetailResponse = {
  id: 'cafe-1',
  name: 'Daily Grind',
  address: '123 Main St',
  neighbourhood: 'Downtown',
  latitude: 40.7128,
  longitude: -74.006,
  openingHours: [],
  phoneNumber: '555-0100',
  email: 'hello@dailygrind.test',
  website: 'https://dailygrind.test',
  featured: true,
  vibeTags: 'cozy,quiet',
  description: 'A cozy neighbourhood cafe.',
  status: 'ACTIVE',
  photos: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cafes api', () => {
  it('searchCafes calls GET /cafes/search with q/page/size params', async () => {
    mockGet.mockResolvedValue({
      data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true, empty: true },
    });

    await searchCafes({ q: 'grind' });

    expect(mockGet).toHaveBeenCalledWith('/cafes/search', { params: { q: 'grind', page: 0, size: 20 } });
  });

  it('getPublicCafeById calls GET /cafes/{id} and returns the public detail response (no payoutRate)', async () => {
    mockGet.mockResolvedValue({ data: SAMPLE_PUBLIC_DETAIL });

    const result = await getPublicCafeById('cafe-1');

    expect(mockGet).toHaveBeenCalledWith('/cafes/cafe-1');
    expect(result).toEqual(SAMPLE_PUBLIC_DETAIL);
    expect(result).not.toHaveProperty('payoutRate');
  });

  it('createCafe calls POST /admin/cafes with exactly the CreateCafeRequest shape given, no extra fields', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_ADMIN_DETAIL });

    const result = await createCafe(SAMPLE_CREATE_REQUEST);

    expect(mockPost).toHaveBeenCalledWith('/admin/cafes', SAMPLE_CREATE_REQUEST);
    expect(result).toEqual(SAMPLE_ADMIN_DETAIL);
  });

  it('updateCafe calls PUT /admin/cafes/{id} with the request body', async () => {
    mockPut.mockResolvedValue({ data: SAMPLE_ADMIN_DETAIL });

    const result = await updateCafe('cafe-1', SAMPLE_CREATE_REQUEST);

    expect(mockPut).toHaveBeenCalledWith('/admin/cafes/cafe-1', SAMPLE_CREATE_REQUEST);
    expect(result).toEqual(SAMPLE_ADMIN_DETAIL);
  });

  it('updateCafeStatus calls PATCH /admin/cafes/{id}/status with only {status}', async () => {
    mockPatch.mockResolvedValue({ data: { ...SAMPLE_ADMIN_DETAIL, status: 'INACTIVE' } });

    const result = await updateCafeStatus('cafe-1', { status: 'INACTIVE' });

    expect(mockPatch).toHaveBeenCalledWith('/admin/cafes/cafe-1/status', { status: 'INACTIVE' });
    expect(result.status).toBe('INACTIVE');
  });

  it('createCafe propagates a CONFLICT (duplicate cafe) error unchanged', async () => {
    const conflictError = {
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: 'A cafe with this name and address already exists' } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(conflictError);

    await expect(createCafe(SAMPLE_CREATE_REQUEST)).rejects.toBe(conflictError);
  });

  it('createCafe propagates a VALIDATION_ERROR with fieldErrors unchanged', async () => {
    const validationError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fieldErrors: [{ field: 'name', message: 'must not be blank' }],
        },
      },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(validationError);

    await expect(createCafe({ ...SAMPLE_CREATE_REQUEST, name: '' })).rejects.toBe(validationError);
  });

  it('updateCafe propagates a RESOURCE_NOT_FOUND error unchanged', async () => {
    const notFoundError = {
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'Cafe not found' } },
      toJSON: () => ({}),
    };
    mockPut.mockRejectedValue(notFoundError);

    await expect(updateCafe('missing-id', SAMPLE_CREATE_REQUEST)).rejects.toBe(notFoundError);
  });

  it('updateCafeStatus propagates a generic server error unchanged', async () => {
    const serverError = {
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
      toJSON: () => ({}),
    };
    mockPatch.mockRejectedValue(serverError);

    await expect(updateCafeStatus('cafe-1', { status: 'ARCHIVED' })).rejects.toBe(serverError);
  });
});
