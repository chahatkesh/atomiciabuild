export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError("BAD_REQUEST", message, 400, details);
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message = "You do not have permission to perform this action"): AppError {
    return new AppError("FORBIDDEN", message, 403);
  }

  static notFound(message: string): AppError {
    return new AppError("NOT_FOUND", message, 404);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError("CONFLICT", message, 409, details);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError("VALIDATION_ERROR", message, 422, details);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError("INTERNAL_ERROR", message, 500);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
