// There is deliberately no `list`/`all` key backed by a real query - no
// admin drink-list endpoint exists to back one. `all` exists only as an
// invalidation root.
export const drinkKeys = {
  all: ['drinks'] as const,
  byCafe: (cafeId: string) => [...drinkKeys.all, 'byCafe', cafeId] as const,
  publicDetail: (id: string) => [...drinkKeys.all, 'publicDetail', id] as const,
};
