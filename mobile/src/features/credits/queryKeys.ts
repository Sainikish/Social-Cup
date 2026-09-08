// Deliberately flat, mirroring drinkKeys.signature()'s "no parameters, one
// variant" shape - GET /users/me/credits accepts no parameters, so there is
// only ever one credit-balance query, not a family keyed by input.
export const creditKeys = {
  all: ['credits'] as const,
  balance: () => [...creditKeys.all, 'balance'] as const,
} as const;
