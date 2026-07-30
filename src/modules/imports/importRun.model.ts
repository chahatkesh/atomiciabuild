import { Schema, Types, model, models } from "mongoose";

import type { CsvKind, ImportCounts, RowReport } from "@/modules/imports/import.types";

export type ImportSource = "seed" | "upload";

export interface ImportSectionDocument {
  kind: CsvKind;
  fileName?: string;
  counts: ImportCounts;
  persisted: number;
  rows: RowReport[];
}

export interface ImportRunDocument {
  source: ImportSource;
  fileName?: string;
  triggeredByUserId?: Types.ObjectId;
  startedAt: Date;
  finishedAt: Date;
  totals: ImportCounts;
  sections: ImportSectionDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const countsSchema = {
  total: { type: Number, required: true, default: 0 },
  accepted: { type: Number, required: true, default: 0 },
  repaired: { type: Number, required: true, default: 0 },
  merged: { type: Number, required: true, default: 0 },
  rejected: { type: Number, required: true, default: 0 },
};

const rowReportSchema = new Schema<RowReport>(
  {
    rowNumber: { type: Number, required: true },
    raw: { type: Schema.Types.Mixed, required: true },
    verdict: {
      type: String,
      enum: ["accepted", "repaired", "merged", "rejected"],
      required: true,
    },
    issues: { type: [String], default: [] },
    action: { type: String, required: true },
  },
  { _id: false },
);

const sectionSchema = new Schema<ImportSectionDocument>(
  {
    kind: { type: String, enum: ["staff", "shifts"], required: true },
    fileName: { type: String, required: false },
    counts: { type: countsSchema, required: true, _id: false },
    persisted: { type: Number, required: true, default: 0 },
    rows: { type: [rowReportSchema], default: [] },
  },
  { _id: false },
);

const importRunSchema = new Schema<ImportRunDocument>(
  {
    source: { type: String, enum: ["seed", "upload"], required: true },
    fileName: { type: String, required: false },
    triggeredByUserId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    totals: { type: countsSchema, required: true, _id: false },
    sections: { type: [sectionSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

importRunSchema.index({ createdAt: -1 });

export const ImportRunModel =
  models.ImportRun ?? model<ImportRunDocument>("ImportRun", importRunSchema);
