import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as creditsApi from '../../../src/features/credits/api';
import { useCreditBalanceQuery } from '../../../src/features/credits/hooks';
import { creditKeys } from '../../../src/features/credits/queryKeys';

jest.mock('../../../src/features/credits/api');

const mockGetMyCreditBalance = creditsApi.getMyCreditBalance as jest.MockedFunction<
  typeof creditsApi.getMyCreditBalance
>;

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('creditKeys', () => {
  it('has a single, stable balance key', () => {
    expect(creditKeys.balance()).toEqual(['credits', 'balance']);
  });
});

describe('useCreditBalanceQuery', () => {
  it('fetches the balance successfully when enabled', async () => {
    mockGetMyCreditBalance.mockResolvedValue({ balance: 26 });

    const { result } = renderHook(() => useCreditBalanceQuery({ enabled: true }), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetMyCreditBalance).toHaveBeenCalledTimes(1);
    expect(result.current.data?.balance).toBe(26);
  });

  it('does not fetch when disabled (e.g. unauthenticated)', () => {
    const { result } = renderHook(() => useCreditBalanceQuery({ enabled: false }), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMyCreditBalance).not.toHaveBeenCalled();
  });

  it('surfaces an API error and supports retry via refetch', async () => {
    mockGetMyCreditBalance.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useCreditBalanceQuery({ enabled: true }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    mockGetMyCreditBalance.mockResolvedValueOnce({ balance: 30 });
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.balance).toBe(30);
  });
});
