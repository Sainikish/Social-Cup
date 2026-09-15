import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMemberById, getMemberCreditBalance, reactivateMember, searchMembers, suspendMember } from './api';
import { memberKeys } from './queryKeys';
import type { MemberSearchParams } from './api';

export function useMemberSearchQuery(params: MemberSearchParams) {
  return useQuery({
    queryKey: memberKeys.search(params),
    queryFn: () => searchMembers(params),
  });
}

export function useMemberByIdQuery(memberId: string | undefined, options: { skip?: boolean } = {}) {
  return useQuery({
    queryKey: memberKeys.detail(memberId ?? ''),
    queryFn: () => getMemberById(memberId as string),
    enabled: Boolean(memberId) && !options.skip,
  });
}

export function useMemberCreditBalanceQuery(memberId: string | undefined) {
  return useQuery({
    queryKey: memberKeys.credits(memberId ?? ''),
    queryFn: () => getMemberCreditBalance(memberId as string),
    enabled: Boolean(memberId),
  });
}

export function useSuspendMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => suspendMember(memberId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(data.id) });
    },
  });
}

export function useReactivateMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => reactivateMember(memberId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.detail(data.id) });
    },
  });
}
