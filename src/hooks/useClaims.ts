"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants";
import { apiFetch } from "@/lib/api/client";
import type { MyShift, ShiftListItem } from "@/modules/claims/types";

export interface StaffDirectoryEntry {
  id: string;
  fullName: string;
  email: string;
  profession?: "doctor" | "nurse" | "receptionist";
}

/** Invalidated together, because a claim changes both the roster and my list. */
function useClaimInvalidation() {
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shifts }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myShifts }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.coverage }),
    ]);
}

export function useMyShifts() {
  return useQuery({
    queryKey: QUERY_KEYS.myShifts,
    queryFn: () => apiFetch<MyShift[]>("/api/my-shifts"),
  });
}

export function useStaffDirectory(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.staffDirectory,
    queryFn: () => apiFetch<StaffDirectoryEntry[]>("/api/staff"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClaimShift() {
  const invalidate = useClaimInvalidation();

  return useMutation({
    mutationFn: ({ shiftId, userId }: { shiftId: string; userId?: string }) =>
      apiFetch<ShiftListItem>(`/api/shifts/${shiftId}/claim`, {
        method: "POST",
        body: JSON.stringify(userId ? { userId } : {}),
      }),
    onSuccess: invalidate,
  });
}

export function useReleaseClaim() {
  const invalidate = useClaimInvalidation();

  return useMutation({
    mutationFn: ({ shiftId, userId }: { shiftId: string; userId?: string }) =>
      apiFetch<ShiftListItem>(
        userId ? `/api/shifts/${shiftId}/claim?userId=${userId}` : `/api/shifts/${shiftId}/claim`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  });
}
