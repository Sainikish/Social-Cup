// No filters/params exist on GET /admin/dashboard/metrics, so unlike
// payouts/redemptions/audit-log there is only ever one query for this
// feature - a single root key is enough for both fetching and invalidation.
export const dashboardMetricsKeys = {
  all: ['dashboardMetrics'] as const,
};
