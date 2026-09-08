import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { calculatePayout, getPayoutsForCafe } from './api';
import { payoutKeys } from './queryKeys';
import type { CalculatePayoutRequest } from './types';

export function usePayoutsByCafeQuery(cafeId: string | undefined) {
  return useQuery({
    queryKey: payoutKeys.byCafe(cafeId ?? ''),
    queryFn: () => getPayoutsForCafe(cafeId as string),
    enabled: Boolean(cafeId),
  });
}

export function useCalculatePayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, request }: { cafeId: string; request: CalculatePayoutRequest }) =>
      calculatePayout(cafeId, request),
    onSuccess: (data) => {
      if (data.cafeId) {
        queryClient.invalidateQueries({ queryKey: payoutKeys.byCafe(data.cafeId) });
      }
    },
  });
}
