import type { NextRequest } from "next/server";

import { handleApiRoute, jsonSuccess } from "@/lib";
import { AppError } from "@/lib/errors/AppError";
import { requireManager, requireUser } from "@/modules/auth/server";
import { listActiveClaimShiftIds, listClaimsForShifts } from "@/modules/claims";
import {
  createShift,
  createShiftSchema,
  listShifts,
  listShiftsQuerySchema,
} from "@/modules/shifts";

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const user = await requireUser();

    const { searchParams } = request.nextUrl;
    const parsed = listShiftsQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", parsed.error.flatten());
    }

    const shifts = await listShifts(parsed.data);

    // Rosters and the caller's own claims travel with the list so the table can
    // render claim state without a request per row.
    const [claimsByShift, myShiftIds] = await Promise.all([
      listClaimsForShifts(shifts.map((shift) => shift.id)),
      listActiveClaimShiftIds(user.id),
    ]);

    const mine = new Set(myShiftIds);

    return jsonSuccess(
      shifts.map((shift) => ({
        ...shift,
        claims: claimsByShift[shift.id] ?? [],
        claimedByMe: mine.has(shift.id),
      })),
    );
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    await requireManager();

    const body = await request.json().catch(() => null);
    const parsed = createShiftSchema.safeParse(body);

    if (!parsed.success) {
      throw AppError.validation("Invalid shift payload", parsed.error.flatten());
    }

    const shift = await createShift(parsed.data);
    return jsonSuccess(shift, 201);
  });
}
