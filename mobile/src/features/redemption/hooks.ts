import { useMutation, useQueryClient } from '@tanstack/react-query';

import { creditKeys } from '../credits';
import { createRedemptionCode } from './api';

// Generating a code never deducts credits synchronously (see
// RedemptionCodeService.generateCode - it only performs a soft balance
// pre-check; the actual deduction happens later, when a barista redeems the
// code, which is outside this app's scope). Invalidating the credit balance
// here mirrors useSubscribeMutation's same "invalidate optimistically, let it
// reflect whenever the backend-side change actually lands" pattern rather
// than assuming the balance changed at this exact moment.
//
// There is no redemption-related query to invalidate (see queryKeys.ts) -
// the generated code lives only in this mutation's own state, per the
// backend having no GET endpoint to re-fetch it from.
export function useCreateRedemptionCodeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (drinkId: string) => createRedemptionCode(drinkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: creditKeys.balance() }),
  });
}
