import { apiClient } from '../../api/client';
import type { AdminDashboardMetricsResponse } from './types';

// Mirrors AdminDashboardController exactly:
//   GET /admin/dashboard/metrics -> AdminDashboardMetricsResponse
// Read-only, no query parameters - every value is a server-side aggregate;
// this app never recalculates or re-derives any of them.
const ADMIN_DASHBOARD_METRICS_PATH = '/admin/dashboard/metrics';

export async function getDashboardMetrics(): Promise<AdminDashboardMetricsResponse> {
  const response = await apiClient.get<AdminDashboardMetricsResponse>(ADMIN_DASHBOARD_METRICS_PATH);
  return response.data;
}
