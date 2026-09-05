import { apiClient } from '../../../src/api/client';
import { getDrinkById, getSignatureDrinks } from '../../../src/features/drinks/api';
import type { DrinkResponse } from '../../../src/features/drinks/types';

jest.mock('../../../src/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const SAMPLE_DRINK: DrinkResponse = {
  id: 'drink-1',
  cafeId: 'cafe-1',
  cafeName: 'Blue Bottle Coffee',
  name: 'Cortado',
  type: 'Espresso',
  description: 'A short, strong shot cut with steamed milk.',
  retailPrice: 4.5,
  creditPrice: 4,
  photoUrl: 'https://example.com/cortado.jpg',
  signature: true,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('drinks api', () => {
  it('getSignatureDrinks calls GET /drinks/signature with page and size only', async () => {
    mockGet.mockResolvedValue({
      data: {
        content: [SAMPLE_DRINK],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        empty: false,
      },
    });

    const result = await getSignatureDrinks({ page: 0, size: 20 });

    expect(mockGet).toHaveBeenCalledWith('/drinks/signature', { params: { page: 0, size: 20 } });
    expect(result.content).toEqual([SAMPLE_DRINK]);
  });

  it('getDrinkById calls GET /drinks/{id}', async () => {
    mockGet.mockResolvedValue({ data: SAMPLE_DRINK });

    const result = await getDrinkById('drink-1');

    expect(mockGet).toHaveBeenCalledWith('/drinks/drink-1');
    expect(result).toEqual(SAMPLE_DRINK);
    // Public drink data must never carry an admin-only/payout-related field.
    expect(result).not.toHaveProperty('payoutRate');
  });
});
