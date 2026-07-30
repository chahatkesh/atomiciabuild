import mongoose, { Types } from "mongoose";

import { connectDb } from "@/lib/db/connect";
import { withTransaction } from "@/lib/db/withTransaction";
import { AppError } from "@/lib/errors/AppError";
import { ClaimModel, type ClaimDocument } from "@/modules/claims/claim.model";
import type {
  ClaimRecord,
  ClaimShiftInput,
  MyShift,
  ReleaseClaimInput,
  ReleasedClaimSummary,
  ShiftWithClaims,
} from "@/modules/claims/types";
import { ShiftModel, type ShiftDocument } from "@/modules/shifts/shift.model";
import { staffingStatus } from "@/modules/shifts/shift.rules";
import { toShiftRecord } from "@/modules/shifts/shift.serializer";
import type { ShiftRecord } from "@/modules/shifts/types";
import { UserModel } from "@/modules/users/user.model";
import type { Profession } from "@/types";

type LeanShift = ShiftDocument & { _id: Types.ObjectId };
type LeanClaim = ClaimDocument & { _id: Types.ObjectId };

const PROFESSION_LABEL: Record<Profession, string> = {
  doctor: "doctors",
  nurse: "nurses",
  receptionist: "receptionists",
};

function formatWindow(shift: Pick<ShiftDocument, "date" | "startTime" | "endTime">): string {
  return `${shift.date} ${shift.startTime}–${shift.endTime}`;
}

function toObjectId(value: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw AppError.badRequest(`Invalid ${label}`);
  }
  return new Types.ObjectId(value);
}

/**
 * Claims a shift for a staff member.
 *
 * The two business rules from the brief (capacity per profession, and no
 * overlapping shifts for one person) have to hold even when many people act at
 * once, so each is enforced by something the database itself guarantees rather
 * than by the read-then-write check alone:
 *
 *  - Capacity: a conditional `$inc` whose filter re-tests `filled < required`
 *    with `$expr`. Two concurrent claimers cannot both match the filter, so the
 *    counter can never exceed the requirement.
 *  - Overlap: MongoDB transactions give snapshot isolation, not serializability,
 *    so two claims for *different but overlapping* shifts would otherwise both
 *    read a clean slate and both commit (a write skew). Bumping the claimant's
 *    own user document makes any two concurrent claims by the same person touch
 *    a shared document, which turns that skew into a write conflict that
 *    `withTransaction` retries — and the retry sees the committed first claim.
 *  - The partial-unique index on (shiftId, userId) backstops double-claiming.
 */
export async function claimShift(input: ClaimShiftInput): Promise<ShiftRecord> {
  const shiftId = toObjectId(input.shiftId, "shift id");
  const userId = toObjectId(input.userId, "user id");
  const isSelf = input.actingUserId === input.userId;
  const subjectPrefix = isSelf ? "You" : null;

  return withTransaction(async (session) => {
    // Serialization point for this claimant. Also loads the user.
    const user = await UserModel.findOneAndUpdate(
      { _id: userId },
      { $inc: { version: 1 } },
      { session, returnDocument: "after" },
    ).lean<{
      _id: Types.ObjectId;
      fullName: string;
      role: string;
      profession?: Profession;
    } | null>();

    if (!user) {
      throw AppError.notFound("Staff member not found");
    }

    const who = subjectPrefix ?? user.fullName;
    const verb = isSelf ? "have" : "has";

    if (user.role !== "staff" || !user.profession) {
      throw AppError.validation(
        `${who} cannot claim shifts because ${isSelf ? "you have" : "they have"} no profession assigned`,
      );
    }

    const profession = user.profession;

    const shift = await ShiftModel.findById(shiftId).session(session).lean<LeanShift | null>();
    if (!shift) {
      throw AppError.notFound("Shift not found");
    }

    const existing = await ClaimModel.findOne({ shiftId, userId, status: "active" })
      .session(session)
      .lean<LeanClaim | null>();

    if (existing) {
      throw AppError.conflict(`${who} already claimed this shift`);
    }

    if (shift.requirements[profession] === 0) {
      throw AppError.validation(`This shift does not need any ${PROFESSION_LABEL[profession]}`);
    }

    await assertNoOverlap({ session, userId, shift, who, verb });

    // Conditional increment: the filter re-checks capacity at write time.
    const filledPath = `filled.${profession}`;
    const updated = await ShiftModel.findOneAndUpdate(
      {
        _id: shiftId,
        $expr: { $lt: [`$filled.${profession}`, `$requirements.${profession}`] },
      },
      { $inc: { [filledPath]: 1, version: 1 } },
      { session, returnDocument: "after" },
    ).lean<LeanShift | null>();

    if (!updated) {
      throw AppError.conflict(
        `This shift already has enough ${PROFESSION_LABEL[profession]} ` +
          `(${shift.requirements[profession]} of ${shift.requirements[profession]} filled)`,
      );
    }

    await ClaimModel.create(
      [
        {
          shiftId,
          userId,
          profession,
          status: "active",
          source: input.source,
          assignedByUserId: isSelf ? undefined : toObjectId(input.actingUserId, "user id"),
        },
      ],
      { session },
    );

    return toShiftRecord(updated);
  });
}

async function assertNoOverlap(args: {
  session: mongoose.ClientSession;
  userId: Types.ObjectId;
  shift: LeanShift;
  who: string;
  verb: string;
}): Promise<void> {
  const { session, userId, shift, who, verb } = args;

  const activeClaims = await ClaimModel.find({ userId, status: "active" })
    .select({ shiftId: 1 })
    .session(session)
    .lean<{ shiftId: Types.ObjectId }[]>();

  if (activeClaims.length === 0) {
    return;
  }

  const clash = await ShiftModel.findOne({
    _id: { $in: activeClaims.map((claim) => claim.shiftId), $ne: shift._id },
    startAt: { $lt: shift.endAt },
    endAt: { $gt: shift.startAt },
  })
    .session(session)
    .lean<LeanShift | null>();

  if (clash) {
    throw AppError.conflict(
      `${who} ${verb} already claimed ${formatWindow(clash)}, which overlaps this shift`,
    );
  }
}

/** Releases an active claim and frees the capacity it was holding. */
export async function releaseClaim(input: ReleaseClaimInput): Promise<ShiftRecord> {
  const shiftId = toObjectId(input.shiftId, "shift id");
  const userId = toObjectId(input.userId, "user id");

  return withTransaction(async (session) => {
    const claim = await ClaimModel.findOneAndUpdate(
      { shiftId, userId, status: "active" },
      {
        $set: {
          status: "released",
          releasedAt: new Date(),
          releaseReason: input.reason ?? "Released by user",
        },
      },
      { session, returnDocument: "after" },
    ).lean<LeanClaim | null>();

    if (!claim) {
      throw AppError.notFound("No active claim found for this shift");
    }

    // Guarded so a double release can never drive the counter negative.
    const updated = await ShiftModel.findOneAndUpdate(
      { _id: shiftId, [`filled.${claim.profession}`]: { $gt: 0 } },
      { $inc: { [`filled.${claim.profession}`]: -1, version: 1 } },
      { session, returnDocument: "after" },
    ).lean<LeanShift | null>();

    const shift =
      updated ?? (await ShiftModel.findById(shiftId).session(session).lean<LeanShift | null>());

    if (!shift) {
      throw AppError.notFound("Shift not found");
    }

    return toShiftRecord(shift);
  });
}

/**
 * Re-applies the business rules to every claim on a shift after a manager edits
 * it, releasing the ones that no longer hold. Runs inside the caller's
 * transaction so an edit and its fallout commit together.
 *
 * Oldest claim wins: when requirements shrink, the people who committed first
 * keep their place.
 */
export async function revalidateShiftClaims(
  session: mongoose.ClientSession,
  shiftId: Types.ObjectId,
): Promise<ReleasedClaimSummary[]> {
  const shift = await ShiftModel.findById(shiftId).session(session).lean<LeanShift | null>();
  if (!shift) {
    return [];
  }

  const claims = await ClaimModel.find({ shiftId, status: "active" })
    .sort({ createdAt: 1 })
    .session(session)
    .lean<LeanClaim[]>();

  if (claims.length === 0) {
    await ShiftModel.updateOne(
      { _id: shiftId },
      { $set: { filled: { doctor: 0, nurse: 0, receptionist: 0 } } },
      { session },
    );
    return [];
  }

  const userIds = claims.map((claim) => claim.userId);
  const users = await UserModel.find({ _id: { $in: userIds } })
    .select({ fullName: 1 })
    .session(session)
    .lean<{ _id: Types.ObjectId; fullName: string }[]>();

  const nameById = new Map(users.map((user) => [user._id.toString(), user.fullName]));

  const kept: Record<Profession, number> = { doctor: 0, nurse: 0, receptionist: 0 };
  const released: ReleasedClaimSummary[] = [];

  for (const claim of claims) {
    const reason = await invalidationReason(session, claim, shift, kept);

    if (!reason) {
      kept[claim.profession] += 1;
      continue;
    }

    await ClaimModel.updateOne(
      { _id: claim._id },
      { $set: { status: "released", releasedAt: new Date(), releaseReason: reason } },
      { session },
    );

    released.push({
      claimId: claim._id.toString(),
      userId: claim.userId.toString(),
      userName: nameById.get(claim.userId.toString()) ?? "Unknown",
      profession: claim.profession,
      reason,
    });
  }

  await ShiftModel.updateOne({ _id: shiftId }, { $set: { filled: kept } }, { session });

  return released;
}

async function invalidationReason(
  session: mongoose.ClientSession,
  claim: LeanClaim,
  shift: LeanShift,
  kept: Record<Profession, number>,
): Promise<string | null> {
  if (kept[claim.profession] >= shift.requirements[claim.profession]) {
    return shift.requirements[claim.profession] === 0
      ? `Shift no longer needs ${PROFESSION_LABEL[claim.profession]}`
      : `Shift now needs only ${shift.requirements[claim.profession]} ${PROFESSION_LABEL[claim.profession]}`;
  }

  const otherClaims = await ClaimModel.find({
    userId: claim.userId,
    status: "active",
    shiftId: { $ne: shift._id },
  })
    .select({ shiftId: 1 })
    .session(session)
    .lean<{ shiftId: Types.ObjectId }[]>();

  if (otherClaims.length === 0) {
    return null;
  }

  const clash = await ShiftModel.findOne({
    _id: { $in: otherClaims.map((other) => other.shiftId) },
    startAt: { $lt: shift.endAt },
    endAt: { $gt: shift.startAt },
  })
    .session(session)
    .lean<LeanShift | null>();

  return clash
    ? `New shift time overlaps ${formatWindow(clash)}, which they had already claimed`
    : null;
}

/** Drops every claim on a shift. Used when the shift itself is deleted. */
export async function releaseAllClaimsForShift(
  session: mongoose.ClientSession,
  shiftId: Types.ObjectId,
  reason: string,
): Promise<number> {
  const result = await ClaimModel.updateMany(
    { shiftId, status: "active" },
    { $set: { status: "released", releasedAt: new Date(), releaseReason: reason } },
    { session },
  );

  return result.modifiedCount;
}

export async function listMyShifts(userId: string): Promise<MyShift[]> {
  await connectDb();

  const claims = await ClaimModel.find({ userId: toObjectId(userId, "user id"), status: "active" })
    .sort({ createdAt: -1 })
    .lean<LeanClaim[]>();

  if (claims.length === 0) {
    return [];
  }

  const shifts = await ShiftModel.find({ _id: { $in: claims.map((claim) => claim.shiftId) } }).lean<
    LeanShift[]
  >();

  const shiftById = new Map(shifts.map((shift) => [shift._id.toString(), shift]));
  const result: MyShift[] = [];

  for (const claim of claims) {
    const shift = shiftById.get(claim.shiftId.toString());
    if (!shift) {
      continue;
    }

    result.push({
      claimId: claim._id.toString(),
      shiftId: shift._id.toString(),
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      startAt: shift.startAt.toISOString(),
      endAt: shift.endAt.toISOString(),
      profession: claim.profession,
      status: claim.status,
      source: claim.source,
      releaseReason: claim.releaseReason,
      requirements: shift.requirements,
      staffingStatus: staffingStatus(shift.requirements, shift.filled),
    });
  }

  return result.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Shift ids the user currently holds an active claim on. Drives the UI state. */
export async function listActiveClaimShiftIds(userId: string): Promise<string[]> {
  await connectDb();
  const claims = await ClaimModel.find({
    userId: toObjectId(userId, "user id"),
    status: "active",
  })
    .select({ shiftId: 1 })
    .lean<{ shiftId: Types.ObjectId }[]>();

  return claims.map((claim) => claim.shiftId.toString());
}

export async function getShiftWithClaims(shiftId: string): Promise<ShiftWithClaims | null> {
  await connectDb();

  const id = toObjectId(shiftId, "shift id");
  const shift = await ShiftModel.findById(id).lean<LeanShift | null>();
  if (!shift) {
    return null;
  }

  return {
    ...toShiftRecord(shift),
    claims: await listClaimsForShift(id),
  };
}

async function listClaimsForShift(shiftId: Types.ObjectId): Promise<ClaimRecord[]> {
  const claims = await ClaimModel.find({ shiftId, status: "active" })
    .sort({ createdAt: 1 })
    .lean<LeanClaim[]>();

  if (claims.length === 0) {
    return [];
  }

  const users = await UserModel.find({ _id: { $in: claims.map((claim) => claim.userId) } })
    .select({ fullName: 1, email: 1 })
    .lean<{ _id: Types.ObjectId; fullName: string; email: string }[]>();

  const userById = new Map(users.map((user) => [user._id.toString(), user]));

  return claims.map((claim) => {
    const user = userById.get(claim.userId.toString());
    return {
      id: claim._id.toString(),
      shiftId: claim.shiftId.toString(),
      userId: claim.userId.toString(),
      userName: user?.fullName ?? "Unknown",
      userEmail: user?.email ?? "",
      profession: claim.profession,
      status: claim.status,
      source: claim.source,
      releaseReason: claim.releaseReason,
      createdAt: claim.createdAt.toISOString(),
    } satisfies ClaimRecord;
  });
}

/** Claim rosters for many shifts at once, keyed by shift id. */
export async function listClaimsForShifts(
  shiftIds: string[],
): Promise<Record<string, ClaimRecord[]>> {
  await connectDb();

  if (shiftIds.length === 0) {
    return {};
  }

  const ids = shiftIds
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));

  const claims = await ClaimModel.find({ shiftId: { $in: ids }, status: "active" })
    .sort({ createdAt: 1 })
    .lean<LeanClaim[]>();

  if (claims.length === 0) {
    return {};
  }

  const users = await UserModel.find({ _id: { $in: claims.map((claim) => claim.userId) } })
    .select({ fullName: 1, email: 1 })
    .lean<{ _id: Types.ObjectId; fullName: string; email: string }[]>();

  const userById = new Map(users.map((user) => [user._id.toString(), user]));
  const grouped: Record<string, ClaimRecord[]> = {};

  for (const claim of claims) {
    const user = userById.get(claim.userId.toString());
    const key = claim.shiftId.toString();
    grouped[key] ??= [];
    grouped[key].push({
      id: claim._id.toString(),
      shiftId: key,
      userId: claim.userId.toString(),
      userName: user?.fullName ?? "Unknown",
      userEmail: user?.email ?? "",
      profession: claim.profession,
      status: claim.status,
      source: claim.source,
      releaseReason: claim.releaseReason,
      createdAt: claim.createdAt.toISOString(),
    });
  }

  return grouped;
}
