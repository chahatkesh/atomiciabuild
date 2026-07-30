import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { verifyPassword } from "@/modules/auth/password";
import { getImportRun, runImport, IMPORTED_STAFF_PASSWORD } from "@/modules/imports";
import { ShiftModel } from "@/modules/shifts/shift.model";
import { UserModel } from "@/modules/users/user.model";

import { clearTestDb, connectTestDb, disconnectTestDb, hasIntegrationDb } from "./db";

const STAFF_CSV = [
  "staff_id,full_name,role,email",
  "121,Marcus Whitfield,Doctor,marcus.whitfield@clinicmail.test",
  "103,Marcus Kapoor,receptionist,marcus.kapoor@clinicmail.test",
  "103,Marcus Kapoor,receptionist,marcus.kapoor@clinicmail.test",
  "122,Priya Weber,Doctor,priya.weber(at)clinicmail.test",
  "997,Casey Morgan,Janitor,casey.morgan@clinicmail.test",
  "107,Hiro Iyer,Receptionist,hiro.iyer@clinicmail.test",
  "998,J. Placeholder,Nurse,hiro.iyer@clinicmail.test",
].join("\n");

const SHIFTS_CSV = [
  "shift_id,date,start_time,end_time,requirements",
  "5098,2026-08-28,14:00,22:00,nurses=1;doctors=1;receptionists=1",
  "5099,2026-08-28,14:00,22:00,nurses=3;doctors=1;receptionists=0",
  "5110,2026-02-30,08:00,16:00,nurses=1",
  "5113,2026-08-18,08:00,16:00,two nurses and a doctor",
  "5010,05/08/2026,09:00,17:00,nurses=1;doctors=0;receptionists=1",
].join("\n");

async function importFixtures() {
  return runImport({
    source: "seed",
    files: [
      { fileName: "staff.csv", content: STAFF_CSV, kind: "staff" },
      { fileName: "shifts.csv", content: SHIFTS_CSV, kind: "shifts" },
    ],
  });
}

describe.skipIf(!hasIntegrationDb)("CSV import (integration)", () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  it("merges rows sharing a time window by taking the higher count per profession", async () => {
    await importFixtures();

    const shift = await ShiftModel.findOne({ date: "2026-08-28" }).lean<{
      requirements: { doctor: number; nurse: number; receptionist: number };
      legacyShiftIds: string[];
    } | null>();

    expect(shift?.requirements).toEqual({ doctor: 1, nurse: 3, receptionist: 1 });
    expect(shift?.legacyShiftIds.sort()).toEqual(["5098", "5099"]);
  });

  it("keeps one record per person and rejects a shared email held by someone else", async () => {
    const result = await importFixtures();
    const staff = result.sections.find((section) => section.kind === "staff");

    expect(staff?.counts).toMatchObject({
      total: 7,
      accepted: 3,
      repaired: 1,
      merged: 1,
      rejected: 2,
    });

    const kapoor = await UserModel.countDocuments({ email: "marcus.kapoor@clinicmail.test" });
    expect(kapoor).toBe(1);

    const placeholder = await UserModel.findOne({ email: "hiro.iyer@clinicmail.test" }).lean<{
      fullName: string;
    } | null>();
    expect(placeholder?.fullName).toBe("Hiro Iyer");
  });

  it("gives imported staff a working password", async () => {
    await importFixtures();

    const user = await UserModel.findOne({ email: "priya.weber@clinicmail.test" }).lean<{
      passwordHash: string;
      role: string;
      profession: string;
    } | null>();

    expect(user?.role).toBe("staff");
    expect(user?.profession).toBe("doctor");
    expect(await verifyPassword(IMPORTED_STAFF_PASSWORD, user!.passwordHash)).toBe(true);
  });

  it("records every rejected row with a reason a manager can act on", async () => {
    const result = await importFixtures();
    const run = await getImportRun(result.id);

    const rejected = run!.sections.flatMap((section) =>
      section.rows.filter((row) => row.verdict === "rejected"),
    );

    expect(rejected).toHaveLength(3);
    const reasons = rejected.flatMap((row) => row.issues).join(" | ");
    expect(reasons).toMatch(/Unknown role: "Janitor"/);
    expect(reasons).toMatch(/already belongs to "Hiro Iyer"/);
    expect(reasons).toMatch(/Invalid date: "2026-02-30"/);

    for (const row of rejected) {
      expect(row.action).not.toHaveLength(0);
      expect(row.raw).toBeTruthy();
    }
  });

  it("is safe to run twice", async () => {
    await importFixtures();
    const usersAfterFirst = await UserModel.countDocuments();
    const shiftsAfterFirst = await ShiftModel.countDocuments();

    await importFixtures();

    expect(await UserModel.countDocuments()).toBe(usersAfterFirst);
    expect(await ShiftModel.countDocuments()).toBe(shiftsAfterFirst);
  });

  it("never lowers requirements on a re-import, so live claims stay valid", async () => {
    await importFixtures();

    await runImport({
      source: "upload",
      files: [
        {
          fileName: "lowered.csv",
          kind: "shifts",
          content: [
            "shift_id,date,start_time,end_time,requirements",
            "5098,2026-08-28,14:00,22:00,nurses=1;doctors=0;receptionists=0",
          ].join("\n"),
        },
      ],
    });

    const shift = await ShiftModel.findOne({ date: "2026-08-28" }).lean<{
      requirements: { doctor: number; nurse: number; receptionist: number };
    } | null>();

    expect(shift?.requirements).toEqual({ doctor: 1, nurse: 3, receptionist: 1 });
  });
});
