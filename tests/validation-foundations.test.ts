import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { AppError } from "../src/lib/errors/app-error.ts";
import {
  identifierSchema,
  paginationSchema,
  safeHttpUrlSchema,
  trimmedTextSchema,
} from "../src/lib/validation/common-schemas.ts";
import { VALIDATION_LIMITS } from "../src/lib/validation/limits.ts";
import {
  parseInput,
  parseJsonRequest,
  safeParseInput,
} from "../src/lib/validation/parse.ts";

test("untrusted values are parsed and normalized through an explicit schema", () => {
  const schema = z.object({ query: trimmedTextSchema({ max: 80 }) });

  assert.deepEqual(parseInput(schema, { query: "  Mars atmosphere  " }), {
    query: "Mars atmosphere",
  });
});

test("validation failures convert to deterministic application errors", () => {
  const schema = z.object({ query: trimmedTextSchema({ max: 10 }) });

  assert.throws(
    () => parseInput(schema, { query: "x".repeat(11) }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.equal(error.publicMessage, "The request contains invalid data.");
      assert.deepEqual(error.metadata?.issues, [
        { path: "query", code: "too_big" },
      ]);
      return true;
    },
  );
});

test("safe parsing exposes success or a typed validation error without throwing", () => {
  const result = safeParseInput(z.object({ id: identifierSchema }), {
    id: "../unsafe",
  });

  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.error.code, "VALIDATION_ERROR");
});

test("shared limits document bounded text, arrays, pagination, URLs, and IDs", () => {
  assert.ok(VALIDATION_LIMITS.text.defaultMax > 0);
  assert.ok(VALIDATION_LIMITS.array.defaultMax > 0);
  assert.ok(VALIDATION_LIMITS.pagination.maxPageSize >= VALIDATION_LIMITS.pagination.defaultPageSize);
  assert.ok(VALIDATION_LIMITS.url.maxLength > 100);
  assert.ok(VALIDATION_LIMITS.id.maxLength > 20);
});

test("pagination coercion enforces central bounds", () => {
  assert.deepEqual(
    parseInput(paginationSchema, { page: "2", pageSize: "12" }),
    { page: 2, pageSize: 12 },
  );
  assert.throws(
    () => parseInput(paginationSchema, { page: 0, pageSize: 10_000 }),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
  assert.throws(
    () => parseInput(paginationSchema, { page: 1, pageSize: 20, admin: true }),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
});

test("safe HTTP URLs reject credentials, unsafe protocols, and private destinations", () => {
  assert.equal(
    parseInput(safeHttpUrlSchema, "https://images.nasa.gov/details/PIA123"),
    "https://images.nasa.gov/details/PIA123",
  );
  assert.equal(
    parseInput(safeHttpUrlSchema, "https://fc-data.example.org/paper"),
    "https://fc-data.example.org/paper",
  );
  for (const value of [
    "javascript:alert(1)",
    "data:text/plain,unsafe",
    "//example.com/path",
    "https://user:password@example.com/private",
    "http://localhost/admin",
    "http://127.0.0.1/admin",
    "http://10.0.0.1/admin",
    "http://172.16.0.1/admin",
    "http://192.168.1.1/admin",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/admin",
  ]) {
    assert.throws(
      () => parseInput(safeHttpUrlSchema, value),
      (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
    );
  }
});

test("malformed JSON maps deterministically to a validation AppError", async () => {
  const request = new Request("https://cosmos.example/api/test", {
    method: "POST",
    body: '{"query":',
    headers: { "content-type": "application/json" },
  });

  await assert.rejects(
    () => parseJsonRequest(request, z.object({ query: trimmedTextSchema() }).strict()),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "VALIDATION_ERROR" &&
      error.publicMessage === "The request contains invalid data.",
  );
});

test("identifier validation accepts stable IDs and rejects path-like values", () => {
  assert.equal(parseInput(identifierSchema, "apod-2026-07-20"), "apod-2026-07-20");
  assert.throws(
    () => parseInput(identifierSchema, "../apod"),
    (error: unknown) => error instanceof AppError && error.code === "VALIDATION_ERROR",
  );
});
