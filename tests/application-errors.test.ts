import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../src/lib/errors/app-error.ts";
import {
  APP_ERROR_HTTP_STATUS,
  type AppErrorCode,
} from "../src/lib/errors/error-codes.ts";
import { normalizeAppError } from "../src/lib/errors/http-error-mapper.ts";
import {
  serializeErrorForLog,
  serializePublicError,
} from "../src/lib/errors/serialize-error.ts";

const expectedStatuses: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 403,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_UNAVAILABLE: 503,
  DATABASE_ERROR: 500,
  CONFIGURATION_ERROR: 500,
  INTERNAL_ERROR: 500,
};

test("every application error code has a stable HTTP status", () => {
  assert.deepEqual(APP_ERROR_HTTP_STATUS, expectedStatuses);
});

test("known application errors serialize to the consistent public schema", () => {
  const error = new AppError({
    code: "NOT_FOUND",
    publicMessage: "The requested observation was not found.",
    internalMessage: "APOD row 42 absent",
  });

  assert.deepEqual(serializePublicError(error, "req-42"), {
    error: {
      code: "NOT_FOUND",
      message: "The requested observation was not found.",
      requestId: "req-42",
      retryable: false,
    },
  });
});

test("unknown Error values normalize to a safe internal error", () => {
  const error = normalizeAppError(new Error("provider token leaked internally"));

  assert.equal(error.code, "INTERNAL_ERROR");
  assert.equal(error.publicMessage, "The request could not be completed.");
  assert.equal(serializePublicError(error).error.message.includes("token"), false);
});

test("thrown strings normalize without becoming public messages", () => {
  const error = normalizeAppError("database password=secret");

  assert.equal(error.code, "INTERNAL_ERROR");
  assert.equal(serializePublicError(error).error.message, "The request could not be completed.");
});

test("application errors preserve their cause for internal diagnostics", () => {
  const cause = new Error("upstream timeout");
  const error = new AppError({
    code: "PROVIDER_TIMEOUT",
    internalMessage: "NASA request exceeded deadline",
    cause,
  });

  assert.equal(error.cause, cause);
});

test("production logging omits stack traces", () => {
  const error = new AppError({ code: "INTERNAL_ERROR", internalMessage: "private detail" });
  const serialized = serializeErrorForLog(error, { production: true });

  assert.equal("stack" in serialized, false);
});

test("sensitive metadata is recursively redacted", () => {
  const error = new AppError({
    code: "PROVIDER_UNAVAILABLE",
    internalMessage: "provider failed",
    metadata: {
      provider: "NASA",
      apiKey: "secret-key",
      nested: { authorization: "Bearer secret", safeCount: 3 },
    },
  });
  const serialized = serializeErrorForLog(error, { production: false });
  const text = JSON.stringify(serialized);

  assert.match(text, /NASA/);
  assert.match(text, /\[REDACTED\]/);
  assert.doesNotMatch(text, /secret-key|Bearer secret/);
  assert.match(text, /safeCount/);
});

test("provider timeouts are retryable by default", () => {
  const error = new AppError({ code: "PROVIDER_TIMEOUT" });

  assert.equal(error.retryable, true);
  assert.equal(error.httpStatus, 504);
  assert.equal(serializePublicError(error).error.retryable, true);
});

test("validation errors use a safe deterministic message", () => {
  const error = new AppError({
    code: "VALIDATION_ERROR",
    internalMessage: "Zod issue path=query code=too_small",
  });

  assert.equal(error.publicMessage, "The request contains invalid data.");
  assert.equal(error.httpStatus, 400);
});

test("unknown failures use the internal error fallback", () => {
  const payload = serializePublicError(Symbol("unexpected"), "req-safe");

  assert.deepEqual(payload, {
    error: {
      code: "INTERNAL_ERROR",
      message: "The request could not be completed.",
      requestId: "req-safe",
      retryable: false,
    },
  });
});
