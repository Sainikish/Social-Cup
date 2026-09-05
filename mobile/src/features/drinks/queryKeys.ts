// Deliberately simpler than cafeKeys (src/features/cafes/queryKeys.ts):
// GET /drinks/signature accepts no filter/search parameters at all (verified
// against DrinkController - only pagination), so there is only ever one
// "signature drinks" query variant, not a family of them keyed by params.
export const drinkKeys = {
  all: ['drinks'] as const,
  signature: () => [...drinkKeys.all, 'signature'] as const,
  details: () => [...drinkKeys.all, 'detail'] as const,
  detail: (id: string) => [...drinkKeys.details(), id] as const,
} as const;
