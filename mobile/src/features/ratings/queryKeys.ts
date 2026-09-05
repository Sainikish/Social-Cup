import type { PageRequestParams } from './api';

// Centralized so no two call sites can accidentally invent slightly
// different key shapes for the same data (see src/features/cafes/queryKeys.ts
// for the established pattern this mirrors). The public per-drink rating
// list and the authenticated member's own-rating data (my-ratings, diary)
// are deliberately separate branches - they must never share a cache entry,
// since one is public and the other is identity-scoped.
export const ratingKeys = {
  all: ['ratings'] as const,
  drinkLists: () => [...ratingKeys.all, 'drink'] as const,
  drinkList: (drinkId: string) => [...ratingKeys.drinkLists(), drinkId] as const,
  drinkListPage: (drinkId: string, params: PageRequestParams) =>
    [...ratingKeys.drinkList(drinkId), params] as const,
  myRatingsAll: () => [...ratingKeys.all, 'mine'] as const,
  myRatings: (params: PageRequestParams) => [...ratingKeys.myRatingsAll(), params] as const,
  diaryAll: () => [...ratingKeys.all, 'diary'] as const,
  diary: (params: PageRequestParams) => [...ratingKeys.diaryAll(), params] as const,
} as const;
