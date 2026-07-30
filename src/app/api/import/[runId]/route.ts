import type { NextRequest } from "next/server";

import { handleApiRoute, jsonSuccess } from "@/lib";
import { AppError } from "@/lib/errors/AppError";
import { requireManager } from "@/modules/auth/server";
import { getImportRun } from "@/modules/imports";

interface RouteContext {
  params: Promise<{ runId: string }>;
}

/** `latest` resolves to the most recent run, which is what the report page loads. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handleApiRoute(async () => {
    await requireManager();
    const { runId } = await params;

    const run = await getImportRun(runId === "latest" ? undefined : runId);
    if (!run) {
      throw AppError.notFound("Import run not found");
    }

    return jsonSuccess(run);
  });
}
