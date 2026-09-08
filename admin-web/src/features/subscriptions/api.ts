import { apiClient } from '../../api/client';
import type { AdminSubscriptionResponse } from './types';

// AdminSubscriptionController exposes exactly one endpoint: a flat,
// unpaginated GET with no query parameters (no status/search/memberId/
// page/size) - do not add any. There is no individual subscription GET, no
// admin cancellation endpoint, and no Stripe-identifier exposure; none of
// those should ever be added here either.
const ADMIN_SUBSCRIPTIONS_PATH = '/admin/subscriptions';

export async function getAllSubscriptions(): Promise<AdminSubscriptionResponse[]> {
  const response = await apiClient.get<AdminSubscriptionResponse[]>(ADMIN_SUBSCRIPTIONS_PATH);
  return response.data;
}
