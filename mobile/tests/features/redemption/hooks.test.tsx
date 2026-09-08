import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { toApiError } from '../../../src/api/client';
import { creditKeys } from '../../../src/features/credits';
import * as redemptionApi from '../../../src/features/redemption/api';
import { useCreateRedemptionCodeMutation } from '../../../src/features/redemption/hooks';
import type { RedemptionCodeResponse } from '../../../src/features/redemption/types';

jest.mock('../../../src/features/redemption/api');

const mockCreateRedemptionCode = redemptionApi.createRedemptionCode as jest.MockedFunction<
  typeof redemptionApi.createRedemptionCode
>;

const SAMPLE_RESPONSE: RedemptionCodeResponse = {
  code: 'sJ3f9x2k',
  backupCode: '004821',
  validUntil: '2026-01-01T00:05:00Z',
  drinkId: 'drink-1',
  drinkName: 'Cortado',
  cafeId: 'cafe-1',
  cafeName: 'Blue Bottle Coffee',
  creditPrice: 4,
};

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCreateRedemptionCodeMutation', () => {
  it('generates a code and invalidates the credit balance query', async () => {
    mockCreateRedemptionCode.mockResolvedValue(SAMPLE_RESPONSE);
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRedemptionCodeMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('drink-1');
    });

    expect(mockCreateRedemptionCode).toHaveBeenCalledWith('drink-1');
    // TanStack Query's notifyManager batches observer notifications onto a
    // deferred timer, so the hook's own re-rendered `data` can lag one tick
    // behind mutateAsync's promise resolving - waitFor rather than a bare
    // synchronous read.
    await waitFor(() => expect(result.current.data).toEqual(SAMPLE_RESPONSE));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: creditKeys.balance() });
  });

  it('surfaces a failure (normalized via the shared ApiError system) without invalidating anything', async () => {
    mockCreateRedemptionCode.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'INSUFFICIENT_CREDITS', message: 'insufficient credits' } },
      toJSON: () => ({}),
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateRedemptionCodeMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync('drink-1')).rejects.toBeTruthy();
    });

    await waitFor(() => expect(toApiError(result.current.error).code).toBe('INSUFFICIENT_CREDITS'));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
