// Mirrors creditKeys' flat shape (src/features/credits/queryKeys.ts):
// GET /users/me/subscription accepts no parameters, so there is only ever
// one subscription-state query, not a family keyed by input.
export const subscriptionKeys = {
  all: ['subscription'] as const,
  mine: () => [...subscriptionKeys.all, 'me'] as const,
} as const;
