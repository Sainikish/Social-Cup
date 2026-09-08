import { QueryClient } from '@tanstack/react-query';

// Mirrors mobile/src/lib/queryClient.ts's defaults and rationale:
// - retry: 2 rather than the library default of 3 - a connection that fails
//   twice in a row is unlikely to succeed on a third identical attempt
//   within the same interaction.
// - mutations never auto-retry: silently retrying a POST (most importantly
//   POST /barista/redeem) risks a duplicate side effect if the first
//   attempt actually succeeded server-side but the response was lost -
//   redemption correctness must never depend on this app guessing right.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
