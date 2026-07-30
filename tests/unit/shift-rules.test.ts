import { describe, expect, it } from "vitest";

import {
  MAX_SHIFT_MINUTES,
  emptyRequirements,
  hasCapacityFor,
  missingRoles,
  parseFreeTextRequirements,
  parseRequirements,
  parseStructuredRequirements,
  staffingStatus,
  totalRequired,
  validateShiftDuration,
} from "@/modules/shifts/shift.rules";
import { buildShiftWindow } from "@/lib/time/clinic";

describe("parseStructuredRequirements", () => {
  it("parses the standard CSV form", () => {
    expect(parseStructuredRequirements("nurses=3;doctors=1;receptionists=1")).toEqual({
      doctor: 1,
      nurse: 3,
      receptionist: 1,
    });
  });

  it("defaults omitted professions to zero", () => {
    expect(parseStructuredRequirements("nurses=2")).toEqual({
      doctor: 0,
      nurse: 2,
      receptionist: 0,
    });
  });

  it("returns null for free text", () => {
    expect(parseStructuredRequirements("two nurses and a doctor")).toBeNull();
  });
});

describe("parseFreeTextRequirements", () => {
  it("parses word numbers from the dirty CSV row", () => {
    expect(parseFreeTextRequirements("two nurses and a doctor")).toEqual({
      doctor: 1,
      nurse: 2,
      receptionist: 0,
    });
  });

  it("returns null when no profession is mentioned", () => {
    expect(parseFreeTextRequirements("staff as needed")).toBeNull();
  });
});

describe("parseRequirements", () => {
  it("prefers the structured form and falls back to free text", () => {
    expect(parseRequirements("doctors=2")).toEqual({ doctor: 2, nurse: 0, receptionist: 0 });
    expect(parseRequirements("three receptionists")).toEqual({
      doctor: 0,
      nurse: 0,
      receptionist: 3,
    });
  });
});

describe("validateShiftDuration", () => {
  it("accepts a standard day shift", () => {
    const window = buildShiftWindow("2026-08-28", "09:00", "17:00");
    expect(validateShiftDuration(window.startAt, window.endAt).valid).toBe(true);
  });

  it("accepts an overnight shift", () => {
    const window = buildShiftWindow("2026-08-28", "22:00", "06:00");
    expect(validateShiftDuration(window.startAt, window.endAt).valid).toBe(true);
  });

  it("rejects a 24 hour zero-length window", () => {
    const window = buildShiftWindow("2026-08-15", "12:00", "12:00");
    const result = validateShiftDuration(window.startAt, window.endAt);
    expect(result.valid).toBe(false);
    expect(result.minutes).toBeGreaterThan(MAX_SHIFT_MINUTES);
  });

  it("rejects an 18 hour window", () => {
    const window = buildShiftWindow("2026-08-12", "15:00", "09:00");
    expect(validateShiftDuration(window.startAt, window.endAt).valid).toBe(false);
  });
});

describe("staffing calculations", () => {
  const requirements = { doctor: 1, nurse: 2, receptionist: 1 };

  it("reports empty when nobody has claimed", () => {
    expect(staffingStatus(requirements, emptyRequirements())).toBe("empty");
  });

  it("reports partially staffed", () => {
    expect(staffingStatus(requirements, { doctor: 1, nurse: 1, receptionist: 0 })).toBe(
      "partially_staffed",
    );
  });

  it("reports fully staffed", () => {
    expect(staffingStatus(requirements, { doctor: 1, nurse: 2, receptionist: 1 })).toBe(
      "fully_staffed",
    );
  });

  it("computes missing roles", () => {
    expect(missingRoles(requirements, { doctor: 1, nurse: 1, receptionist: 0 })).toEqual({
      doctor: 0,
      nurse: 1,
      receptionist: 1,
    });
  });

  it("counts total required", () => {
    expect(totalRequired(requirements)).toBe(4);
  });

  it("gates capacity per profession", () => {
    const filled = { doctor: 1, nurse: 1, receptionist: 0 };
    expect(hasCapacityFor("doctor", requirements, filled)).toBe(false);
    expect(hasCapacityFor("nurse", requirements, filled)).toBe(true);
  });
});
