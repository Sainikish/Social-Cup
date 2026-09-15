import type { MemberSearchParams } from './api';

export const memberKeys = {
  all: ['members'] as const,
  search: (params: MemberSearchParams) => [...memberKeys.all, 'search', params] as const,
  detail: (id: string) => [...memberKeys.all, 'detail', id] as const,
  credits: (id: string) => [...memberKeys.all, 'credits', id] as const,
};
