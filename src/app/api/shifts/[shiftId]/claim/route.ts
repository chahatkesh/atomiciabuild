import type { NextRequest } from "next/server";

import { handleApiRoute, jsonSuccess } from "@/lib";
import { AppError } from "@/lib/errors/AppError";
import { requireUser } from "@/modules/auth/server";
import { claimShift, releaseClaim } from "@/modules/claims";

interface RouteContext {
  params: Promise<{ shiftId: string }>;
}

/**
 * Claim a shift.
 *
 * Staff act on themselves. A manager may pass `{ userId }` to assign someone
 * else; the same rules run either way, because the brief requires manager
 * assignment to respect capacity and overlap too.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  return handleApiRoute(async () => {
    const actor = await requireUser();
    const { shiftId } = await params;

    const body = (await request.json().catch(() => ({}))) as { userId?: unknown };
    const requestedUserId = typeof body?.userId === "string" ? body.userId : undefined;

    if (requestedUserId && requestedUserId !== actor.id && actor.role !== "manager") {
      throw AppError.forbidden("Only a manager can assign a shift to someone else");
    }

    const targetUserId = requestedUserId ?? actor.id;

    if (targetUserId === actor.id && actor.role !== "staff") {
      throw AppError.validation(
        "Managers do not have a profession, so they cannot claim shifts themselves",
      );
    }

    const shift = await claimShift({
      shiftId,
      userId: targetUserId,
      actingUserId: actor.id,
      source: targetUserId === actor.id ? "self" : "manager",
    });

    return jsonSuccess(shift, 201);
  });
}

/** Release a claim. Staff release their own; managers may release anyone's. */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  return handleApiRoute(async () => {
    const actor = await requireUser();
    const { shiftId } = await params;

    const requestedUserId = new URL(request.url).searchParams.get("userId") ?? undefined;

    if (requestedUserId && requestedUserId !== actor.id && actor.role !== "manager") {
      throw AppError.forbidden("Only a manager can remove someone else from a shift");
    }

    const targetUserId = requestedUserId ?? actor.id;
    const byManager = targetUserId !== actor.id;

    const shift = await releaseClaim({
      shiftId,
      userId: targetUserId,
      reason: byManager ? "Removed by a manager" : "Released by the staff member",
    });

    return jsonSuccess(shift);
  });
}
