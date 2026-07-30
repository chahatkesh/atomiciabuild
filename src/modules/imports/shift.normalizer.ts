import { buildShiftWindow, parseClinicDate, parseClinicTime } from "@/lib/time/clinic";
import type { NormalizedShift, RawRow, RowOutcome } from "@/modules/imports/import.types";
import {
  hasAnyRequirement,
  parseFreeTextRequirements,
  parseStructuredRequirements,
  validateShiftDuration,
} from "@/modules/shifts/shift.rules";
import { PROFESSIONS } from "@/constants";

export const SHIFT_HEADERS = [
  "shift_id",
  "date",
  "start_time",
  "end_time",
  "requirements",
] as const;

interface DateReading {
  date: string | null;
  note?: string;
}

/**
 * The export mixes three date conventions. Which one applies is decided by the
 * separator, and the dataset proves the mapping: `29/08/2026` can only be
 * day-first, and `08-13-2026` can only be month-first. Every interpretation
 * that is not already ISO is reported, because reading `05/08/2026` as
 * 5 August rather than 8 May is a judgement call the manager should see.
 */
function readDate(raw: string): DateReading {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { date: null };
  }

  const parsed = parseClinicDate(trimmed);
  if (!parsed) {
    return { date: null };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { date: parsed };
  }

  const convention = trimmed.includes("/") ? "DD/MM/YYYY" : "MM-DD-YYYY";
  return { date: parsed, note: `Read "${trimmed}" as ${convention} → ${parsed}` };
}

function namesEveryProfession(raw: string): boolean {
  const lowered = raw.toLowerCase();
  return PROFESSIONS.every((profession) => lowered.includes(profession));
}

export function normalizeShiftRow(raw: RawRow): RowOutcome<NormalizedShift> {
  const issues: string[] = [];
  const legacyShiftId = (raw.shift_id ?? "").trim();

  const rawDate = raw.date ?? "";
  const rawStart = raw.start_time ?? "";
  const rawEnd = raw.end_time ?? "";
  const rawRequirements = raw.requirements ?? "";

  const reading = readDate(rawDate);
  if (!reading.date) {
    return {
      verdict: "rejected",
      issues: [rawDate.trim() ? `Invalid date: "${rawDate.trim()}"` : "Missing date"],
      action: "Rejected: the date is not a real calendar day",
    };
  }
  if (reading.note) {
    issues.push(reading.note);
  }

  if (!rawStart.trim()) {
    return {
      verdict: "rejected",
      issues: [...issues, "Missing start_time"],
      action: "Rejected: a shift needs a start time",
    };
  }
  if (!rawEnd.trim()) {
    return {
      verdict: "rejected",
      issues: [...issues, "Missing end_time"],
      action: "Rejected: a shift needs an end time",
    };
  }

  const startTime = parseClinicTime(rawStart);
  if (!startTime) {
    return {
      verdict: "rejected",
      issues: [...issues, `Invalid start_time: "${rawStart.trim()}"`],
      action: "Rejected: start time is not a valid 24-hour time",
    };
  }

  const endTime = parseClinicTime(rawEnd);
  if (!endTime) {
    return {
      verdict: "rejected",
      issues: [...issues, `Invalid end_time: "${rawEnd.trim()}"`],
      action: "Rejected: end time is not a valid 24-hour time",
    };
  }

  if (startTime === endTime) {
    return {
      verdict: "rejected",
      issues: [...issues, `Zero-length shift: starts and ends at ${startTime}`],
      action: "Rejected: a shift cannot start and end at the same moment",
    };
  }

  if (endTime.endsWith("+1") || startTime.endsWith("+1")) {
    issues.push(`Interpreted "+1" as the next calendar day`);
  }

  const window = buildShiftWindow(reading.date, startTime, endTime);
  const duration = validateShiftDuration(window.startAt, window.endAt);
  if (!duration.valid) {
    const hours = (duration.minutes / 60).toFixed(duration.minutes % 60 === 0 ? 0 : 1);
    return {
      verdict: "rejected",
      issues: [...issues, `${duration.reason} (row spans ${hours}h)`],
      action: "Rejected: the time range is not a plausible shift",
    };
  }

  // An end time earlier than the start is only sane as an overnight shift.
  if (endTime < startTime && !endTime.endsWith("+1")) {
    issues.push(`Treated ${startTime}–${endTime} as an overnight shift ending the next day`);
  }

  const structured = parseStructuredRequirements(rawRequirements);
  let requirements = structured;

  if (structured) {
    if (!namesEveryProfession(rawRequirements)) {
      issues.push("Professions absent from requirements defaulted to 0");
    }
  } else {
    requirements = parseFreeTextRequirements(rawRequirements);
    if (requirements) {
      issues.push(`Parsed free-text requirements "${rawRequirements.trim()}"`);
    }
  }

  if (!requirements) {
    return {
      verdict: "rejected",
      issues: [...issues, `Unreadable requirements: "${rawRequirements.trim()}"`],
      action: "Rejected: could not work out how many of each profession are needed",
    };
  }

  if (!hasAnyRequirement(requirements)) {
    return {
      verdict: "rejected",
      issues: [...issues, "Shift requires nobody"],
      action: "Rejected: a shift with no staffing requirement cannot be claimed",
    };
  }

  return {
    verdict: issues.length > 0 ? "repaired" : "accepted",
    issues,
    action: issues.length > 0 ? "Imported after repair" : "Imported",
    value: {
      legacyShiftId,
      date: reading.date,
      startTime,
      endTime,
      startAt: window.startAt,
      endAt: window.endAt,
      requirements,
    },
  };
}
