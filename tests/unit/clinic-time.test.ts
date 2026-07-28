import { describe, expect, it } from "vitest";

import {
  buildShiftWindow,
  intervalsOverlap,
  parseClinicDate,
  parseClinicTime,
} from "@/lib/time/clinic";

describe("parseClinicDate", () => {
  it("accepts ISO dates", () => {
    expect(parseClinicDate("2026-08-28")).toBe("2026-08-28");
  });

  it("parses slash dates as dd/MM/yyyy", () => {
    expect(parseClinicDate("29/08/2026")).toBe("2026-08-29");
  });

  it("parses dash dates as MM-dd-yyyy", () => {
    expect(parseClinicDate("08-13-2026")).toBe("2026-08-13");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseClinicDate("2026-02-30")).toBeNull();
  });
});

describe("parseClinicTime", () => {
  it("accepts HH:mm", () => {
    expect(parseClinicTime("09:00")).toBe("09:00");
  });

  it("accepts +1 overnight notation", () => {
    expect(parseClinicTime("10:00+1")).toBe("10:00+1");
  });

  it("rejects impossible times", () => {
    expect(parseClinicTime("25:00")).toBeNull();
  });
});

describe("buildShiftWindow", () => {
  it("rolls end time to next day for overnight shifts", () => {
    const window = buildShiftWindow("2026-08-28", "22:00", "06:00");
    expect(window.endAt.getTime()).toBeGreaterThan(window.startAt.getTime());
  });

  it("handles midnight end times", () => {
    const window = buildShiftWindow("2026-08-23", "16:00", "00:00");
    expect(window.endAt.getDate()).toBe(24);
  });
});

describe("intervalsOverlap", () => {
  it("detects overlapping intervals", () => {
    const a = buildShiftWindow("2026-08-28", "09:00", "17:00");
    const b = buildShiftWindow("2026-08-28", "16:00", "22:00");
    expect(intervalsOverlap(a, b)).toBe(true);
  });

  it("treats back-to-back intervals as non-overlapping", () => {
    const a = buildShiftWindow("2026-08-28", "09:00", "17:00");
    const b = buildShiftWindow("2026-08-28", "17:00", "22:00");
    expect(intervalsOverlap(a, b)).toBe(false);
  });
});
