import { useQuery } from '@tanstack/react-query';

import { getDashboardMetrics } from './api';
import { dashboardMetricsKeys } from './queryKeys';

export function useDashboardMetricsQuery() {
  return useQuery({
    queryKey: dashboardMetricsKeys.all,
    queryFn: getDashboardMetrics,
  });
}
