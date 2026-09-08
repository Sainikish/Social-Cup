import { apiClient } from '../../api/client';
import type { CreditBalanceResponse } from './types';

// Verified directly against UserCreditController.java - this is the only
// credit endpoint that exists. Goes through the existing shared apiClient:
// no new Axios instance, no manual Authorization header (the request
// interceptor attaches a token when one exists; this route requires auth on
// the backend, so an anonymous call simply gets back a 401 UNAUTHENTICATED).
const USERS_ME_PATH = '/users/me';

export async function getMyCreditBalance(): Promise<CreditBalanceResponse> {
  const response = await apiClient.get<CreditBalanceResponse>(`${USERS_ME_PATH}/credits`);
  return response.data;
}
