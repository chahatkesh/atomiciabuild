import { describe, expect, it } from "vitest";

import { crossesMidnight, formatShiftWindow } from "@/lib/time/format";

describe("crossesMidnight", () => {
  it("is false for an ordinary day shift", () => {
    expect(crossesMidnight({ startTime: "09:00", endTime: "17:00" })).toBe(false);
  });

  it("is false for an evening shift that still ends before midnight", () => {
    expect(crossesMidnight({ startTime: "14:00", endTime: "22:00" })).toBe(false);
  });

  it("is true when the end time is earlier than the start time", () => {
    expect(crossesMidnight({ startTime: "22:00", endTime: "06:00" })).toBe(true);
  });

  it("is true for a shift ending exactly at midnight", () => {
    expect(crossesMidnight({ startTime: "16:00", endTime: "00:00" })).toBe(true);
  });

  it("is true when the end carries the +1 marker", () => {
    expect(crossesMidnight({ startTime: "20:00", endTime: "02:00+1" })).toBe(true);
  });

  it("is false when both ends carry +1, since neither is later than the other", () => {
    expect(crossesMidnight({ startTime: "01:00+1", endTime: "09:00+1" })).toBe(false);
  });
});

describe("formatShiftWindow", () => {
  it("renders a plain window without a suffix", () => {
    expect(formatShiftWindow({ startTime: "09:00", endTime: "17:00" })).toBe("09:00 – 17:00");
  });

  it("marks an overnight window once, at the end", () => {
    expect(formatShiftWindow({ startTime: "22:00", endTime: "06:00" })).toBe("22:00 – 06:00 (+1)");
  });

  it("strips the stored +1 marker rather than showing it inline", () => {
    expect(formatShiftWindow({ startTime: "20:00", endTime: "02:00+1" })).toBe(
      "20:00 – 02:00 (+1)",
    );
  });

  it("accepts a tighter separator for narrow layouts", () => {
    expect(formatShiftWindow({ startTime: "09:00", endTime: "17:00" }, "–")).toBe("09:00–17:00");
  });

  /*
   * The formatter must not consult startAt/endAt: those are instants, and a
   * viewer outside the clinic timezone would see a false "(+1)". This is the
   * exact case that regressed — 14:00–22:00 in Toronto, viewed from UTC+5:30.
   */
  it("does not depend on the viewer's timezone", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "Asia/Kolkata";
      expect(formatShiftWindow({ startTime: "14:00", endTime: "22:00" })).toBe("14:00 – 22:00");
      process.env.TZ = "America/Toronto";
      expect(formatShiftWindow({ startTime: "14:00", endTime: "22:00" })).toBe("14:00 – 22:00");
    } finally {
      process.env.TZ = original;
    }
  });
});
