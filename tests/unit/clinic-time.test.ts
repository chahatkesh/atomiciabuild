import { describe, expect, it } from "vitest";

import {
  buildShiftWindow,
  clinicWeekDates,
  intervalsOverlap,
  parseClinicDate,
  parseClinicTime,
  startOfClinicWeek,
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

describe("startOfClinicWeek", () => {
  // 2026-08-03 is a Monday; the imported roster starts there.
  it("returns the same date when given a Monday", () => {
    expect(startOfClinicWeek("2026-08-03")).toBe("2026-08-03");
  });

  it("walks back to Monday from mid-week", () => {
    expect(startOfClinicWeek("2026-08-06")).toBe("2026-08-03");
  });

  it("treats Sunday as the end of the week, not the start", () => {
    expect(startOfClinicWeek("2026-08-09")).toBe("2026-08-03");
  });

  it("crosses a month boundary", () => {
    expect(startOfClinicWeek("2026-08-02")).toBe("2026-07-27");
  });

  it("crosses a year boundary", () => {
    expect(startOfClinicWeek("2027-01-01")).toBe("2026-12-28");
  });

  it("rejects malformed input", () => {
    expect(() => startOfClinicWeek("03/08/2026")).toThrow();
  });
});

describe("clinicWeekDates", () => {
  it("returns seven consecutive dates starting at the given day", () => {
    expect(clinicWeekDates("2026-08-03")).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });

  it("spans a month boundary without gaps", () => {
    const dates = clinicWeekDates("2026-08-31");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-08-31");
    expect(dates[6]).toBe("2026-09-06");
  });
});
