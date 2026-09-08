import { apiClient } from '../../api/client';
import type { CreateSubscriptionRequest, SubscriptionResponse } from './types';

// Verified directly against SubscriptionController.java - all three methods
// map to the same /users/me/subscription path, distinguished only by HTTP
// verb. Goes through the existing shared apiClient: no new Axios instance,
// no manual Authorization header. GET returns 404 RESOURCE_NOT_FOUND when
// the member has no subscription - callers (useSubscriptionQuery) surface
// that as a normal query error for the screen to interpret, rather than
// this layer swallowing or reinterpreting it.
const SUBSCRIPTION_PATH = '/users/me/subscription';

export async function getMySubscription(): Promise<SubscriptionResponse> {
  const response = await apiClient.get<SubscriptionResponse>(SUBSCRIPTION_PATH);
  return response.data;
}

export async function subscribe(request: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
  const response = await apiClient.post<SubscriptionResponse>(SUBSCRIPTION_PATH, request);
  return response.data;
}

export async function cancelSubscription(): Promise<SubscriptionResponse> {
  const response = await apiClient.delete<SubscriptionResponse>(SUBSCRIPTION_PATH);
  return response.data;
}
