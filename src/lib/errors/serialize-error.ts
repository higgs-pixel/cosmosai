import { AppError } from "./app-error.ts";

export type PublicErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId?: string;
    retryable: boolean;
  };
};

const SENSITIVE_KEY = /authorization|cookie|credential|password|secret|token|api.?key/i;

function redactString(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(password|secret|token|api.?key)\s*[=:]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function redactMetadata(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redactMetadata(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactMetadata(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

export function serializePublicError(
  error: unknown,
  requestId?: string,
): PublicErrorResponse {
  const normalized =
    error instanceof AppError
      ? error
      : new AppError({
          code: "INTERNAL_ERROR",
          internalMessage:
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Unknown thrown value",
          cause: error,
        });
  return {
    error: {
      code: normalized.code,
      message: normalized.publicMessage,
      ...(requestId ? { requestId } : {}),
      retryable: normalized.retryable,
    },
  };
}

export function serializeErrorForLog(
  error: unknown,
  { production }: { production: boolean },
) {
  const normalized =
    error instanceof AppError
      ? error
      : new AppError({
          code: "INTERNAL_ERROR",
          internalMessage:
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Unknown thrown value",
          cause: error,
        });
  return {
    name: normalized.name,
    code: normalized.code,
    message: redactString(normalized.internalMessage),
    httpStatus: normalized.httpStatus,
    retryable: normalized.retryable,
    ...(normalized.metadata
      ? { metadata: redactMetadata(normalized.metadata) }
      : {}),
    ...(!production && normalized.stack
      ? { stack: redactString(normalized.stack) }
      : {}),
  };
}
