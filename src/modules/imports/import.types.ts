import type { ImportVerdict, Profession, RoleRequirements } from "@/types";

export type CsvKind = "staff" | "shifts";

export type RawRow = Record<string, string>;

/** What happened to one CSV row, verbatim enough to show in the report table. */
export interface RowReport {
  /** 1-based index among data rows, so it lines up with the file minus header. */
  rowNumber: number;
  raw: RawRow;
  verdict: ImportVerdict;
  /** What was wrong with the row, in reviewer-readable language. */
  issues: string[];
  /** What the importer did about it. */
  action: string;
}

export interface NormalizedStaff {
  legacyStaffId: string;
  fullName: string;
  profession: Profession;
  email: string;
}

export interface NormalizedShift {
  legacyShiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Resolved instants; also form the merge key, matching the DB natural key. */
  startAt: Date;
  endAt: Date;
  requirements: RoleRequirements;
}

/** Outcome of normalizing a single row, before cross-row deduplication. */
export interface RowOutcome<T> {
  verdict: Extract<ImportVerdict, "accepted" | "repaired" | "rejected">;
  issues: string[];
  action: string;
  value?: T;
}

export interface ImportCounts {
  total: number;
  accepted: number;
  repaired: number;
  merged: number;
  rejected: number;
}

export interface ImportSectionResult {
  kind: CsvKind;
  counts: ImportCounts;
  rows: RowReport[];
  /** Records actually written to the database after merging. */
  persisted: number;
}

export interface ImportRunResult {
  id: string;
  source: "seed" | "upload";
  fileName?: string;
  startedAt: string;
  finishedAt: string;
  sections: ImportSectionResult[];
  totals: ImportCounts;
}

export function emptyCounts(): ImportCounts {
  return { total: 0, accepted: 0, repaired: 0, merged: 0, rejected: 0 };
}

export function addCounts(target: ImportCounts, verdict: ImportVerdict): void {
  target.total += 1;
  target[verdict] += 1;
}
