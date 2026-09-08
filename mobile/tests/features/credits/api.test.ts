import { apiClient } from '../../../src/api/client';
import { getMyCreditBalance } from '../../../src/features/credits/api';
import type { CreditBalanceResponse } from '../../../src/features/credits/types';

jest.mock('../../../src/api/client', () => ({
  apiClient: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('credits api', () => {
  it('getMyCreditBalance calls GET /users/me/credits', async () => {
    const response: CreditBalanceResponse = { balance: 26 };
    mockGet.mockResolvedValue({ data: response });

    const result = await getMyCreditBalance();

    expect(mockGet).toHaveBeenCalledWith('/users/me/credits');
    expect(result).toEqual(response);
  });
});
