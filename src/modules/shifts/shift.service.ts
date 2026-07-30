import { connectDb } from "@/lib/db/connect";
import { AppError } from "@/lib/errors/AppError";
import { buildShiftWindow, parseClinicDate, parseClinicTime } from "@/lib/time/clinic";
import { ShiftModel, type ShiftDocument } from "@/modules/shifts/shift.model";
import { missingRoles, staffingStatus, validateShiftDuration } from "@/modules/shifts/shift.rules";
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

type LeanShift = ShiftDocument & { _id: { toString(): string } };

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

export async function updateShift(id: string, input: UpdateShiftInput): Promise<ShiftRecord> {
  await connectDb();

  const existing = await ShiftModel.findById(id).lean<LeanShift | null>();
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
    const shift = await ShiftModel.findByIdAndUpdate(
      id,
      { $set: update, $inc: { version: 1 } },
      { returnDocument: "after", runValidators: true },
    ).lean<LeanShift | null>();

    if (!shift) {
      throw AppError.notFound("Shift not found");
    }

    return toShiftRecord(shift);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict("A shift already exists for that date and time window");
    }
    throw error;
  }
}

export async function deleteShift(id: string): Promise<void> {
  await connectDb();
  const result = await ShiftModel.findByIdAndDelete(id).lean<LeanShift | null>();

  if (!result) {
    throw AppError.notFound("Shift not found");
  }
}

export async function countShifts(): Promise<number> {
  await connectDb();
  return ShiftModel.countDocuments();
}
