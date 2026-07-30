import type { ApiErrorBody, ApiSuccessBody } from "@/types";

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === "object" && body !== null && "error" in body;
}

/**
 * Client-safe fetch wrapper that unwraps the `{ data }` / `{ error }` envelope
 * used by every route handler. Must not import server-only modules.
 */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  // FormData must set its own Content-Type so the multipart boundary survives.
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;

  const response = await fetch(input, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isErrorBody(body)) {
      throw new ApiRequestError(
        body.error.code,
        body.error.message,
        response.status,
        body.error.details,
      );
    }

    throw new ApiRequestError("INTERNAL_ERROR", "Request failed", response.status);
  }

  return (body as ApiSuccessBody<T>).data;
}
