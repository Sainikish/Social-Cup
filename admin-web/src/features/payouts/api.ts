import { apiClient } from '../../api/client';
import type { CalculatePayoutRequest, MarkPayoutPaidRequest, PayoutResponse } from './types';

// Mirrors AdminPayoutController exactly:
//   GET   /admin/cafes/{cafeId}/payouts             -> PayoutResponse[]
//   POST  /admin/cafes/{cafeId}/payouts             -> PayoutResponse
//   GET   /admin/payouts                            -> PayoutResponse[] (all cafes, no query params)
//   PATCH /admin/cafes/{cafeId}/payouts/{payoutId}  -> PayoutResponse
// Financial calculation is performed entirely server-side from persisted
// redemption records; mark-paid only ever touches amountPaid/paymentReference/
// paymentDate - this app never sends amountOwed, totals, period, or cafe.
function cafePayoutsPath(cafeId: string): string {
  return `/admin/cafes/${cafeId}/payouts`;
}

function payoutPath(cafeId: string, payoutId: string): string {
  return `/admin/cafes/${cafeId}/payouts/${payoutId}`;
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

// Cross-cafe list - no query parameters exist on this endpoint (no
// pagination, no filters); this app sends none and shows the full,
// unfiltered list the backend returns.
export async function getAllPayouts(): Promise<PayoutResponse[]> {
  const response = await apiClient.get<PayoutResponse[]>('/admin/payouts');
  return response.data;
}

export async function markPayoutPaid(
  cafeId: string,
  payoutId: string,
  request: MarkPayoutPaidRequest
): Promise<PayoutResponse> {
  const response = await apiClient.patch<PayoutResponse>(payoutPath(cafeId, payoutId), request);
  return response.data;
}
