import { QueryClient } from '@tanstack/react-query';

// Sensible mobile defaults, not an exhaustive tuning pass:
// - retry: 2 rather than the library default of 3 - a mobile connection that
//   fails twice in a row is unlikely to succeed on a third identical attempt
//   within the same user interaction.
// - staleTime: most list/detail data here (cafes, drinks, ratings) doesn't
//   change second-to-second, so a short stale window avoids refetching on
//   every screen focus while still feeling current.
// - mutations never auto-retry: silently retrying a POST/PUT (e.g. creating
//   a rating) risks a duplicate side effect if the first attempt actually
//   succeeded server-side but the response was lost.
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
