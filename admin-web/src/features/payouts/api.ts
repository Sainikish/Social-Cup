import { apiClient } from '../../api/client';
import type { CalculatePayoutRequest, PayoutResponse } from './types';

// Mirrors AdminPayoutController exactly:
//   GET  /admin/cafes/{cafeId}/payouts -> PayoutResponse[]
//   POST /admin/cafes/{cafeId}/payouts -> PayoutResponse
// There is no global /admin/payouts endpoint. Every payout is strictly
// scoped to a specific cafe. Financial calculation is performed entirely
// server-side from persisted redemption records.
function cafePayoutsPath(cafeId: string): string {
  return `/admin/cafes/${cafeId}/payouts`;
}

export async function getPayoutsForCafe(cafeId: string): Promise<PayoutResponse[]> {
  const response = await apiClient.get<PayoutResponse[]>(cafePayoutsPath(cafeId));
  return response.data;
}

export async function calculatePayout(
  cafeId: string,
  request: CalculatePayoutRequest
): Promise<PayoutResponse> {
  const response = await apiClient.post<PayoutResponse>(cafePayoutsPath(cafeId), request);
  return response.data;
}
