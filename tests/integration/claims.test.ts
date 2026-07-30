import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";

import { AppError } from "@/lib/errors/AppError";
import { claimShift, listMyShifts, releaseClaim } from "@/modules/claims/claim.service";
import { ClaimModel } from "@/modules/claims/claim.model";
import { createShift, deleteShift, updateShift } from "@/modules/shifts/shift.service";
import { ShiftModel } from "@/modules/shifts/shift.model";
import { UserModel } from "@/modules/users/user.model";
import type { Profession } from "@/types";

import { clearTestDb, connectTestDb, disconnectTestDb, hasIntegrationDb } from "./db";

async function makeStaff(name: string, profession: Profession): Promise<string> {
  const user = await UserModel.create({
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@test.local`,
    fullName: name,
    role: "staff",
    profession,
    passwordHash: "not-used-in-these-tests",
  });

  return user._id.toString();
}

async function filledNurses(shiftId: string): Promise<number> {
  const shift = await ShiftModel.findById(shiftId).lean<{ filled: { nurse: number } } | null>();
  return shift?.filled.nurse ?? -1;
}

describe.skipIf(!hasIntegrationDb)("claiming (integration)", () => {
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

  it("gives a single-slot shift to exactly one of eight simultaneous claimants", async () => {
    const shift = await createShift({
      date: "2026-09-01",
      startTime: "09:00",
      endTime: "17:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });

    const nurses = await Promise.all(
      Array.from({ length: 8 }, (_, index) => makeStaff(`Nurse ${index}`, "nurse")),
    );

    const results = await Promise.allSettled(
      nurses.map((userId) =>
        claimShift({ shiftId: shift.id, userId, actingUserId: userId, source: "self" }),
      ),
    );

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(7);

    // Losers must be told why, not handed a generic 500.
    for (const result of rejected) {
      const reason = (result as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(AppError);
      expect((reason as AppError).status).toBe(409);
    }

    expect(await filledNurses(shift.id)).toBe(1);
    expect(await ClaimModel.countDocuments({ shiftId: shift.id, status: "active" })).toBe(1);
  });

  it("never overfills a three-slot shift under twelve simultaneous claims", async () => {
    const shift = await createShift({
      date: "2026-09-02",
      startTime: "09:00",
      endTime: "17:00",
      requirements: { doctor: 0, nurse: 3, receptionist: 0 },
    });

    const nurses = await Promise.all(
      Array.from({ length: 12 }, (_, index) => makeStaff(`Bulk Nurse ${index}`, "nurse")),
    );

    const results = await Promise.allSettled(
      nurses.map((userId) =>
        claimShift({ shiftId: shift.id, userId, actingUserId: userId, source: "self" }),
      ),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
    expect(await filledNurses(shift.id)).toBe(3);
  });

  it("rejects a second claim that overlaps one the person already holds", async () => {
    const morning = await createShift({
      date: "2026-09-03",
      startTime: "08:00",
      endTime: "16:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });
    const overlapping = await createShift({
      date: "2026-09-03",
      startTime: "14:00",
      endTime: "22:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });

    const nurse = await makeStaff("Overlap Nurse", "nurse");

    await claimShift({
      shiftId: morning.id,
      userId: nurse,
      actingUserId: nurse,
      source: "self",
    });

    await expect(
      claimShift({
        shiftId: overlapping.id,
        userId: nurse,
        actingUserId: nurse,
        source: "self",
      }),
    ).rejects.toThrow(/overlaps this shift/);

    expect(await filledNurses(overlapping.id)).toBe(0);
  });

  it("blocks overlapping claims even when both are submitted at once", async () => {
    const first = await createShift({
      date: "2026-09-04",
      startTime: "08:00",
      endTime: "16:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });
    const second = await createShift({
      date: "2026-09-04",
      startTime: "12:00",
      endTime: "20:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });

    const nurse = await makeStaff("Racing Nurse", "nurse");

    const results = await Promise.allSettled([
      claimShift({ shiftId: first.id, userId: nurse, actingUserId: nurse, source: "self" }),
      claimShift({ shiftId: second.id, userId: nurse, actingUserId: nurse, source: "self" }),
    ]);

    // Snapshot isolation alone would let both through; the per-user write
    // conflict is what forces one to lose.
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await ClaimModel.countDocuments({ userId: nurse, status: "active" })).toBe(1);
  });

  it("allows a back-to-back shift that only touches at the boundary", async () => {
    const early = await createShift({
      date: "2026-09-05",
      startTime: "08:00",
      endTime: "16:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });
    const late = await createShift({
      date: "2026-09-05",
      startTime: "16:00",
      endTime: "22:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });

    const nurse = await makeStaff("Double Shift Nurse", "nurse");

    await claimShift({ shiftId: early.id, userId: nurse, actingUserId: nurse, source: "self" });
    await claimShift({ shiftId: late.id, userId: nurse, actingUserId: nurse, source: "self" });

    expect(await ClaimModel.countDocuments({ userId: nurse, status: "active" })).toBe(2);
  });

  it("refuses a profession the shift does not ask for", async () => {
    const shift = await createShift({
      date: "2026-09-06",
      startTime: "09:00",
      endTime: "17:00",
      requirements: { doctor: 0, nurse: 2, receptionist: 0 },
    });

    const doctor = await makeStaff("Spare Doctor", "doctor");

    await expect(
      claimShift({ shiftId: shift.id, userId: doctor, actingUserId: doctor, source: "self" }),
    ).rejects.toThrow(/does not need any doctors/);
  });

  it("frees the slot again when a claim is released", async () => {
    const shift = await createShift({
      date: "2026-09-07",
      startTime: "09:00",
      endTime: "17:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });

    const first = await makeStaff("Leaver", "nurse");
    const second = await makeStaff("Replacement", "nurse");

    await claimShift({ shiftId: shift.id, userId: first, actingUserId: first, source: "self" });
    await expect(
      claimShift({ shiftId: shift.id, userId: second, actingUserId: second, source: "self" }),
    ).rejects.toThrow(/already has enough nurses/);

    await releaseClaim({ shiftId: shift.id, userId: first });
    expect(await filledNurses(shift.id)).toBe(0);

    await claimShift({ shiftId: shift.id, userId: second, actingUserId: second, source: "self" });
    expect(await filledNurses(shift.id)).toBe(1);
  });

  it("lets someone re-claim a shift they previously left", async () => {
    const shift = await createShift({
      date: "2026-09-08",
      startTime: "09:00",
      endTime: "17:00",
      requirements: { doctor: 0, nurse: 1, receptionist: 0 },
    });

    const nurse = await makeStaff("Returning Nurse", "nurse");

    await claimShift({ shiftId: shift.id, userId: nurse, actingUserId: nurse, source: "self" });
    await releaseClaim({ shiftId: shift.id, userId: nurse });
    await claimShift({ shiftId: shift.id, userId: nurse, actingUserId: nurse, source: "self" });

    expect(await filledNurses(shift.id)).toBe(1);
    expect(await ClaimModel.countDocuments({ shiftId: shift.id, status: "active" })).toBe(1);
  });

  describe("manager edits an already-claimed shift", () => {
    it("drops the newest claim when the requirement shrinks, keeping seniority", async () => {
      const shift = await createShift({
        date: "2026-09-10",
        startTime: "09:00",
        endTime: "17:00",
        requirements: { doctor: 0, nurse: 2, receptionist: 0 },
      });

      const senior = await makeStaff("Senior Nurse", "nurse");
      const junior = await makeStaff("Junior Nurse", "nurse");

      await claimShift({ shiftId: shift.id, userId: senior, actingUserId: senior, source: "self" });
      await claimShift({ shiftId: shift.id, userId: junior, actingUserId: junior, source: "self" });

      const { releasedClaims } = await updateShift(shift.id, {
        requirements: { doctor: 0, nurse: 1, receptionist: 0 },
      });

      expect(releasedClaims).toHaveLength(1);
      expect(releasedClaims[0].userName).toBe("Junior Nurse");
      expect(releasedClaims[0].reason).toMatch(/now needs only 1 nurses/);

      expect(await filledNurses(shift.id)).toBe(1);
      const survivors = await ClaimModel.find({ shiftId: shift.id, status: "active" }).lean<
        { userId: Types.ObjectId }[]
      >();
      expect(survivors.map((claim) => claim.userId.toString())).toEqual([senior]);
    });

    it("releases a claim when the new time overlaps another shift the person holds", async () => {
      const moving = await createShift({
        date: "2026-09-11",
        startTime: "08:00",
        endTime: "12:00",
        requirements: { doctor: 0, nurse: 1, receptionist: 0 },
      });
      const fixed = await createShift({
        date: "2026-09-11",
        startTime: "14:00",
        endTime: "20:00",
        requirements: { doctor: 0, nurse: 1, receptionist: 0 },
      });

      const nurse = await makeStaff("Busy Nurse", "nurse");
      await claimShift({ shiftId: moving.id, userId: nurse, actingUserId: nurse, source: "self" });
      await claimShift({ shiftId: fixed.id, userId: nurse, actingUserId: nurse, source: "self" });

      // Push the first shift on top of the second.
      const { releasedClaims } = await updateShift(moving.id, {
        startTime: "13:00",
        endTime: "18:00",
      });

      expect(releasedClaims).toHaveLength(1);
      expect(releasedClaims[0].reason).toMatch(/overlaps/);
      expect(await filledNurses(moving.id)).toBe(0);

      const remaining = await listMyShifts(nurse);
      expect(remaining.map((entry) => entry.shiftId)).toEqual([fixed.id]);
    });

    it("keeps every claim when the edit does not invalidate anything", async () => {
      const shift = await createShift({
        date: "2026-09-12",
        startTime: "09:00",
        endTime: "17:00",
        requirements: { doctor: 0, nurse: 2, receptionist: 0 },
      });

      const one = await makeStaff("Steady One", "nurse");
      const two = await makeStaff("Steady Two", "nurse");
      await claimShift({ shiftId: shift.id, userId: one, actingUserId: one, source: "self" });
      await claimShift({ shiftId: shift.id, userId: two, actingUserId: two, source: "self" });

      const { releasedClaims } = await updateShift(shift.id, {
        requirements: { doctor: 1, nurse: 2, receptionist: 0 },
      });

      expect(releasedClaims).toHaveLength(0);
      expect(await filledNurses(shift.id)).toBe(2);
    });

    it("clears claims when the shift is deleted", async () => {
      const shift = await createShift({
        date: "2026-09-13",
        startTime: "09:00",
        endTime: "17:00",
        requirements: { doctor: 0, nurse: 1, receptionist: 0 },
      });

      const nurse = await makeStaff("Stranded Nurse", "nurse");
      await claimShift({ shiftId: shift.id, userId: nurse, actingUserId: nurse, source: "self" });

      const { releasedClaims } = await deleteShift(shift.id);

      expect(releasedClaims).toBe(1);
      expect(await ClaimModel.countDocuments({ userId: nurse, status: "active" })).toBe(0);
      expect(await listMyShifts(nurse)).toHaveLength(0);
    });
  });
});
