// Mirrors com.socialcup.admin.dto.AdminDashboardMetricsResponse exactly -
// every value is a server-side aggregate (COUNT/SUM) over existing persisted
// data. Nothing here is calculated or re-derived client-side, and there is
// no request DTO anywhere in this feature - GET /admin/dashboard/metrics
// takes no parameters and is read-only.
export interface AdminDashboardMetricsResponse {
  totalMembers: number;
  totalActiveCafes: number;
  totalActiveDrinks: number;
  totalRedemptions: number;
  totalCreditsRedeemed: number;
  totalPayoutAmountOwed: number;
  totalPayoutAmountPaid: number;
}
