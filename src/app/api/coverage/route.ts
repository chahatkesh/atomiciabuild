import type { NextRequest } from "next/server";
import { z } from "zod";

import { handleApiRoute, jsonSuccess } from "@/lib";
import { AppError } from "@/lib/errors/AppError";
import { requireUser } from "@/modules/auth/server";
import { getWeekCoverage } from "@/modules/coverage";

const querySchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD")
    .optional(),
});

/**
 * Readable by any signed-in user, not just managers. The dashboard is the
 * landing page for both roles, and a staff member seeing which shifts are short
 * is what prompts them to claim one. Management actions stay manager-only.
 */
export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    await requireUser();

    const parsed = querySchema.safeParse({
      weekStart: request.nextUrl.searchParams.get("weekStart") ?? undefined,
    });

    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", parsed.error.flatten());
    }

    return jsonSuccess(await getWeekCoverage(parsed.data.weekStart));
  });
}
