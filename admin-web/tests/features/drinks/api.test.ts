import { apiClient } from '../../../src/api/client';
import {
  createDrink,
  getDrinksByCafe,
  getPublicDrinkById,
  updateDrink,
  updateDrinkStatus,
} from '../../../src/features/drinks/api';
import type { CreateDrinkRequest, DrinkResponse } from '../../../src/features/drinks/types';

vi.mock('../../../src/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/client')>('../../../src/api/client');
  return { ...actual, apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } };
});

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockPatch = vi.mocked(apiClient.patch);

const SAMPLE_CREATE_REQUEST: CreateDrinkRequest = {
  name: 'Iced Latte',
  type: 'Coffee',
  description: 'Espresso over ice with milk.',
  retailPrice: 4.5,
  creditPrice: 2,
  photoUrl: 'https://example.test/latte.jpg',
  signature: true,
};

const SAMPLE_DRINK: DrinkResponse = {
  id: 'drink-1',
  cafeId: 'cafe-1',
  cafeName: 'Daily Grind',
  name: 'Iced Latte',
  type: 'Coffee',
  description: 'Espresso over ice with milk.',
  retailPrice: 4.5,
  creditPrice: 2,
  photoUrl: 'https://example.test/latte.jpg',
  signature: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('drinks api', () => {
  it('getDrinksByCafe calls GET /cafes/{cafeId}/drinks with page/size params', async () => {
    mockGet.mockResolvedValue({
      data: { content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, first: true, last: true, empty: true },
    });

    await getDrinksByCafe({ cafeId: 'cafe-1' });

    expect(mockGet).toHaveBeenCalledWith('/cafes/cafe-1/drinks', { params: { page: 0, size: 50 } });
  });

  it('getPublicDrinkById calls GET /drinks/{id} and returns the drink response', async () => {
    mockGet.mockResolvedValue({ data: SAMPLE_DRINK });

    const result = await getPublicDrinkById('drink-1');

    expect(mockGet).toHaveBeenCalledWith('/drinks/drink-1');
    expect(result).toEqual(SAMPLE_DRINK);
  });

  it('createDrink calls POST /admin/cafes/{cafeId}/drinks with exactly the CreateDrinkRequest shape, no cafeId in the body', async () => {
    mockPost.mockResolvedValue({ data: SAMPLE_DRINK });

    const result = await createDrink('cafe-1', SAMPLE_CREATE_REQUEST);

    expect(mockPost).toHaveBeenCalledWith('/admin/cafes/cafe-1/drinks', SAMPLE_CREATE_REQUEST);
    expect(Object.keys(SAMPLE_CREATE_REQUEST)).not.toContain('cafeId');
    expect(result).toEqual(SAMPLE_DRINK);
  });

  it('updateDrink calls PUT /admin/drinks/{id} with the request body', async () => {
    mockPut.mockResolvedValue({ data: SAMPLE_DRINK });

    const result = await updateDrink('drink-1', SAMPLE_CREATE_REQUEST);

    expect(mockPut).toHaveBeenCalledWith('/admin/drinks/drink-1', SAMPLE_CREATE_REQUEST);
    expect(result).toEqual(SAMPLE_DRINK);
  });

  it('updateDrinkStatus calls PATCH /admin/drinks/{id}/status with only {status}', async () => {
    mockPatch.mockResolvedValue({ data: { ...SAMPLE_DRINK, status: 'INACTIVE' } });

    const result = await updateDrinkStatus('drink-1', { status: 'INACTIVE' });

    expect(mockPatch).toHaveBeenCalledWith('/admin/drinks/drink-1/status', { status: 'INACTIVE' });
    expect(result.status).toBe('INACTIVE');
  });

  it('createDrink propagates a CONFLICT (duplicate drink name for this cafe) error unchanged', async () => {
    const conflictError = {
      isAxiosError: true,
      response: { status: 409, data: { code: 'CONFLICT', message: "Drink with name 'Iced Latte' already exists for this cafe" } },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(conflictError);

    await expect(createDrink('cafe-1', SAMPLE_CREATE_REQUEST)).rejects.toBe(conflictError);
  });

  it('createDrink propagates a VALIDATION_ERROR with fieldErrors unchanged', async () => {
    const validationError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fieldErrors: [{ field: 'retailPrice', message: 'Retail price must be positive' }],
        },
      },
      toJSON: () => ({}),
    };
    mockPost.mockRejectedValue(validationError);

    await expect(createDrink('cafe-1', { ...SAMPLE_CREATE_REQUEST, retailPrice: 0 })).rejects.toBe(validationError);
  });

  it('updateDrink propagates a RESOURCE_NOT_FOUND error unchanged', async () => {
    const notFoundError = {
      isAxiosError: true,
      response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'Drink not found' } },
      toJSON: () => ({}),
    };
    mockPut.mockRejectedValue(notFoundError);

    await expect(updateDrink('missing-id', SAMPLE_CREATE_REQUEST)).rejects.toBe(notFoundError);
  });

  it('updateDrinkStatus propagates a generic server error unchanged', async () => {
    const serverError = {
      isAxiosError: true,
      response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
      toJSON: () => ({}),
    };
    mockPatch.mockRejectedValue(serverError);

    await expect(updateDrinkStatus('drink-1', { status: 'ARCHIVED' })).rejects.toBe(serverError);
  });
});
