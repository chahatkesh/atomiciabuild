import type { NextRequest } from "next/server";

import { handleApiRoute, jsonSuccess } from "@/lib";
import { AppError } from "@/lib/errors/AppError";
import { requireManager, requireUser } from "@/modules/auth/server";
import {
  createShift,
  createShiftSchema,
  listShifts,
  listShiftsQuerySchema,
} from "@/modules/shifts";

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    await requireUser();

    const { searchParams } = request.nextUrl;
    const parsed = listShiftsQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", parsed.error.flatten());
    }

    const shifts = await listShifts(parsed.data);
    return jsonSuccess(shifts);
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
