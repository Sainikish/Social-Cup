import { useQuery } from '@tanstack/react-query';

import { getRedemptions } from './api';
import { redemptionKeys } from './queryKeys';
import type { RedemptionListParams } from './types';

export function useRedemptionsQuery(params: RedemptionListParams) {
  return useQuery({
    queryKey: redemptionKeys.list(params),
    queryFn: () => getRedemptions(params),
  });
}
