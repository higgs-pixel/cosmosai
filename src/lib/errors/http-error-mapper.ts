import { AppError } from "./app-error.ts";
import { serializePublicError } from "./serialize-error.ts";

function describeUnknown(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown thrown value";
}

export function normalizeAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error && error.name === "ConfigurationError") {
    return new AppError({
      code: "CONFIGURATION_ERROR",
      internalMessage: error.message,
      cause: error,
    });
  }

  return new AppError({
    code: "INTERNAL_ERROR",
    internalMessage: describeUnknown(error),
    cause: error,
  });
}

export function mapErrorToHttp(error: unknown, requestId?: string) {
  const normalized = normalizeAppError(error);
  return {
    status: normalized.httpStatus,
    body: serializePublicError(normalized, requestId),
  } as const;
}
