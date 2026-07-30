import type { Types } from "mongoose";

import type { ShiftDocument } from "@/modules/shifts/shift.model";
import { missingRoles, staffingStatus } from "@/modules/shifts/shift.rules";
import type { ShiftRecord } from "@/modules/shifts/types";

export type LeanShift = ShiftDocument & { _id: Types.ObjectId };

/**
 * Lives apart from shift.service so the claims module can serialize a shift
 * without importing the service that, in turn, imports claim revalidation.
 */
export function toShiftRecord(shift: LeanShift): ShiftRecord {
  return {
    id: shift._id.toString(),
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    startAt: shift.startAt.toISOString(),
    endAt: shift.endAt.toISOString(),
    requirements: shift.requirements,
    filled: shift.filled,
    missing: missingRoles(shift.requirements, shift.filled),
    status: staffingStatus(shift.requirements, shift.filled),
    legacyShiftIds: shift.legacyShiftIds ?? [],
    version: shift.version ?? 0,
  };
}
