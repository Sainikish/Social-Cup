import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createCafe, getPublicCafeById, searchCafes, updateCafe, updateCafeStatus } from './api';
import { cafeKeys } from './queryKeys';
import type { CafeStatus, CreateCafeRequest, UpdateCafeRequest } from './types';

// Backs the /cafes search screen. Deliberately `enabled: query.length > 0` -
// there is no "browse all cafes" query to fall back to when the search box
// is empty (no admin listing endpoint exists), so an empty query simply
// shows no results rather than firing a request that would return
// everything active.
export function useCafeSearchQuery(query: string) {
  return useQuery({
    queryKey: cafeKeys.search(query),
    queryFn: () => searchCafes({ q: query }),
    enabled: query.trim().length > 0,
  });
}

// Public GET /cafes/{id} - used only to pre-fill the Edit form when the
// admin did not just create/update this cafe in the current session (see
// CafeDetail.tsx). `enabled: false` when skip=true lets the screen avoid
// this fetch entirely when it already holds a fresher AdminCafeDetailResponse.
export function usePublicCafeDetailQuery(id: string | undefined, options: { skip?: boolean } = {}) {
  return useQuery({
    queryKey: cafeKeys.publicDetail(id ?? ''),
    queryFn: () => getPublicCafeById(id as string),
    enabled: Boolean(id) && !options.skip,
  });
}

export function useCreateCafeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateCafeRequest) => createCafe(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cafeKeys.all });
    },
  });
}

export function useUpdateCafeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateCafeRequest }) => updateCafe(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cafeKeys.publicDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cafeKeys.all });
    },
  });
}

export function useUpdateCafeStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CafeStatus }) => updateCafeStatus(id, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cafeKeys.publicDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cafeKeys.all });
    },
  });
}
