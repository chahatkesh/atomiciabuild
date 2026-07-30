"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LIVE_POLL_INTERVAL_MS, QUERY_KEYS } from "@/constants";
import { apiFetch } from "@/lib/api/client";
import type { ReleasedClaimSummary, ShiftListItem } from "@/modules/claims/types";
import type { CreateShiftPayload, ShiftRecord, UpdateShiftPayload } from "@/modules/shifts/types";

export interface UseShiftsParams {
  from?: string;
  to?: string;
}

function buildShiftsUrl(params: UseShiftsParams): string {
  const search = new URLSearchParams();
  if (params.from) {
    search.set("from", params.from);
  }
  if (params.to) {
    search.set("to", params.to);
  }

  const query = search.toString();
  return query ? `/api/shifts?${query}` : "/api/shifts";
}

export function useShifts(params: UseShiftsParams = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.shifts, params],
    queryFn: () => apiFetch<ShiftListItem[]>(buildShiftsUrl(params)),
    // Someone else claiming the last slot should show up without a refresh.
    refetchInterval: LIVE_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateShiftPayload) =>
      apiFetch<ShiftRecord>("/api/shifts", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shifts }),
  });
}

export type UpdateShiftResponse = ShiftRecord & { releasedClaims: ReleasedClaimSummary[] };

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateShiftPayload }) =>
      apiFetch<UpdateShiftResponse>(`/api/shifts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateShiftViews(queryClient),
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; deleted: boolean; releasedClaims: number }>(`/api/shifts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateShiftViews(queryClient),
  });
}

/** An edit can release claims, so the staff-facing views must refresh too. */
function invalidateShiftViews(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shifts }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myShifts }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coverage }),
  ]);
}
