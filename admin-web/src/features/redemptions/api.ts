import { apiClient } from '../../api/client';
import type { PageResponse } from '../../types/api';
import type { AdminRedemptionResponse, RedemptionListParams } from './types';

// Mirrors AdminRedemptionController exactly:
//   GET /admin/redemptions -> PageResponse<AdminRedemptionResponse>
// Read-only - there is no edit/delete/refund/void endpoint for a redemption
// anywhere on the backend, and this app adds no such action. Every optional
// filter is passed through as-is (undefined when omitted); axios's default
// query-string serialization drops undefined values from the request rather
// than sending them as "cafeId=undefined", so an omitted filter is genuinely
// absent from the request, matching the backend's own "(:param IS NULL OR
// ...)"-free Specification-based filtering.
const ADMIN_REDEMPTIONS_PATH = '/admin/redemptions';

export async function getRedemptions(
  params: RedemptionListParams = {}
): Promise<PageResponse<AdminRedemptionResponse>> {
  const response = await apiClient.get<PageResponse<AdminRedemptionResponse>>(ADMIN_REDEMPTIONS_PATH, {
    params: {
      cafeId: params.cafeId,
      memberId: params.memberId,
      drinkId: params.drinkId,
      from: params.from,
      to: params.to,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort ?? 'createdAt,desc',
    },
  });
  return response.data;
}
