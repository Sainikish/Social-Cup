import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import * as redemptionApi from '../../../src/features/redemption/api';
import { useRedeemCodeMutation } from '../../../src/features/redemption/hooks';
import type { RedemptionResponse } from '../../../src/features/redemption/types';

vi.mock('../../../src/features/redemption/api');

const mockRedeemCode = vi.mocked(redemptionApi.redeemCode);

const SAMPLE_RESPONSE: RedemptionResponse = {
  redemptionId: 'redemption-1',
  drinkId: 'drink-1',
  drinkName: 'Oat Milk Latte',
  creditsDeducted: 4,
  memberFirstName: 'Ada',
  redeemedAt: '2026-01-01T00:00:00Z',
};

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRedeemCodeMutation', () => {
  it('redeems a code successfully', async () => {
    mockRedeemCode.mockResolvedValue(SAMPLE_RESPONSE);
    const { result } = renderHook(() => useRedeemCodeMutation(), { wrapper: makeWrapper() });

    result.current.mutate('abc123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRedeemCode).toHaveBeenCalledWith('abc123');
    expect(result.current.data).toEqual(SAMPLE_RESPONSE);
  });

  it('surfaces a failure without retrying (retry:0, see src/api/queryClient.ts)', async () => {
    mockRedeemCode.mockRejectedValue(new Error('insufficient credits'));
    const { result } = renderHook(() => useRedeemCodeMutation(), { wrapper: makeWrapper() });

    result.current.mutate('abc123');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockRedeemCode).toHaveBeenCalledTimes(1);
  });
});
