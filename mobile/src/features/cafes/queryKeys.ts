import type { CafeListParams, CafeSearchParams } from './types';

// Centralized so no two call sites can accidentally invent slightly
// different key shapes for the same data. Every parameter that changes the
// result set (search text, neighbourhood, featured) is part of the key -
// two different filter combinations must never share a cache entry.
export const cafeKeys = {
  all: ['cafes'] as const,
  lists: () => [...cafeKeys.all, 'list'] as const,
  list: (params: CafeListParams) => [...cafeKeys.lists(), params] as const,
  searches: () => [...cafeKeys.all, 'search'] as const,
  search: (params: CafeSearchParams) => [...cafeKeys.searches(), params] as const,
  featured: () => [...cafeKeys.all, 'featured'] as const,
  details: () => [...cafeKeys.all, 'detail'] as const,
  detail: (id: string) => [...cafeKeys.details(), id] as const,
  drinks: (id: string) => [...cafeKeys.all, 'drinks', id] as const,
} as const;
