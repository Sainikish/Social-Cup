export const cafeLoginKeys = {
  all: ['cafeLogin'] as const,
  search: (query: string) => [...cafeLoginKeys.all, 'search', query] as const,
} as const;
