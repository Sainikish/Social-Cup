// Only one query exists for this feature - there is no per-subscription
// detail endpoint to key separately.
export const subscriptionKeys = {
  all: ['subscriptions'] as const,
};
