"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/constants";
import { apiFetch } from "@/lib/api/client";
import type { ImportCounts, ImportSectionResult } from "@/modules/imports/import.types";

export interface ImportRunSummaryView {
  id: string;
  source: "seed" | "upload";
  fileName?: string;
  createdAt: string;
  totals: ImportCounts;
}

export interface ImportRunDetailView extends ImportRunSummaryView {
  sections: ImportSectionResult[];
}

export function useImportRuns() {
  return useQuery({
    queryKey: QUERY_KEYS.importRuns,
    queryFn: () => apiFetch<ImportRunSummaryView[]>("/api/import"),
  });
}

export function useImportRun(runId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.importRun, runId ?? "latest"],
    queryFn: () => apiFetch<ImportRunDetailView>(`/api/import/${runId ?? "latest"}`),
  });
}

export function useUploadImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      // No Content-Type header: the browser must set the multipart boundary.
      return apiFetch<ImportRunDetailView>("/api/import", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.importRuns }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.importRun }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shifts }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.staffDirectory }),
      ]),
  });
}
