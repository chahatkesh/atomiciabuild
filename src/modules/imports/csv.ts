import Papa from "papaparse";

import { AppError } from "@/lib/errors/AppError";
import type { CsvKind, RawRow } from "@/modules/imports/import.types";
import { SHIFT_HEADERS } from "@/modules/imports/shift.normalizer";
import { STAFF_HEADERS } from "@/modules/imports/staff.normalizer";

export interface ParsedCsv {
  headers: string[];
  rows: RawRow[];
}

/**
 * Header names are lowercased and trimmed so a file exported with `Staff_ID`
 * or a stray space still lines up. Values are left untouched: the report is
 * supposed to show the manager exactly what was in the file.
 */
export function parseCsv(content: string): ParsedCsv {
  const result = Papa.parse<RawRow>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const headers = (result.meta.fields ?? []).filter(Boolean);

  if (headers.length === 0) {
    throw AppError.validation("CSV file has no header row");
  }

  return { headers, rows: result.data };
}

export function detectCsvKind(headers: string[]): CsvKind | null {
  const set = new Set(headers);

  if (SHIFT_HEADERS.every((header) => set.has(header))) {
    return "shifts";
  }

  if (STAFF_HEADERS.every((header) => set.has(header))) {
    return "staff";
  }

  return null;
}

export function assertHeadersFor(kind: CsvKind, headers: string[]): void {
  const required = kind === "staff" ? STAFF_HEADERS : SHIFT_HEADERS;
  const set = new Set(headers);
  const missing = required.filter((header) => !set.has(header));

  if (missing.length > 0) {
    throw AppError.validation(
      `CSV is missing required ${kind} column(s): ${missing.join(", ")}. ` +
        `Expected: ${required.join(", ")}`,
    );
  }
}
