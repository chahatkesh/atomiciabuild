import { describe, expect, it } from "vitest";

import { normalizeShiftRow } from "@/modules/imports";

const base = {
  shift_id: "5096",
  date: "2026-08-28",
  start_time: "09:00",
  end_time: "17:00",
  requirements: "nurses=3;doctors=0;receptionists=0",
};

describe("normalizeShiftRow", () => {
  it("accepts a clean ISO row untouched", () => {
    const result = normalizeShiftRow(base);
    expect(result.verdict).toBe("accepted");
    expect(result.issues).toEqual([]);
    expect(result.value).toMatchObject({
      date: "2026-08-28",
      startTime: "09:00",
      endTime: "17:00",
      requirements: { doctor: 0, nurse: 3, receptionist: 0 },
    });
  });

  describe("date conventions", () => {
    it("reads slash dates as day-first", () => {
      const result = normalizeShiftRow({ ...base, date: "05/08/2026" });
      expect(result.value?.date).toBe("2026-08-05");
      expect(result.issues.join(" ")).toMatch(/Read "05\/08\/2026" as DD\/MM\/YYYY/);
    });

    it("reads dashed dates as month-first", () => {
      const result = normalizeShiftRow({ ...base, date: "08-13-2026" });
      expect(result.value?.date).toBe("2026-08-13");
      expect(result.issues.join(" ")).toMatch(/as MM-DD-YYYY/);
    });

    it("rejects a day that does not exist", () => {
      const result = normalizeShiftRow({ ...base, date: "2026-02-30" });
      expect(result.verdict).toBe("rejected");
      expect(result.issues.join(" ")).toMatch(/Invalid date: "2026-02-30"/);
    });
  });

  describe("times", () => {
    it("rolls an overnight shift into the next day", () => {
      const result = normalizeShiftRow({ ...base, start_time: "22:00", end_time: "06:00" });
      expect(result.verdict).toBe("repaired");
      expect(result.value?.endAt.getTime()).toBeGreaterThan(result.value!.startAt.getTime());
      expect(result.issues.join(" ")).toMatch(/overnight shift/);
    });

    it("treats a midnight end as the following day", () => {
      const result = normalizeShiftRow({ ...base, start_time: "16:00", end_time: "00:00" });
      expect(result.value).toBeDefined();
      const hours =
        (result.value!.endAt.getTime() - result.value!.startAt.getTime()) / (1000 * 60 * 60);
      expect(hours).toBe(8);
    });

    it("understands +1 notation but still applies the duration limit", () => {
      const result = normalizeShiftRow({ ...base, start_time: "08:00", end_time: "10:00+1" });
      expect(result.verdict).toBe("rejected");
      expect(result.issues.join(" ")).toMatch(/next calendar day/);
      expect(result.issues.join(" ")).toMatch(/spans 26h/);
    });

    it("rejects a window that is too long to be one shift", () => {
      const result = normalizeShiftRow({ ...base, start_time: "15:00", end_time: "09:00" });
      expect(result.verdict).toBe("rejected");
      expect(result.issues.join(" ")).toMatch(/spans 18h/);
    });

    it("rejects a zero-length window", () => {
      const result = normalizeShiftRow({ ...base, start_time: "12:00", end_time: "12:00" });
      expect(result.verdict).toBe("rejected");
      expect(result.issues.join(" ")).toMatch(/Zero-length shift/);
    });

    it("rejects a missing start time", () => {
      const result = normalizeShiftRow({ ...base, start_time: "" });
      expect(result.verdict).toBe("rejected");
      expect(result.issues).toContain("Missing start_time");
    });
  });

  describe("requirements", () => {
    it("parses free text", () => {
      const result = normalizeShiftRow({ ...base, requirements: "two nurses and a doctor" });
      expect(result.verdict).toBe("repaired");
      expect(result.value?.requirements).toEqual({ doctor: 1, nurse: 2, receptionist: 0 });
      expect(result.issues.join(" ")).toMatch(/Parsed free-text requirements/);
    });

    it("defaults professions the row does not mention", () => {
      const result = normalizeShiftRow({ ...base, requirements: "nurses=2" });
      expect(result.value?.requirements).toEqual({ doctor: 0, nurse: 2, receptionist: 0 });
      expect(result.issues.join(" ")).toMatch(/defaulted to 0/);
    });

    it("rejects requirements it cannot read", () => {
      const result = normalizeShiftRow({ ...base, requirements: "whoever is around" });
      expect(result.verdict).toBe("rejected");
      expect(result.issues.join(" ")).toMatch(/Unreadable requirements/);
    });

    it("rejects a shift that needs nobody", () => {
      const result = normalizeShiftRow({
        ...base,
        requirements: "nurses=0;doctors=0;receptionists=0",
      });
      expect(result.verdict).toBe("rejected");
      expect(result.issues).toContain("Shift requires nobody");
    });
  });
});
