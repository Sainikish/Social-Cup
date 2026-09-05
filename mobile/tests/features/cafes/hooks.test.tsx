import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import * as cafesApi from '../../../src/features/cafes/api';
import {
  useCafeDetailQuery,
  useCafeSearchQuery,
  useCafesQuery,
  useFeaturedCafesQuery,
} from '../../../src/features/cafes/hooks';
import type { CafeDetailResponse, CafeSummaryResponse } from '../../../src/features/cafes/types';
import type { PageResponse } from '../../../src/types/api';

jest.mock('../../../src/features/cafes/api');

const mockGetCafes = cafesApi.getCafes as jest.MockedFunction<typeof cafesApi.getCafes>;
const mockSearchCafes = cafesApi.searchCafes as jest.MockedFunction<typeof cafesApi.searchCafes>;
const mockGetFeaturedCafes = cafesApi.getFeaturedCafes as jest.MockedFunction<
  typeof cafesApi.getFeaturedCafes
>;
const mockGetCafeById = cafesApi.getCafeById as jest.MockedFunction<typeof cafesApi.getCafeById>;

function cafe(id: string): CafeSummaryResponse {
  return {
    id,
    name: `Cafe ${id}`,
    address: '1 Main St',
    neighbourhood: 'Downtown',
    latitude: null,
    longitude: null,
    featured: false,
    status: 'ACTIVE',
    vibeTags: null,
    primaryPhotoUrl: null,
    distanceKm: null,
  };
}

function page(
  content: CafeSummaryResponse[],
  overrides: Partial<PageResponse<CafeSummaryResponse>> = {}
): PageResponse<CafeSummaryResponse> {
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

function cafeDetail(id: string): CafeDetailResponse {
  return {
    id,
    name: `Cafe ${id}`,
    address: '1 Main St',
    neighbourhood: 'Downtown',
    latitude: null,
    longitude: null,
    openingHours: [],
    phoneNumber: null,
    email: null,
    website: null,
    featured: false,
    vibeTags: null,
    description: null,
    status: 'ACTIVE',
    photos: [],
    drinks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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

describe('useCafesQuery', () => {
  it('fetches the first page with the given filter params', async () => {
    mockGetCafes.mockResolvedValue(page([cafe('1')]));

    const { result } = renderHook(() => useCafesQuery({ neighbourhood: 'Downtown' }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetCafes).toHaveBeenCalledWith({ neighbourhood: 'Downtown', page: 0, size: 20 });
    expect(result.current.data?.pages[0].content).toHaveLength(1);
  });

  it('fetches the next page on fetchNextPage and stops once the last page is reached', async () => {
    mockGetCafes
      .mockResolvedValueOnce(page([cafe('1')], { last: false, totalPages: 2 }))
      .mockResolvedValueOnce(page([cafe('2')], { page: 1, last: true, totalPages: 2 }));

    const { result } = renderHook(() => useCafesQuery({}), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockGetCafes).toHaveBeenNthCalledWith(2, { page: 1, size: 20 });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('surfaces a failed next-page request without discarding the already-loaded first page', async () => {
    mockGetCafes
      .mockResolvedValueOnce(page([cafe('1')], { last: false, totalPages: 2 }))
      .mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useCafesQuery({}), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.isFetchNextPageError).toBe(true));
    // The first page that already loaded successfully must still be there.
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.data?.pages[0].content).toHaveLength(1);
  });
});

describe('useCafeSearchQuery', () => {
  it('uses a distinct query key per search params, so changed criteria fetch fresh data', async () => {
    mockSearchCafes.mockResolvedValueOnce(page([cafe('1')])).mockResolvedValueOnce(page([cafe('2')]));

    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useCafeSearchQuery({ q }, { enabled: true }),
      { wrapper: makeWrapper(), initialProps: { q: 'blue' } }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].content[0].id).toBe('1');

    rerender({ q: 'green' });

    await waitFor(() => expect(result.current.data?.pages[0].content[0].id).toBe('2'));
    expect(mockSearchCafes).toHaveBeenCalledTimes(2);
  });

  it('does not fetch while disabled', () => {
    const { result } = renderHook(() => useCafeSearchQuery({ q: '' }, { enabled: false }), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockSearchCafes).not.toHaveBeenCalled();
  });
});

describe('useFeaturedCafesQuery', () => {
  it('fetches a single page of featured cafes', async () => {
    mockGetFeaturedCafes.mockResolvedValue(page([cafe('1')]));

    const { result } = renderHook(() => useFeaturedCafesQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetFeaturedCafes).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(result.current.data?.content).toHaveLength(1);
  });
});

describe('useCafeDetailQuery', () => {
  it('fetches cafe detail by id', async () => {
    mockGetCafeById.mockResolvedValue(cafeDetail('cafe-1'));

    const { result } = renderHook(() => useCafeDetailQuery('cafe-1'), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetCafeById).toHaveBeenCalledWith('cafe-1');
    expect(result.current.data?.id).toBe('cafe-1');
  });
});
