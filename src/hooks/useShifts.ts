"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants";
import { apiFetch } from "@/lib/api/client";
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
    queryFn: () => apiFetch<ShiftRecord[]>(buildShiftsUrl(params)),
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

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateShiftPayload }) =>
      apiFetch<ShiftRecord>(`/api/shifts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shifts }),
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; deleted: boolean }>(`/api/shifts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shifts }),
  });
}
