import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { calculatePayout, getAllPayouts, getPayoutsForCafe, markPayoutPaid } from './api';
import { payoutKeys } from './queryKeys';
import type { CalculatePayoutRequest, MarkPayoutPaidRequest } from './types';

export function usePayoutsByCafeQuery(cafeId: string | undefined) {
  return useQuery({
    queryKey: payoutKeys.byCafe(cafeId ?? ''),
    queryFn: () => getPayoutsForCafe(cafeId as string),
    enabled: Boolean(cafeId),
  });
}

export function useAllPayoutsQuery() {
  return useQuery({
    queryKey: payoutKeys.all,
    queryFn: getAllPayouts,
  });
}

export function useCalculatePayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, request }: { cafeId: string; request: CalculatePayoutRequest }) =>
      calculatePayout(cafeId, request),
    onSuccess: (data) => {
      // A newly-calculated payout affects both the per-cafe list this
      // request targeted and the cross-cafe list, which now embeds it too.
      queryClient.invalidateQueries({ queryKey: payoutKeys.all });
      if (data.cafeId) {
        queryClient.invalidateQueries({ queryKey: payoutKeys.byCafe(data.cafeId) });
      }
    },
  });
}

export function useMarkPayoutPaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cafeId,
      payoutId,
      request,
    }: {
      cafeId: string;
      payoutId: string;
      request: MarkPayoutPaidRequest;
    }) => markPayoutPaid(cafeId, payoutId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.all });
      if (data.cafeId) {
        queryClient.invalidateQueries({ queryKey: payoutKeys.byCafe(data.cafeId) });
      }
    },
  });
}
