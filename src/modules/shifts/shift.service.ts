import { Types } from "mongoose";

import { connectDb } from "@/lib/db/connect";
import { withTransaction } from "@/lib/db/withTransaction";
import { AppError } from "@/lib/errors/AppError";
import { buildShiftWindow, parseClinicDate, parseClinicTime } from "@/lib/time/clinic";
import { releaseAllClaimsForShift, revalidateShiftClaims } from "@/modules/claims/claim.service";
import type { ReleasedClaimSummary } from "@/modules/claims/types";
import { ShiftModel, type ShiftDocument } from "@/modules/shifts/shift.model";
import { validateShiftDuration } from "@/modules/shifts/shift.rules";
import { toShiftRecord, type LeanShift } from "@/modules/shifts/shift.serializer";
import type {
  CreateShiftInput,
  ListShiftsParams,
  ShiftRecord,
  UpdateShiftInput,
} from "@/modules/shifts/types";

export type {
  CreateShiftInput,
  ListShiftsParams,
  ShiftRecord,
  UpdateShiftInput,
} from "@/modules/shifts/types";

export { toShiftRecord };

/**
 * Normalizes user/CSV input into a stored shift window and rejects impossible
 * times. Overnight shifts (22:00-06:00) roll the end into the next day.
 */
function normalizeWindow(date: string, startTime: string, endTime: string) {
  const normalizedDate = parseClinicDate(date);
  if (!normalizedDate) {
    throw AppError.validation(`Invalid date: ${date}`);
  }

  const normalizedStart = parseClinicTime(startTime);
  if (!normalizedStart) {
    throw AppError.validation(`Invalid start time: ${startTime}`);
  }

  const normalizedEnd = parseClinicTime(endTime);
  if (!normalizedEnd) {
    throw AppError.validation(`Invalid end time: ${endTime}`);
  }

  // Without this the rollover turns an identical start/end into a 24h shift,
  // which would surface as a confusing "exceeds 16 hours" error.
  if (normalizedStart === normalizedEnd) {
    throw AppError.validation("Start and end time cannot be the same");
  }

  const window = buildShiftWindow(normalizedDate, normalizedStart, normalizedEnd);
  const duration = validateShiftDuration(window.startAt, window.endAt);

  if (!duration.valid) {
    throw AppError.validation(duration.reason ?? "Invalid shift duration");
  }

  return window;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function listShifts(params: ListShiftsParams = {}): Promise<ShiftRecord[]> {
  await connectDb();

  const dateRange: { $gte?: string; $lte?: string } = {};
  if (params.from) {
    dateRange.$gte = params.from;
  }
  if (params.to) {
    dateRange.$lte = params.to;
  }

  const filter = Object.keys(dateRange).length > 0 ? { date: dateRange } : {};

  const shifts = await ShiftModel.find(filter).sort({ startAt: 1 }).lean<LeanShift[]>();
  return shifts.map(toShiftRecord);
}

/**
 * First and last scheduled dates. The dashboard uses this to point a manager at
 * a week that has shifts when the week they are viewing is empty.
 */
export async function getShiftDateRange(): Promise<{
  firstDate: string | null;
  lastDate: string | null;
}> {
  await connectDb();

  const [first, last] = await Promise.all([
    ShiftModel.findOne().sort({ date: 1 }).select("date").lean<{ date: string } | null>(),
    ShiftModel.findOne().sort({ date: -1 }).select("date").lean<{ date: string } | null>(),
  ]);

  return { firstDate: first?.date ?? null, lastDate: last?.date ?? null };
}

export async function getShiftById(id: string): Promise<ShiftRecord | null> {
  await connectDb();
  const shift = await ShiftModel.findById(id).lean<LeanShift | null>();
  return shift ? toShiftRecord(shift) : null;
}

export async function createShift(input: CreateShiftInput): Promise<ShiftRecord> {
  await connectDb();

  const window = normalizeWindow(input.date, input.startTime, input.endTime);

  try {
    const shift = await ShiftModel.create({
      date: window.date,
      startTime: window.startTime,
      endTime: window.endTime,
      startAt: window.startAt,
      endAt: window.endAt,
      requirements: input.requirements,
      filled: { doctor: 0, nurse: 0, receptionist: 0 },
      legacyShiftIds: [],
      version: 0,
    });

    return toShiftRecord(shift.toObject() as LeanShift);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("A shift already exists for that date and time window");
    }
    throw error;
  }
}

export interface UpdateShiftResult {
  shift: ShiftRecord;
  /**
   * Claims dropped because the edit invalidated them. The brief leaves this
   * behaviour to us; surfacing it lets the manager see the human cost of an
   * edit instead of it happening silently.
   */
  releasedClaims: ReleasedClaimSummary[];
}

export async function updateShift(id: string, input: UpdateShiftInput): Promise<UpdateShiftResult> {
  if (!Types.ObjectId.isValid(id)) {
    throw AppError.badRequest("Invalid shift id");
  }
  const shiftId = new Types.ObjectId(id);

  return withTransaction(async (session) => {
    const existing = await ShiftModel.findById(shiftId).session(session).lean<LeanShift | null>();
    if (!existing) {
      throw AppError.notFound("Shift not found");
    }

    const update: Partial<ShiftDocument> = {};

    const timeChanged =
      input.date !== undefined || input.startTime !== undefined || input.endTime !== undefined;

    if (timeChanged) {
      const window = normalizeWindow(
        input.date ?? existing.date,
        input.startTime ?? existing.startTime,
        input.endTime ?? existing.endTime,
      );

      update.date = window.date;
      update.startTime = window.startTime;
      update.endTime = window.endTime;
      update.startAt = window.startAt;
      update.endAt = window.endAt;
    }

    if (input.requirements) {
      update.requirements = input.requirements;
    }

    try {
      const updated = await ShiftModel.findByIdAndUpdate(
        shiftId,
        { $set: update, $inc: { version: 1 } },
        { session, returnDocument: "after", runValidators: true },
      ).lean<LeanShift | null>();

      if (!updated) {
        throw AppError.notFound("Shift not found");
      }
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw AppError.conflict("A shift already exists for that date and time window");
      }
      throw error;
    }

    // Re-runs capacity and overlap against the new shape, and rewrites the
    // denormalized filled counts from the surviving claims.
    const releasedClaims = await revalidateShiftClaims(session, shiftId);

    const shift = await ShiftModel.findById(shiftId).session(session).lean<LeanShift | null>();
    if (!shift) {
      throw AppError.notFound("Shift not found");
    }

    return { shift: toShiftRecord(shift), releasedClaims };
  });
}

export interface DeleteShiftResult {
  releasedClaims: number;
}

export async function deleteShift(id: string): Promise<DeleteShiftResult> {
  if (!Types.ObjectId.isValid(id)) {
    throw AppError.badRequest("Invalid shift id");
  }
  const shiftId = new Types.ObjectId(id);

  return withTransaction(async (session) => {
    const shift = await ShiftModel.findById(shiftId).session(session).lean<LeanShift | null>();
    if (!shift) {
      throw AppError.notFound("Shift not found");
    }

    const releasedClaims = await releaseAllClaimsForShift(
      session,
      shiftId,
      "Shift was deleted by a manager",
    );

    await ShiftModel.deleteOne({ _id: shiftId }, { session });

    return { releasedClaims };
  });
}

export async function countShifts(): Promise<number> {
  await connectDb();
  return ShiftModel.countDocuments();
}
