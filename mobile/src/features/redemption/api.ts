import { apiClient } from '../../api/client';
import type { CreateRedemptionCodeRequest, RedemptionCodeResponse } from './types';

// Only endpoint that exists (verified against RedemptionCodeController.java):
// POST /users/me/redemption-codes. There is deliberately no GET here - the
// backend has no member-scoped "my active code" endpoint (confirmed against
// RedemptionCodeRepository), so one is not invented on the mobile side.
const REDEMPTION_CODES_PATH = '/users/me/redemption-codes';

export async function createRedemptionCode(drinkId: string): Promise<RedemptionCodeResponse> {
  const request: CreateRedemptionCodeRequest = { drinkId };
  const response = await apiClient.post<RedemptionCodeResponse>(REDEMPTION_CODES_PATH, request);
  return response.data;
}
