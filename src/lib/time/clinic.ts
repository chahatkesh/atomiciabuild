import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { getEnv } from "@/lib/config/env";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export interface ShiftWindow {
  date: string;
  startTime: string;
  endTime: string;
  startAt: Date;
  endAt: Date;
}

export interface Interval {
  startAt: Date;
  endAt: Date;
}

export function getClinicTimezone(): string {
  return getEnv().CLINIC_TIMEZONE;
}

export function parseClinicDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = dayjs(trimmed, "YYYY-MM-DD", true);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const parsed = dayjs(trimmed, "DD/MM/YYYY", true);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const parsed = dayjs(trimmed, "MM-DD-YYYY", true);
    return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
  }

  return null;
}

export function parseClinicTime(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const plusOneMatch = /^(\d{2}:\d{2})\+1$/.exec(trimmed);
  const candidate = plusOneMatch ? plusOneMatch[1] : trimmed;

  if (!/^\d{2}:\d{2}$/.test(candidate)) {
    return null;
  }

  const [hours, minutes] = candidate.split(":").map(Number);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  return plusOneMatch ? `${candidate}+1` : candidate;
}

export function buildShiftWindow(date: string, startTime: string, endTime: string): ShiftWindow {
  const tz = getClinicTimezone();
  const startBase = startTime.replace("+1", "");
  const endBase = endTime.replace("+1", "");

  let startAt = dayjs.tz(`${date} ${startBase}`, "YYYY-MM-DD HH:mm", tz);
  let endAt = dayjs.tz(`${date} ${endBase}`, "YYYY-MM-DD HH:mm", tz);

  if (startTime.endsWith("+1")) {
    startAt = startAt.add(1, "day");
  }

  if (endTime.endsWith("+1")) {
    endAt = endAt.add(1, "day");
  }

  if (!endAt.isAfter(startAt)) {
    endAt = endAt.add(1, "day");
  }

  return {
    date,
    startTime,
    endTime,
    startAt: startAt.toDate(),
    endAt: endAt.toDate(),
  };
}

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

/** Today's date in clinic-local terms, which is what shift dates are keyed by. */
export function todayInClinic(): string {
  return dayjs().tz(getClinicTimezone()).format("YYYY-MM-DD");
}

/**
 * Monday of the week containing `date`. Clinic rosters are read Monday-first,
 * and the brief's recurring-shift example ("every Mon/Wed") assumes the same.
 */
export function startOfClinicWeek(date: string): string {
  const parsed = dayjs(date, "YYYY-MM-DD", true);
  if (!parsed.isValid()) {
    throw new Error(`Invalid date: ${date}`);
  }

  // dayjs day(): 0 = Sunday. Shift so Monday is 0.
  const offset = (parsed.day() + 6) % 7;
  return parsed.subtract(offset, "day").format("YYYY-MM-DD");
}

/** The seven dates of the week beginning at `weekStart`. */
export function clinicWeekDates(weekStart: string): string[] {
  const start = dayjs(weekStart, "YYYY-MM-DD", true);
  if (!start.isValid()) {
    throw new Error(`Invalid date: ${weekStart}`);
  }

  return Array.from({ length: 7 }, (_, index) => start.add(index, "day").format("YYYY-MM-DD"));
}

export function minutesBetween(startAt: Date, endAt: Date): number {
  return dayjs(endAt).diff(dayjs(startAt), "minute");
}

export function isValidShiftDuration(startAt: Date, endAt: Date): boolean {
  return minutesBetween(startAt, endAt) > 0;
}
