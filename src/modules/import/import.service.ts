import type { ImportVerdict } from "@/types";

export interface ImportRowReport {
  source: "staff" | "shifts";
  rowNumber: number;
  raw: Record<string, string>;
  verdict: ImportVerdict;
  message: string;
}

export interface ImportRunReport {
  id: string;
  startedAt: Date;
  completedAt: Date;
  accepted: number;
  repaired: number;
  merged: number;
  rejected: number;
  rows: ImportRowReport[];
}

export interface ImportService {
  importFromFiles(params: {
    staffCsv?: string;
    shiftsCsv?: string;
    initiatedBy: string;
  }): Promise<ImportRunReport>;
}

export const importService: ImportService = {
  async importFromFiles() {
    throw new Error("Not implemented: importFromFiles (Phase 2)");
  },
};
