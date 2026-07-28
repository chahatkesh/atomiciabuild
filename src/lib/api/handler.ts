import { NextResponse } from "next/server";

import { AppError, isAppError } from "@/lib/errors/AppError";
import type { ApiErrorBody, ApiSuccessBody } from "@/types";

export function jsonSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status });
}

export function jsonError(
  code: AppError["code"],
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export async function handleApiRoute<T>(
  handler: () => Promise<NextResponse<ApiSuccessBody<T>> | NextResponse<ApiErrorBody>>,
): Promise<NextResponse<ApiSuccessBody<T>> | NextResponse<ApiErrorBody>> {
  try {
    return await handler();
  } catch (error) {
    if (isAppError(error)) {
      return jsonError(error.code, error.message, error.status, error.details);
    }

    console.error("Unhandled API error", error);
    return jsonError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
