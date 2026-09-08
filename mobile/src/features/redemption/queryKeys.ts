// The backend has no GET endpoint for a member's redemption code (see
// api.ts), so there is currently no query keyed off this namespace - it
// exists only for structural parity with the other feature modules and as a
// stable place to invalidate from if such an endpoint is ever added. Do not
// add a query here without a corresponding backend endpoint.
export const redemptionKeys = {
  all: ['redemption'] as const,
} as const;
