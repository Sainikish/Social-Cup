import { useMutation } from '@tanstack/react-query';

import { redeemCode } from './api';

// retry:0 comes from the shared queryClient default (see
// src/api/queryClient.ts) and matters more here than almost anywhere else in
// this app: silently retrying this exact POST after a lost response could
// look like a duplicate redemption attempt. The backend is what actually
// prevents a code from being redeemed twice either way (see
// RedemptionService.redeem's pessimistic lock) - this hook's job is only to
// expose the mutation's pending/error/data state to the scanner/result
// screens, never to decide correctness.
export function useRedeemCodeMutation() {
  return useMutation({
    mutationFn: (code: string) => redeemCode(code),
  });
}
