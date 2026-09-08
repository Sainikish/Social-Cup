import { apiClient } from '../../api/client';
import type { RedeemCodeRequest, RedemptionResponse } from './types';

// The only endpoint this feature calls (verified against
// BaristaRedemptionController.java). Never sends cafeId - the backend
// derives the acting cafe exclusively from the authenticated BARISTA JWT
// (CurrentCafeResolver.requireCafeId), not from this request body.
const REDEEM_PATH = '/barista/redeem';

export async function redeemCode(code: string): Promise<RedemptionResponse> {
  const request: RedeemCodeRequest = { code };
  const response = await apiClient.post<RedemptionResponse>(REDEEM_PATH, request);
  return response.data;
}
