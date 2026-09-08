import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reactivateMember, suspendMember } from './api';
import { memberKeys } from './queryKeys';

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
