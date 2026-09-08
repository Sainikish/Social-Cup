import { useQuery } from '@tanstack/react-query';

import { getAllSubscriptions } from './api';
import { subscriptionKeys } from './queryKeys';

// Read-only: no mutations exist for this feature - there is no admin
// cancellation/reactivation endpoint, so there is nothing to invalidate
// this query after.
export function useAdminSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.all,
    queryFn: getAllSubscriptions,
  });
}
