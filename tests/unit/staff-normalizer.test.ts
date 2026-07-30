import { describe, expect, it } from "vitest";

import { normalizeEmail, normalizeRoleName, normalizeStaffRow } from "@/modules/imports";

describe("normalizeRoleName", () => {
  it.each([
    ["Doctor", "doctor"],
    ["DOCTOR ", "doctor"],
    ["MD", "doctor"],
    ["Physician", "doctor"],
    ["NURSE", "nurse"],
    ["RN", "nurse"],
    ["Registered Nurse", "nurse"],
    [" Nurse ", "nurse"],
    ["receptionist", "receptionist"],
    ["Reception", "receptionist"],
    ["recep.", "receptionist"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizeRoleName(input)).toBe(expected);
  });

  it("refuses to guess at a role it does not know", () => {
    expect(normalizeRoleName("Janitor")).toBeNull();
    expect(normalizeRoleName("")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("repairs the obfuscated addresses in the export", () => {
    expect(normalizeEmail("priya.weber(at)clinicmail.test")).toBe("priya.weber@clinicmail.test");
    expect(normalizeEmail("fatima.petrova(at)clinicmail.test")).toBe(
      "fatima.petrova@clinicmail.test",
    );
  });

  it("lowercases and trims", () => {
    expect(normalizeEmail("  Hiro.Iyer@ClinicMail.test ")).toBe("hiro.iyer@clinicmail.test");
  });
});

describe("normalizeStaffRow", () => {
  const base = {
    staff_id: "121",
    full_name: "Marcus Whitfield",
    role: "Doctor",
    email: "marcus.whitfield@clinicmail.test",
  };

  it("accepts a clean row without flagging it", () => {
    const result = normalizeStaffRow(base);
    expect(result.verdict).toBe("accepted");
    expect(result.issues).toEqual([]);
    expect(result.value).toMatchObject({ profession: "doctor", fullName: "Marcus Whitfield" });
  });

  it("marks a row repaired and says what changed", () => {
    const result = normalizeStaffRow({
      ...base,
      staff_id: "133",
      full_name: "  Karan ALI",
      role: "Reception",
    });

    expect(result.verdict).toBe("repaired");
    expect(result.value).toMatchObject({ fullName: "Karan ALI", profession: "receptionist" });
    expect(result.issues.join(" ")).toMatch(/Trimmed whitespace/);
    expect(result.issues.join(" ")).toMatch(/Mapped role/);
  });

  it("rejects an unknown role rather than guessing", () => {
    const result = normalizeStaffRow({ ...base, role: "Janitor" });
    expect(result.verdict).toBe("rejected");
    expect(result.issues.join(" ")).toMatch(/Unknown role: "Janitor"/);
    expect(result.value).toBeUndefined();
  });

  it("rejects a row with no name", () => {
    const result = normalizeStaffRow({ ...base, full_name: "" });
    expect(result.verdict).toBe("rejected");
    expect(result.issues).toContain("Missing full_name");
  });

  it("rejects a row with no email, since email is the identity key", () => {
    const result = normalizeStaffRow({ ...base, email: "" });
    expect(result.verdict).toBe("rejected");
    expect(result.issues).toContain("Missing email");
  });

  it("rejects an address that is still malformed after repair", () => {
    const result = normalizeStaffRow({ ...base, email: "not-an-email" });
    expect(result.verdict).toBe("rejected");
    expect(result.issues.join(" ")).toMatch(/Invalid email/);
  });
});
