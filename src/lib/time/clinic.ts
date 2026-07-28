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

export function minutesBetween(startAt: Date, endAt: Date): number {
  return dayjs(endAt).diff(dayjs(startAt), "minute");
}

export function isValidShiftDuration(startAt: Date, endAt: Date): boolean {
  return minutesBetween(startAt, endAt) > 0;
}
