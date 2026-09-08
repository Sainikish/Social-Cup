// No query currently reads through this key - there is no GET endpoint to
// back one (see api.ts). It exists only as an invalidation target for the
// suspend/reactivate mutations, so a future phase that adds a real
// admin member-lookup endpoint can wire a query into the same key without
// another round of changes here.
export const memberKeys = {
  all: ['members'] as const,
  detail: (id: string) => [...memberKeys.all, 'detail', id] as const,
};
