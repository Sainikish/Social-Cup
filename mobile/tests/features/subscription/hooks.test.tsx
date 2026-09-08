import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as subscriptionApi from '../../../src/features/subscription/api';
import {
  useCancelSubscriptionMutation,
  useSubscribeMutation,
  useSubscriptionQuery,
} from '../../../src/features/subscription/hooks';
import { subscriptionKeys } from '../../../src/features/subscription/queryKeys';
import type { SubscriptionResponse } from '../../../src/features/subscription/types';

jest.mock('../../../src/features/subscription/api');

const mockGetMySubscription = subscriptionApi.getMySubscription as jest.MockedFunction<
  typeof subscriptionApi.getMySubscription
>;
const mockSubscribe = subscriptionApi.subscribe as jest.MockedFunction<typeof subscriptionApi.subscribe>;
const mockCancelSubscription = subscriptionApi.cancelSubscription as jest.MockedFunction<
  typeof subscriptionApi.cancelSubscription
>;

const ACTIVE_SUBSCRIPTION: SubscriptionResponse = {
  status: 'ACTIVE',
  currentPeriodStart: '2026-01-01',
  currentPeriodEnd: '2026-02-01',
  cancelAtPeriodEnd: false,
};

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function notFoundError() {
  return {
    isAxiosError: true,
    response: { status: 404, data: { code: 'RESOURCE_NOT_FOUND', message: 'No subscription found' } },
    toJSON: () => ({}),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('subscriptionKeys', () => {
  it('has a single, stable "mine" key', () => {
    expect(subscriptionKeys.mine()).toEqual(['subscription', 'me']);
  });
});

describe('useSubscriptionQuery', () => {
  it('fetches the current subscription successfully when enabled', async () => {
    mockGetMySubscription.mockResolvedValue(ACTIVE_SUBSCRIPTION);

    const { result } = renderHook(() => useSubscriptionQuery({ enabled: true }), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ACTIVE_SUBSCRIPTION);
  });

  it('does not fetch when disabled (e.g. unauthenticated)', () => {
    renderHook(() => useSubscriptionQuery({ enabled: false }), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    expect(mockGetMySubscription).not.toHaveBeenCalled();
  });

  it('surfaces a 404 as an error WITHOUT retrying (it means "not subscribed", not a transient failure)', async () => {
    mockGetMySubscription.mockRejectedValue(notFoundError());

    const { result } = renderHook(() => useSubscriptionQuery({ enabled: true }), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockGetMySubscription).toHaveBeenCalledTimes(1);
  });

  it('retries a non-404 (transient) failure up to the configured limit', async () => {
    mockGetMySubscription.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useSubscriptionQuery({ enabled: true }), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(mockGetMySubscription.mock.calls.length).toBeGreaterThan(1);
  });
});

describe('useSubscribeMutation', () => {
  it('subscribes and invalidates both subscription and credit balance queries', async () => {
    mockSubscribe.mockResolvedValue(ACTIVE_SUBSCRIPTION);
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSubscribeMutation(), { wrapper: makeWrapper(queryClient) });

    await act(async () => {
      await result.current.mutateAsync({ paymentMethodId: 'pm_123' });
    });

    expect(mockSubscribe).toHaveBeenCalledWith({ paymentMethodId: 'pm_123' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['subscription', 'me'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['credits', 'balance'] });
  });

  it('surfaces a subscribe failure without invalidating anything', async () => {
    mockSubscribe.mockRejectedValue(new Error('card declined'));
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSubscribeMutation(), { wrapper: makeWrapper(queryClient) });

    await act(async () => {
      await expect(result.current.mutateAsync({ paymentMethodId: 'pm_123' })).rejects.toThrow();
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useCancelSubscriptionMutation', () => {
  it('cancels and invalidates the subscription query', async () => {
    mockCancelSubscription.mockResolvedValue({ ...ACTIVE_SUBSCRIPTION, cancelAtPeriodEnd: true });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCancelSubscriptionMutation(), {
      wrapper: makeWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockCancelSubscription).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['subscription', 'me'] });
  });
});
