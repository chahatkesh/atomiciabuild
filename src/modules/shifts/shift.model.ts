import { Schema, model, models } from "mongoose";

import type { FilledCounts, RoleRequirements } from "@/types";

export interface ShiftDocument {
  date: string;
  startTime: string;
  endTime: string;
  startAt: Date;
  endAt: Date;
  requirements: RoleRequirements;
  filled: FilledCounts;
  legacyShiftIds: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const countsSchema = {
  doctor: { type: Number, required: true, min: 0, default: 0 },
  nurse: { type: Number, required: true, min: 0, default: 0 },
  receptionist: { type: Number, required: true, min: 0, default: 0 },
};

const shiftSchema = new Schema<ShiftDocument>(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    requirements: {
      type: countsSchema,
      required: true,
      _id: false,
    },
    filled: {
      type: countsSchema,
      required: true,
      _id: false,
    },
    legacyShiftIds: {
      type: [String],
      default: [],
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

shiftSchema.index({ startAt: 1, endAt: 1 });
shiftSchema.index({ date: 1 });

// Natural key for the CSV importer: one shift per clinic time window.
shiftSchema.index({ date: 1, startAt: 1, endAt: 1 }, { unique: true });

export const ShiftModel = models.Shift ?? model<ShiftDocument>("Shift", shiftSchema);
