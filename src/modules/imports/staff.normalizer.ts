import type { NormalizedStaff, RawRow, RowOutcome } from "@/modules/imports/import.types";
import type { Profession } from "@/types";

export const STAFF_HEADERS = ["staff_id", "full_name", "role", "email"] as const;

/**
 * Every spelling of a profession that appears in the legacy export, plus the
 * obvious near-misses. Anything outside this map is rejected rather than
 * guessed at — silently filing a "Janitor" as a receptionist would be worse
 * than telling the manager the row needs a human.
 */
const ROLE_ALIASES: Record<string, Profession> = {
  doctor: "doctor",
  doctors: "doctor",
  dr: "doctor",
  md: "doctor",
  physician: "doctor",
  nurse: "nurse",
  nurses: "nurse",
  rn: "nurse",
  "registered nurse": "nurse",
  receptionist: "receptionist",
  receptionists: "receptionist",
  reception: "receptionist",
  recep: "receptionist",
  "front desk": "receptionist",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeRoleName(raw: string): Profession | null {
  const cleaned = collapseWhitespace(raw)
    .toLowerCase()
    .replace(/\.+$/, "")
    .replace(/[^a-z\s]/g, "");

  return ROLE_ALIASES[cleaned] ?? null;
}

/**
 * Repairs the obfuscated addresses in the export (`name(at)domain`). Only the
 * patterns actually seen are handled; anything still malformed is rejected.
 */
export function normalizeEmail(raw: string): string {
  return collapseWhitespace(raw)
    .toLowerCase()
    .replace(/\((at|@)\)/g, "@")
    .replace(/\s+at\s+/g, "@")
    .replace(/\[at\]/g, "@");
}

export function normalizeStaffRow(raw: RawRow): RowOutcome<NormalizedStaff> {
  const issues: string[] = [];

  const legacyStaffId = (raw.staff_id ?? "").trim();
  const rawName = raw.full_name ?? "";
  const rawRole = raw.role ?? "";
  const rawEmail = raw.email ?? "";

  const fullName = collapseWhitespace(rawName);
  if (!fullName) {
    return {
      verdict: "rejected",
      issues: ["Missing full_name"],
      action: "Rejected: a staff record needs a name",
    };
  }
  if (fullName !== rawName) {
    issues.push(`Trimmed whitespace in name ("${rawName}" → "${fullName}")`);
  }

  const email = normalizeEmail(rawEmail);
  if (!email) {
    return {
      verdict: "rejected",
      issues: ["Missing email"],
      action: "Rejected: email is the identity key for staff, so it cannot be blank",
    };
  }
  if (email !== rawEmail.trim().toLowerCase()) {
    issues.push(`Repaired email ("${rawEmail.trim()}" → "${email}")`);
  }
  if (!EMAIL_PATTERN.test(email)) {
    return {
      verdict: "rejected",
      issues: [...issues, `Invalid email: "${rawEmail.trim()}"`],
      action: "Rejected: email is not a usable address",
    };
  }

  const profession = normalizeRoleName(rawRole);
  if (!profession) {
    return {
      verdict: "rejected",
      issues: [...issues, `Unknown role: "${rawRole.trim()}"`],
      action: "Rejected: role does not map to doctor, nurse, or receptionist",
    };
  }
  if (collapseWhitespace(rawRole).toLowerCase() !== profession) {
    issues.push(`Mapped role "${rawRole.trim()}" → ${profession}`);
  }

  return {
    verdict: issues.length > 0 ? "repaired" : "accepted",
    issues,
    action:
      issues.length > 0 ? `Imported as ${profession} after repair` : `Imported as ${profession}`,
    value: { legacyStaffId, fullName, profession, email },
  };
}
