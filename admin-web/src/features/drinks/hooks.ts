import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cafeKeys } from '../cafes/queryKeys';
import { createDrink, getDrinksByCafe, getPublicDrinkById, updateDrink, updateDrinkStatus } from './api';
import { drinkKeys } from './queryKeys';
import type { CreateDrinkRequest, DrinkStatus, UpdateDrinkRequest } from './types';

export function useDrinksByCafeQuery(cafeId: string | undefined) {
  return useQuery({
    queryKey: drinkKeys.byCafe(cafeId ?? ''),
    queryFn: () => getDrinksByCafe({ cafeId: cafeId as string }),
    enabled: Boolean(cafeId),
  });
}

// Public GET /drinks/{id} - used only to pre-fill the Edit form when the
// admin did not just create/update this drink in the current session (see
// DrinkDetail.tsx). Finds ACTIVE and INACTIVE drinks only - never ARCHIVED.
export function usePublicDrinkDetailQuery(id: string | undefined, options: { skip?: boolean } = {}) {
  return useQuery({
    queryKey: drinkKeys.publicDetail(id ?? ''),
    queryFn: () => getPublicDrinkById(id as string),
    enabled: Boolean(id) && !options.skip,
  });
}

export function useCreateDrinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cafeId, request }: { cafeId: string; request: CreateDrinkRequest }) => createDrink(cafeId, request),
    onSuccess: (data) => {
      if (data.cafeId) {
        queryClient.invalidateQueries({ queryKey: drinkKeys.byCafe(data.cafeId) });
        // CafeDetailResponse/AdminCafeDetailResponse embed a cafe's active
        // drinks directly - a new drink makes that cached list stale too.
        queryClient.invalidateQueries({ queryKey: cafeKeys.publicDetail(data.cafeId) });
      }
    },
  });
}

export function useUpdateDrinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateDrinkRequest }) => updateDrink(id, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drinkKeys.publicDetail(data.id) });
      if (data.cafeId) {
        queryClient.invalidateQueries({ queryKey: drinkKeys.byCafe(data.cafeId) });
        queryClient.invalidateQueries({ queryKey: cafeKeys.publicDetail(data.cafeId) });
      }
    },
  });
}

export function useUpdateDrinkStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: DrinkStatus }) => updateDrinkStatus(id, { status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: drinkKeys.publicDetail(data.id) });
      if (data.cafeId) {
        queryClient.invalidateQueries({ queryKey: drinkKeys.byCafe(data.cafeId) });
        queryClient.invalidateQueries({ queryKey: cafeKeys.publicDetail(data.cafeId) });
      }
    },
  });
}
