// `all` backs the real cross-cafe query (GET /admin/payouts, no query
// parameters/filters exist on that endpoint) and is also the invalidation
// root for cafe-scoped mutations that could affect it.
export const payoutKeys = {
  all: ['payouts'] as const,
  byCafe: (cafeId: string) => [...payoutKeys.all, 'byCafe', cafeId] as const,
};
