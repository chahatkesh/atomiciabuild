import { PROFESSIONS } from "@/constants";
import { minutesBetween } from "@/lib/time/clinic";
import type { FilledCounts, Profession, RoleRequirements, StaffingStatus } from "@/types";

/**
 * A single shift may not exceed 16 hours. The legacy spreadsheet contains rows
 * such as 15:00-09:00 and 08:00-10:00+1 that only parse as valid windows if
 * arbitrarily long shifts are allowed; those are data errors, not real shifts.
 */
export const MAX_SHIFT_MINUTES = 16 * 60;
export const MIN_SHIFT_MINUTES = 30;

const REQUIREMENT_KEYS: Record<string, Profession> = {
  doctor: "doctor",
  doctors: "doctor",
  nurse: "nurse",
  nurses: "nurse",
  receptionist: "receptionist",
  receptionists: "receptionist",
};

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export function emptyRequirements(): RoleRequirements {
  return { doctor: 0, nurse: 0, receptionist: 0 };
}

/**
 * Parses the structured form used by most CSV rows: `nurses=3;doctors=1`.
 * Missing professions default to 0. Returns null when nothing parses.
 */
export function parseStructuredRequirements(raw: string): RoleRequirements | null {
  const trimmed = raw.trim();
  if (!trimmed || !trimmed.includes("=")) {
    return null;
  }

  const result = emptyRequirements();
  let matched = false;

  for (const part of trimmed.split(";")) {
    const [rawKey, rawValue] = part.split("=");
    if (rawKey === undefined || rawValue === undefined) {
      continue;
    }

    const profession = REQUIREMENT_KEYS[rawKey.trim().toLowerCase()];
    const value = Number(rawValue.trim());

    if (!profession || !Number.isInteger(value) || value < 0) {
      continue;
    }

    result[profession] = value;
    matched = true;
  }

  return matched ? result : null;
}

/**
 * Best-effort parse of free text such as "two nurses and a doctor".
 * Used by the importer so these rows are repaired rather than dropped.
 */
export function parseFreeTextRequirements(raw: string): RoleRequirements | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const result = emptyRequirements();
  const tokens = normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let matched = false;

  tokens.forEach((token, index) => {
    const profession = REQUIREMENT_KEYS[token];
    if (!profession) {
      return;
    }

    const previous = tokens[index - 1] ?? "";
    const numeric = Number(previous);
    const count = Number.isInteger(numeric) && numeric > 0 ? numeric : WORD_NUMBERS[previous];

    result[profession] += count ?? 1;
    matched = true;
  });

  return matched ? result : null;
}

export function parseRequirements(raw: string): RoleRequirements | null {
  return parseStructuredRequirements(raw) ?? parseFreeTextRequirements(raw);
}

export function totalRequired(requirements: RoleRequirements): number {
  return PROFESSIONS.reduce((sum, profession) => sum + requirements[profession], 0);
}

export function hasAnyRequirement(requirements: RoleRequirements): boolean {
  return totalRequired(requirements) > 0;
}

export interface DurationValidation {
  valid: boolean;
  minutes: number;
  reason?: string;
}

export function validateShiftDuration(startAt: Date, endAt: Date): DurationValidation {
  const minutes = minutesBetween(startAt, endAt);

  if (minutes <= 0) {
    return { valid: false, minutes, reason: "Shift end must be after its start" };
  }

  if (minutes < MIN_SHIFT_MINUTES) {
    return {
      valid: false,
      minutes,
      reason: `Shift must be at least ${MIN_SHIFT_MINUTES} minutes long`,
    };
  }

  if (minutes > MAX_SHIFT_MINUTES) {
    return {
      valid: false,
      minutes,
      reason: `Shift may not exceed ${MAX_SHIFT_MINUTES / 60} hours`,
    };
  }

  return { valid: true, minutes };
}

export function missingRoles(
  requirements: RoleRequirements,
  filled: FilledCounts,
): RoleRequirements {
  return {
    doctor: Math.max(0, requirements.doctor - filled.doctor),
    nurse: Math.max(0, requirements.nurse - filled.nurse),
    receptionist: Math.max(0, requirements.receptionist - filled.receptionist),
  };
}

export function staffingStatus(
  requirements: RoleRequirements,
  filled: FilledCounts,
): StaffingStatus {
  const required = totalRequired(requirements);
  const claimed = PROFESSIONS.reduce(
    (sum, profession) => sum + Math.min(filled[profession], requirements[profession]),
    0,
  );

  if (claimed === 0) {
    return "empty";
  }

  return claimed >= required ? "fully_staffed" : "partially_staffed";
}

export function hasCapacityFor(
  profession: Profession,
  requirements: RoleRequirements,
  filled: FilledCounts,
): boolean {
  return filled[profession] < requirements[profession];
}
