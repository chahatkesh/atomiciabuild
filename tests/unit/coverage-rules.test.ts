import { describe, expect, it } from "vitest";

import { clinicWeekDates } from "@/lib/time/clinic";
import type { ClaimRecord } from "@/modules/claims/types";
import { buildWeekCoverage, worstStatus } from "@/modules/coverage/coverage.rules";
import { missingRoles, staffingStatus } from "@/modules/shifts/shift.rules";
import type { ShiftRecord } from "@/modules/shifts/types";
import type { Profession, RoleRequirements } from "@/types";

const WEEK = clinicWeekDates("2026-08-03");

function requirements(partial: Partial<RoleRequirements>): RoleRequirements {
  return { doctor: 0, nurse: 0, receptionist: 0, ...partial };
}

/** Builds a shift with `status`/`missing` derived the same way the service does. */
function shift(
  id: string,
  date: string,
  startTime: string,
  endTime: string,
  required: Partial<RoleRequirements>,
  filled: Partial<RoleRequirements> = {},
): ShiftRecord {
  const req = requirements(required);
  const fil = requirements(filled);

  return {
    id,
    date,
    startTime,
    endTime,
    startAt: `${date}T${startTime}:00.000Z`,
    endAt: `${date}T${endTime}:00.000Z`,
    requirements: req,
    filled: fil,
    missing: missingRoles(req, fil),
    status: staffingStatus(req, fil),
    legacyShiftIds: [],
    version: 0,
  };
}

function claim(id: string, shiftId: string, userName: string, profession: Profession): ClaimRecord {
  return {
    id,
    shiftId,
    userId: `user-${id}`,
    userName,
    userEmail: `${userName.toLowerCase().replace(/\s/g, ".")}@clinic.test`,
    profession,
    status: "active",
    source: "self",
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

function build(shifts: ShiftRecord[], claimsByShift: Record<string, ClaimRecord[]> = {}) {
  return buildWeekCoverage({
    dates: WEEK,
    shifts,
    claimsByShift,
    today: "2026-08-05",
    dataRange: { firstDate: "2026-08-03", lastDate: "2026-08-30" },
  });
}

describe("buildWeekCoverage", () => {
  it("always returns seven days, even when nothing is scheduled", () => {
    const week = build([]);

    expect(week.days).toHaveLength(7);
    expect(week.days.map((day) => day.date)).toEqual(WEEK);
    expect(week.weekStart).toBe("2026-08-03");
    expect(week.weekEnd).toBe("2026-08-09");
    expect(week.totals.shifts).toBe(0);
  });

  it("leaves a day with no shifts without a status", () => {
    const week = build([shift("a", "2026-08-03", "09:00", "17:00", { nurse: 1 })]);

    expect(week.days[0].status).toBe("empty");
    expect(week.days[1].status).toBeNull();
    expect(week.days[1].shifts).toEqual([]);
  });

  it("groups shifts onto their start date and orders them by start time", () => {
    const week = build([
      shift("late", "2026-08-04", "16:00", "22:00", { nurse: 1 }),
      shift("early", "2026-08-04", "08:00", "12:00", { nurse: 1 }),
    ]);

    expect(week.days[1].shifts.map((item) => item.id)).toEqual(["early", "late"]);
  });

  it("ignores shifts outside the week", () => {
    const week = build([
      shift("in", "2026-08-09", "09:00", "17:00", { nurse: 1 }),
      shift("out", "2026-08-10", "09:00", "17:00", { nurse: 1 }),
    ]);

    expect(week.totals.shifts).toBe(1);
    expect(week.days[6].shifts.map((item) => item.id)).toEqual(["in"]);
  });

  it("sums missing roles per day and across the week", () => {
    const week = build([
      shift("a", "2026-08-03", "09:00", "17:00", { doctor: 1, nurse: 3 }, { nurse: 1 }),
      shift("b", "2026-08-03", "17:00", "22:00", { nurse: 2 }, { nurse: 2 }),
      shift("c", "2026-08-05", "09:00", "17:00", { receptionist: 1 }),
    ]);

    expect(week.days[0].totals.missing).toEqual({ doctor: 1, nurse: 2, receptionist: 0 });
    expect(week.totals.missing).toEqual({ doctor: 1, nurse: 2, receptionist: 1 });
    expect(week.totals.required).toBe(7);
    expect(week.totals.filled).toBe(3);
  });

  it("counts each staffing status", () => {
    const week = build([
      shift("full", "2026-08-03", "09:00", "17:00", { nurse: 1 }, { nurse: 1 }),
      shift("partial", "2026-08-04", "09:00", "17:00", { nurse: 2 }, { nurse: 1 }),
      shift("empty", "2026-08-05", "09:00", "17:00", { nurse: 2 }),
    ]);

    expect(week.totals.fullyStaffed).toBe(1);
    expect(week.totals.partiallyStaffed).toBe(1);
    expect(week.totals.empty).toBe(1);
  });

  it("attaches the roster to each shift", () => {
    const week = build([shift("a", "2026-08-03", "09:00", "17:00", { nurse: 1 }, { nurse: 1 })], {
      a: [claim("1", "a", "Anya Sharma", "nurse")],
    });

    expect(week.days[0].shifts[0].claims.map((item) => item.userName)).toEqual(["Anya Sharma"]);
  });

  it("gives a shift with no roster an empty claims array", () => {
    const week = build([shift("a", "2026-08-03", "09:00", "17:00", { nurse: 1 })]);
    expect(week.days[0].shifts[0].claims).toEqual([]);
  });

  it("clamps over-filled roles so week coverage cannot exceed what was required", () => {
    const week = build([shift("a", "2026-08-03", "09:00", "17:00", { nurse: 1 }, { nurse: 3 })]);

    expect(week.totals.filled).toBe(1);
    expect(week.totals.required).toBe(1);
  });

  it("passes today and the data range through for the client", () => {
    const week = build([]);

    expect(week.today).toBe("2026-08-05");
    expect(week.dataRange).toEqual({ firstDate: "2026-08-03", lastDate: "2026-08-30" });
  });
});

describe("worstStatus", () => {
  it("returns null for a free day", () => {
    expect(worstStatus([])).toBeNull();
  });

  it("reports empty when any shift is empty", () => {
    expect(worstStatus([{ status: "fully_staffed" }, { status: "empty" }])).toBe("empty");
  });

  it("prefers empty over partially staffed", () => {
    expect(worstStatus([{ status: "partially_staffed" }, { status: "empty" }])).toBe("empty");
  });

  it("reports partially staffed when nothing is empty", () => {
    expect(worstStatus([{ status: "fully_staffed" }, { status: "partially_staffed" }])).toBe(
      "partially_staffed",
    );
  });

  it("reports fully staffed only when every shift is covered", () => {
    expect(worstStatus([{ status: "fully_staffed" }, { status: "fully_staffed" }])).toBe(
      "fully_staffed",
    );
  });
});
