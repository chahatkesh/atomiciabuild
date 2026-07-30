"use client";

import { useQuery } from "@tanstack/react-query";

import { LIVE_POLL_INTERVAL_MS, QUERY_KEYS } from "@/constants";
import { apiFetch } from "@/lib/api/client";
import type { WeekCoverage } from "@/modules/coverage/types";

/**
 * `weekStart` is passed through verbatim; the server snaps it to the week's
 * Monday, so the client never has to agree on where a week begins.
 */
export function useWeekCoverage(weekStart?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.coverage, weekStart ?? "current"],
    queryFn: () =>
      apiFetch<WeekCoverage>(weekStart ? `/api/coverage?weekStart=${weekStart}` : "/api/coverage"),
    refetchInterval: LIVE_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    // Keep the old week on screen while the next one loads instead of flashing
    // a skeleton on every arrow press.
    placeholderData: (previous) => previous,
  });
}
