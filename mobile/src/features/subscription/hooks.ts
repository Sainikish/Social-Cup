import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toApiError } from '../../api/client';
import { creditKeys } from '../credits';
import { cancelSubscription, getMySubscription, subscribe } from './api';
import { subscriptionKeys } from './queryKeys';
import type { CreateSubscriptionRequest } from './types';

// GET /users/me/subscription requires auth on the backend, so callers pass
// enabled: Boolean(user) from AuthContext (mirrors useCreditBalanceQuery).
// retry deliberately does NOT use the global default (2): a 404
// RESOURCE_NOT_FOUND here means "not subscribed", an entirely normal,
// expected outcome, not a transient failure - retrying it would just delay
// the screen showing the correct "not subscribed" state for no benefit.
// Any other failure (network, 500, etc.) still retries twice as usual.
export function useSubscriptionQuery(options: { enabled: boolean }) {
  return useQuery({
    queryKey: subscriptionKeys.mine(),
    queryFn: getMySubscription,
    enabled: options.enabled,
    retry: (failureCount, error) => {
      if (toApiError(error).code === 'RESOURCE_NOT_FOUND') {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// On success: invalidates both subscription (the member is now ACTIVE) and
// credit balance - the backend's Stripe webhook grants the first month's 30
// credits only once payment is actually confirmed there, not synchronously
// with this response, but invalidating now means the credit screen reflects
// the new balance as soon as that webhook has actually run, rather than
// showing a stale pre-subscription figure until some unrelated refetch.
export function useSubscribeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateSubscriptionRequest) => subscribe(request),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: subscriptionKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: creditKeys.balance() }),
      ]),
  });
}

export function useCancelSubscriptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subscriptionKeys.mine() }),
  });
}
