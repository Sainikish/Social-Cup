// There is deliberately no `list`/`all` key backed by a real query - no
// admin cafe listing endpoint exists to back one. `all` exists only as an
// invalidation root so a mutation can invalidate every cached search/detail
// result without enumerating them individually.
export const cafeKeys = {
  all: ['cafes'] as const,
  search: (query: string) => [...cafeKeys.all, 'search', query] as const,
  publicDetail: (id: string) => [...cafeKeys.all, 'publicDetail', id] as const,
};
