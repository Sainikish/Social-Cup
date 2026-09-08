// There is deliberately no global `list` or `all` query - no admin
// global payout endpoint exists. `all` exists only as an invalidation root.
export const payoutKeys = {
  all: ['payouts'] as const,
  byCafe: (cafeId: string) => [...payoutKeys.all, 'byCafe', cafeId] as const,
};
