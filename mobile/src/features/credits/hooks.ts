import { useQuery } from '@tanstack/react-query';

import { getMyCreditBalance } from './api';
import { creditKeys } from './queryKeys';

// Mirrors useMyRatingsQuery's { enabled } convention (src/features/ratings/hooks.ts):
// GET /users/me/credits requires auth on the backend, so callers pass
// enabled: Boolean(user) from AuthContext rather than this hook re-deriving
// auth state itself.
export function useCreditBalanceQuery(options: { enabled: boolean }) {
  return useQuery({
    queryKey: creditKeys.balance(),
    queryFn: getMyCreditBalance,
    enabled: options.enabled,
  });
}
