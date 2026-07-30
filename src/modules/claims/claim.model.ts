import { Schema, Types, model, models } from "mongoose";

import type { ClaimStatus, Profession } from "@/types";

export type ClaimSource = "self" | "manager";

export interface ClaimDocument {
  shiftId: Types.ObjectId;
  userId: Types.ObjectId;
  /**
   * Denormalized from the user at claim time so capacity maths never needs a
   * join, and so history stays truthful if someone's profession is corrected
   * later by a re-import.
   */
  profession: Profession;
  status: ClaimStatus;
  source: ClaimSource;
  assignedByUserId?: Types.ObjectId;
  releasedAt?: Date;
  releaseReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const claimSchema = new Schema<ClaimDocument>(
  {
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    profession: {
      type: String,
      enum: ["doctor", "nurse", "receptionist"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "released"],
      required: true,
      default: "active",
    },
    source: {
      type: String,
      enum: ["self", "manager"],
      required: true,
      default: "self",
    },
    assignedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    releasedAt: { type: Date, required: false },
    releaseReason: { type: String, required: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/**
 * One *active* claim per person per shift. The partial filter is what makes
 * this correct: releasing a claim and claiming again must stay possible, so a
 * plain unique index on (shiftId, userId) would be wrong.
 *
 * This is the last line of defence against double-claiming — the capacity
 * check in claimShift() is guarded separately.
 */
claimSchema.index(
  { shiftId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

claimSchema.index({ userId: 1, status: 1 });
claimSchema.index({ shiftId: 1, status: 1 });

export const ClaimModel = models.Claim ?? model<ClaimDocument>("Claim", claimSchema);
