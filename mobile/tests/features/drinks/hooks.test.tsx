import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as drinksApi from '../../../src/features/drinks/api';
import { useDrinkDetailQuery, useSignatureDrinksQuery } from '../../../src/features/drinks/hooks';
import { drinkKeys } from '../../../src/features/drinks/queryKeys';
import type { DrinkResponse } from '../../../src/features/drinks/types';
import type { PageResponse } from '../../../src/types/api';

jest.mock('../../../src/features/drinks/api');

const mockGetSignatureDrinks = drinksApi.getSignatureDrinks as jest.MockedFunction<
  typeof drinksApi.getSignatureDrinks
>;
const mockGetDrinkById = drinksApi.getDrinkById as jest.MockedFunction<typeof drinksApi.getDrinkById>;

function drink(id: string): DrinkResponse {
  return {
    id,
    cafeId: 'cafe-1',
    cafeName: 'Blue Bottle Coffee',
    name: `Drink ${id}`,
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
}

function page(
  content: DrinkResponse[],
  overrides: Partial<PageResponse<DrinkResponse>> = {}
): PageResponse<DrinkResponse> {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('drinkKeys', () => {
  it('keeps the signature and detail(id) keys distinct, so they never share a cache entry', () => {
    expect(drinkKeys.signature()).toEqual(['drinks', 'signature']);
    expect(drinkKeys.detail('drink-1')).toEqual(['drinks', 'detail', 'drink-1']);
    expect(drinkKeys.detail('drink-1')).not.toEqual(drinkKeys.detail('drink-2'));
  });
});

describe('useSignatureDrinksQuery', () => {
  it('fetches the first page successfully', async () => {
    mockGetSignatureDrinks.mockResolvedValue(page([drink('1')]));

    const { result } = renderHook(() => useSignatureDrinksQuery(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetSignatureDrinks).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(result.current.data?.pages[0].content).toHaveLength(1);
  });

  it('resolves to an empty result set without treating it as an error', async () => {
    mockGetSignatureDrinks.mockResolvedValue(page([]));

    const { result } = renderHook(() => useSignatureDrinksQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].content).toHaveLength(0);
    expect(result.current.isError).toBe(false);
  });

  it('fetches the next page and stops once the last page is reached', async () => {
    mockGetSignatureDrinks
      .mockResolvedValueOnce(page([drink('1')], { last: false, totalPages: 2 }))
      .mockResolvedValueOnce(page([drink('2')], { page: 1, last: true, totalPages: 2 }));

    const { result } = renderHook(() => useSignatureDrinksQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockGetSignatureDrinks).toHaveBeenNthCalledWith(2, { page: 1, size: 20 });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('surfaces an error and supports retry', async () => {
    mockGetSignatureDrinks.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useSignatureDrinksQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    mockGetSignatureDrinks.mockResolvedValueOnce(page([drink('1')]));
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].content).toHaveLength(1);
  });
});

describe('useDrinkDetailQuery', () => {
  it('fetches drink detail by id', async () => {
    mockGetDrinkById.mockResolvedValue(drink('drink-1'));

    const { result } = renderHook(() => useDrinkDetailQuery('drink-1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetDrinkById).toHaveBeenCalledWith('drink-1');
    expect(result.current.data?.id).toBe('drink-1');
  });

  it('does not fetch when the id is empty', () => {
    const { result } = renderHook(() => useDrinkDetailQuery(''), { wrapper: makeWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetDrinkById).not.toHaveBeenCalled();
  });
});
