import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addCafePhoto,
  createCafe,
  getCafeByIdForAdmin,
  removeCafePhoto,
  resetCafePin,
  searchCafes,
  searchCafesForAdmin,
  updateCafe,
  updateCafeStatus,
} from './api';
import { cafeKeys } from './queryKeys';
import type { CafeAdminSearchParams } from './api';
import type { CafeStatus, CreateCafeRequest, UpdateCafeRequest } from './types';

// Backs the public-only /cafes/search, kept for whatever still legitimately
// wants an active-only search. Deliberately `enabled: query.length > 0` -
// an empty query simply shows no results rather than firing a request that
// would return everything active.
export function useCafeSearchQuery(query: string) {
  return useQuery({
    queryKey: cafeKeys.search(query),
    queryFn: () => searchCafes({ q: query }),
    enabled: query.trim().length > 0,
  });
}

// Backs the /cafes admin list screen - any status, archived included.
// Unlike useCafeSearchQuery above, fires with no query at all (an empty
// filter set is a real "show everything" request here, not a no-op).
export function useAdminCafeSearchQuery(params: CafeAdminSearchParams) {
  return useQuery({
    queryKey: cafeKeys.adminSearch(params),
    queryFn: () => searchCafesForAdmin(params),
  });
}

// GET /admin/cafes/{id} - used to load a cafe's full detail when the admin
// did not just create/update/click-through with it already in hand (see
// CafeDetail.tsx). `enabled: false` when skip=true lets the screen avoid
// this fetch entirely when it already holds a fresher AdminCafeDetailResponse.
export function useAdminCafeDetailQuery(id: string | undefined, options: { skip?: boolean } = {}) {
  return useQuery({
    queryKey: cafeKeys.detail(id ?? ''),
    queryFn: () => getCafeByIdForAdmin(id as string),
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
      queryClient.invalidateQueries({ queryKey: cafeKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cafeKeys.all });
    },
  });
}

export function useUpdateCafeStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CafeStatus }) => updateCafeStatus(id, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cafeKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cafeKeys.all });
    },
  });
}

// Returns just the new photo (see addCafePhoto) - the caller (CafeDetail)
// merges it into the cafe detail it already holds.
export function useAddCafePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, file }: { cafeId: string; file: File }) => addCafePhoto(cafeId, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cafeKeys.detail(variables.cafeId) });
    },
  });
}

export function useRemoveCafePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, photoId }: { cafeId: string; photoId: string }) => removeCafePhoto(cafeId, photoId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: cafeKeys.detail(variables.cafeId) });
    },
  });
}

// No cache to invalidate - a PIN reset changes no field on
// AdminCafeDetailResponse itself (see AdminCafePinResetResponse), so there is
// nothing here for cafeKeys.detail to go stale against.
export function useResetCafePinMutation() {
  return useMutation({
    mutationFn: (cafeId: string) => resetCafePin(cafeId),
  });
}
