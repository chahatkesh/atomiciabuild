import type { NextRequest } from "next/server";

import { handleApiRoute, jsonSuccess } from "@/lib";
import { AppError } from "@/lib/errors/AppError";
import { requireManager, requireUser } from "@/modules/auth/server";
import { getShiftWithClaims } from "@/modules/claims";
import { deleteShift, updateShift, updateShiftSchema } from "@/modules/shifts";

interface RouteContext {
  params: Promise<{ shiftId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handleApiRoute(async () => {
    await requireUser();
    const { shiftId } = await params;

    const shift = await getShiftWithClaims(shiftId);
    if (!shift) {
      throw AppError.notFound("Shift not found");
    }

    return jsonSuccess(shift);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handleApiRoute(async () => {
    await requireManager();
    const { shiftId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = updateShiftSchema.safeParse(body);

    if (!parsed.success) {
      throw AppError.validation("Invalid shift payload", parsed.error.flatten());
    }

    const { shift, releasedClaims } = await updateShift(shiftId, parsed.data);
    return jsonSuccess({ ...shift, releasedClaims });
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  return handleApiRoute(async () => {
    await requireManager();
    const { shiftId } = await params;

    const { releasedClaims } = await deleteShift(shiftId);
    return jsonSuccess({ id: shiftId, deleted: true, releasedClaims });
  });
}
