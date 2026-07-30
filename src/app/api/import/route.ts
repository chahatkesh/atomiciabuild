import type { NextRequest } from "next/server";

import { handleApiRoute, jsonSuccess } from "@/lib";
import { AppError } from "@/lib/errors/AppError";
import { requireManager } from "@/modules/auth/server";
import { detectCsvKind, listImportRuns, parseCsv, runImport } from "@/modules/imports";
import type { ImportFileInput } from "@/modules/imports";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function GET() {
  return handleApiRoute(async () => {
    await requireManager();
    return jsonSuccess(await listImportRuns());
  });
}

/**
 * Manager CSV upload. Accepts one or both exports in a single submission and
 * runs them through exactly the same pipeline as the seed.
 */
export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const manager = await requireManager();

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      throw AppError.badRequest("Expected a multipart form upload");
    }

    const uploaded = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (uploaded.length === 0) {
      throw AppError.validation("Attach at least one CSV file");
    }

    const files: ImportFileInput[] = [];

    for (const file of uploaded) {
      if (file.size === 0) {
        throw AppError.validation(`"${file.name}" is empty`);
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw AppError.validation(
          `"${file.name}" is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`,
        );
      }

      const content = await file.text();
      const kind = detectCsvKind(parseCsv(content).headers);

      if (!kind) {
        throw AppError.validation(
          `Could not tell whether "${file.name}" is a staff or shifts export. ` +
            `Expected either staff_id, full_name, role, email — or ` +
            `shift_id, date, start_time, end_time, requirements.`,
        );
      }

      files.push({ fileName: file.name, content, kind });
    }

    const result = await runImport({
      files,
      source: "upload",
      triggeredByUserId: manager.id,
    });

    return jsonSuccess(result, 201);
  });
}
