// POST /barista/redeem has no GET counterpart to cache/invalidate - this
// exists only for structural parity with the other feature modules (mirrors
// the same deliberate placeholder-only decision made in the mobile app's
// own features/redemption/queryKeys.ts).
export const redemptionKeys = {
  all: ['redemption'] as const,
} as const;
