import type { RedemptionListParams } from './types';

// `all` is the invalidation root; `list` is keyed on the full params object
// (filters + page/size/sort) so every distinct filter/page combination gets
// its own cache entry - changing any filter or turning a page is a genuinely
// different query, not a re-fetch of the same one.
export const redemptionKeys = {
  all: ['redemptions'] as const,
  list: (params: RedemptionListParams) => [...redemptionKeys.all, 'list', params] as const,
};
