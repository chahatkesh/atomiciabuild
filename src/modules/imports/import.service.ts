import type { AnyBulkWriteOperation } from "mongoose";

import { connectDb } from "@/lib/db/connect";
import { AppError } from "@/lib/errors/AppError";
import { hashPassword } from "@/modules/auth/password";
import { assertHeadersFor, detectCsvKind, parseCsv } from "@/modules/imports/csv";
import {
  addCounts,
  emptyCounts,
  type CsvKind,
  type ImportCounts,
  type ImportRunResult,
  type ImportSectionResult,
  type NormalizedShift,
  type NormalizedStaff,
  type RawRow,
  type RowReport,
} from "@/modules/imports/import.types";
import { ImportRunModel, type ImportSource } from "@/modules/imports/importRun.model";
import { normalizeShiftRow } from "@/modules/imports/shift.normalizer";
import { normalizeStaffRow } from "@/modules/imports/staff.normalizer";
import { ShiftModel } from "@/modules/shifts/shift.model";
import { UserModel } from "@/modules/users/user.model";
import { PROFESSIONS } from "@/constants";
import type { RoleRequirements } from "@/types";

/**
 * Staff created by the importer need a way in. The legacy spreadsheet has no
 * passwords, so everyone lands on the documented shared password; existing
 * accounts keep theirs because it is only applied on insert.
 */
export const IMPORTED_STAFF_PASSWORD = "Clinic123!";

export interface ImportFileInput {
  fileName: string;
  content: string;
  kind?: CsvKind;
}

export interface RunImportArgs {
  files: ImportFileInput[];
  source: ImportSource;
  triggeredByUserId?: string;
}

function describeRequirements(requirements: RoleRequirements): string {
  return PROFESSIONS.map((profession) => `${profession}s=${requirements[profession]}`).join(", ");
}

function mergeRequirements(a: RoleRequirements, b: RoleRequirements): RoleRequirements {
  return {
    doctor: Math.max(a.doctor, b.doctor),
    nurse: Math.max(a.nurse, b.nurse),
    receptionist: Math.max(a.receptionist, b.receptionist),
  };
}

function sameRequirements(a: RoleRequirements, b: RoleRequirements): boolean {
  return PROFESSIONS.every((profession) => a[profession] === b[profession]);
}

interface StaffBucket {
  rowNumber: number;
  value: NormalizedStaff;
  legacyIds: string[];
}

async function importStaff(rows: RawRow[]): Promise<{ rows: RowReport[]; persisted: number }> {
  const byEmail = new Map<string, StaffBucket>();
  const reports: RowReport[] = [];

  rows.forEach((raw, index) => {
    const rowNumber = index + 1;
    const outcome = normalizeStaffRow(raw);

    if (!outcome.value) {
      reports.push({
        rowNumber,
        raw,
        verdict: "rejected",
        issues: outcome.issues,
        action: outcome.action,
      });
      return;
    }

    const value = outcome.value;
    const existing = byEmail.get(value.email);

    if (!existing) {
      byEmail.set(value.email, {
        rowNumber,
        value,
        legacyIds: value.legacyStaffId ? [value.legacyStaffId] : [],
      });
      reports.push({
        rowNumber,
        raw,
        verdict: outcome.verdict,
        issues: outcome.issues,
        action: outcome.action,
      });
      return;
    }

    // Same address, different human: this is a data conflict, not a duplicate.
    if (existing.value.fullName.toLowerCase() !== value.fullName.toLowerCase()) {
      reports.push({
        rowNumber,
        raw,
        verdict: "rejected",
        issues: [
          ...outcome.issues,
          `Email ${value.email} already belongs to "${existing.value.fullName}" (row ${existing.rowNumber})`,
        ],
        action: `Rejected: two different people cannot share an email; kept "${existing.value.fullName}"`,
      });
      return;
    }

    const issues = [...outcome.issues, `Duplicate of row ${existing.rowNumber} (same email)`];

    if (value.legacyStaffId && !existing.legacyIds.includes(value.legacyStaffId)) {
      existing.legacyIds.push(value.legacyStaffId);
      issues.push(`Same person under a second staff_id (${existing.legacyIds.join(" and ")})`);
    }

    if (existing.value.profession !== value.profession) {
      issues.push(
        `Role disagrees with row ${existing.rowNumber} ("${value.profession}" vs "${existing.value.profession}"); kept the first`,
      );
    }

    reports.push({
      rowNumber,
      raw,
      verdict: "merged",
      issues,
      action: `Merged into row ${existing.rowNumber} (${existing.value.fullName})`,
    });
  });

  const buckets = [...byEmail.values()];
  if (buckets.length === 0) {
    return { rows: reports, persisted: 0 };
  }

  const passwordHash = await hashPassword(IMPORTED_STAFF_PASSWORD);

  const operations: AnyBulkWriteOperation[] = buckets.map(({ value, legacyIds }) => ({
    updateOne: {
      filter: { email: value.email },
      update: {
        $set: {
          fullName: value.fullName,
          profession: value.profession,
          legacyStaffId: legacyIds[0] ?? value.legacyStaffId,
        },
        // Never overwrites an existing password or demotes a manager.
        $setOnInsert: { role: "staff", passwordHash, version: 0 },
      },
      upsert: true,
    },
  }));

  await UserModel.bulkWrite(operations);

  return { rows: reports, persisted: buckets.length };
}

interface ShiftBucket {
  rowNumber: number;
  value: NormalizedShift;
  legacyIds: string[];
}

async function importShifts(rows: RawRow[]): Promise<{ rows: RowReport[]; persisted: number }> {
  const byWindow = new Map<string, ShiftBucket>();
  const reports: RowReport[] = [];

  rows.forEach((raw, index) => {
    const rowNumber = index + 1;
    const outcome = normalizeShiftRow(raw);

    if (!outcome.value) {
      reports.push({
        rowNumber,
        raw,
        verdict: "rejected",
        issues: outcome.issues,
        action: outcome.action,
      });
      return;
    }

    const value = outcome.value;
    const key = `${value.date}|${value.startAt.toISOString()}|${value.endAt.toISOString()}`;
    const existing = byWindow.get(key);

    if (!existing) {
      byWindow.set(key, {
        rowNumber,
        value,
        legacyIds: value.legacyShiftId ? [value.legacyShiftId] : [],
      });
      reports.push({
        rowNumber,
        raw,
        verdict: outcome.verdict,
        issues: outcome.issues,
        action: outcome.action,
      });
      return;
    }

    const before = existing.value.requirements;
    const merged = mergeRequirements(before, value.requirements);
    const identical = sameRequirements(before, value.requirements);
    existing.value.requirements = merged;

    if (value.legacyShiftId && !existing.legacyIds.includes(value.legacyShiftId)) {
      existing.legacyIds.push(value.legacyShiftId);
    }

    const window = `${value.date} ${value.startTime}–${value.endTime}`;
    const issues = [
      ...outcome.issues,
      identical
        ? `Exact duplicate of row ${existing.rowNumber}`
        : `Same time window as row ${existing.rowNumber} but different requirements ` +
          `(${describeRequirements(value.requirements)} vs ${describeRequirements(before)})`,
    ];

    reports.push({
      rowNumber,
      raw,
      verdict: "merged",
      issues,
      action: identical
        ? `Merged into row ${existing.rowNumber} (${window}); no change to requirements`
        : `Merged into row ${existing.rowNumber} (${window}); took the higher count per profession → ${describeRequirements(merged)}`,
    });
  });

  const buckets = [...byWindow.values()];
  if (buckets.length === 0) {
    return { rows: reports, persisted: 0 };
  }

  const operations: AnyBulkWriteOperation[] = buckets.map(({ value, legacyIds }) => ({
    updateOne: {
      filter: { date: value.date, startAt: value.startAt, endAt: value.endAt },
      update: {
        $set: { startTime: value.startTime, endTime: value.endTime },
        // Raising requirements is safe for existing claims; lowering them is
        // not, so a re-import never reduces a live shift.
        $max: {
          "requirements.doctor": value.requirements.doctor,
          "requirements.nurse": value.requirements.nurse,
          "requirements.receptionist": value.requirements.receptionist,
        },
        $addToSet: { legacyShiftIds: { $each: legacyIds } },
        $setOnInsert: { filled: { doctor: 0, nurse: 0, receptionist: 0 }, version: 0 },
      },
      upsert: true,
    },
  }));

  await ShiftModel.bulkWrite(operations);

  return { rows: reports, persisted: buckets.length };
}

function countRows(rows: RowReport[]): ImportCounts {
  const counts = emptyCounts();
  rows.forEach((row) => addCounts(counts, row.verdict));
  return counts;
}

function sumCounts(sections: ImportSectionResult[]): ImportCounts {
  const totals = emptyCounts();
  for (const section of sections) {
    totals.total += section.counts.total;
    totals.accepted += section.counts.accepted;
    totals.repaired += section.counts.repaired;
    totals.merged += section.counts.merged;
    totals.rejected += section.counts.rejected;
  }
  return totals;
}

/**
 * Single entry point shared by the seed script and the manager upload, so the
 * deployed data and an ad-hoc upload can never diverge in behaviour.
 */
export async function runImport(args: RunImportArgs): Promise<ImportRunResult> {
  await connectDb();

  if (args.files.length === 0) {
    throw AppError.validation("No CSV file provided");
  }

  const startedAt = new Date();
  const sections: ImportSectionResult[] = [];

  for (const file of args.files) {
    const parsed = parseCsv(file.content);
    const kind = file.kind ?? detectCsvKind(parsed.headers);

    if (!kind) {
      throw AppError.validation(
        `Could not tell whether "${file.fileName}" is a staff or shifts export. ` +
          `Found columns: ${parsed.headers.join(", ")}`,
      );
    }

    assertHeadersFor(kind, parsed.headers);

    const { rows, persisted } =
      kind === "staff" ? await importStaff(parsed.rows) : await importShifts(parsed.rows);

    sections.push({
      kind,
      counts: countRows(rows),
      rows,
      persisted,
    });
  }

  const finishedAt = new Date();
  const totals = sumCounts(sections);

  const run = await ImportRunModel.create({
    source: args.source,
    fileName: args.files.map((file) => file.fileName).join(", "),
    triggeredByUserId: args.triggeredByUserId,
    startedAt,
    finishedAt,
    totals,
    sections: sections.map((section, index) => ({
      kind: section.kind,
      fileName: args.files[index]?.fileName,
      counts: section.counts,
      persisted: section.persisted,
      rows: section.rows,
    })),
  });

  return {
    id: run._id.toString(),
    source: args.source,
    fileName: args.files.map((file) => file.fileName).join(", "),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    sections,
    totals,
  };
}

export interface ImportRunSummary {
  id: string;
  source: ImportSource;
  fileName?: string;
  createdAt: string;
  totals: ImportCounts;
}

export async function listImportRuns(limit = 20): Promise<ImportRunSummary[]> {
  await connectDb();

  const runs = await ImportRunModel.find()
    .select({ source: 1, fileName: 1, createdAt: 1, totals: 1 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<
      {
        _id: { toString(): string };
        source: ImportSource;
        fileName?: string;
        createdAt: Date;
        totals: ImportCounts;
      }[]
    >();

  return runs.map((run) => ({
    id: run._id.toString(),
    source: run.source,
    fileName: run.fileName,
    createdAt: run.createdAt.toISOString(),
    totals: run.totals,
  }));
}

export interface ImportRunDetail extends ImportRunSummary {
  sections: ImportSectionResult[];
}

type LeanImportRun = {
  _id: { toString(): string };
  source: ImportSource;
  fileName?: string;
  createdAt: Date;
  totals: ImportCounts;
  sections: ImportSectionResult[];
};

export async function getImportRun(id?: string): Promise<ImportRunDetail | null> {
  await connectDb();

  const run = id
    ? await ImportRunModel.findById(id).lean<LeanImportRun | null>()
    : await ImportRunModel.findOne().sort({ createdAt: -1 }).lean<LeanImportRun | null>();

  if (!run) {
    return null;
  }

  return {
    id: run._id.toString(),
    source: run.source,
    fileName: run.fileName,
    createdAt: run.createdAt.toISOString(),
    totals: run.totals,
    sections: run.sections.map((section) => ({
      kind: section.kind,
      counts: section.counts,
      rows: section.rows,
      persisted: section.persisted,
    })),
  };
}
