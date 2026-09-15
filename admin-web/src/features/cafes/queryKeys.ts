import type { CafeAdminSearchParams } from './api';

export const cafeKeys = {
  all: ['cafes'] as const,
  search: (query: string) => [...cafeKeys.all, 'search', query] as const,
  adminSearch: (params: CafeAdminSearchParams) => [...cafeKeys.all, 'adminSearch', params] as const,
  detail: (id: string) => [...cafeKeys.all, 'detail', id] as const,
};
