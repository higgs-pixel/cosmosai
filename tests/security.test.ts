import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAuthenticatedSession,
  assertAdminSession,
  SecurityHttpError,
} from "../src/lib/security/auth.ts";
import { getPublicError } from "../src/lib/security/errors.ts";
import { getSecurityHeaders } from "../src/lib/security/headers.ts";
import { isSameOriginMutation } from "../src/lib/security/origin.ts";
import { MemoryRateLimitStore, enforceRateLimits } from "../src/lib/security/rate-limit.ts";
import { readBoundedJson } from "../src/lib/security/request.ts";
import { safeExternalUrl } from "../src/lib/security/safe-url.ts";
import { validateInternalRedirect } from "../src/lib/security/redirect.ts";
import { validateChatMessageList, validateSavedDiscoveryInput, validateWidgetLayoutInput } from "../src/lib/security/validation.ts";

test("protected resources reject unauthenticated and non-admin sessions", () => {
  assert.throws(() => assertAuthenticatedSession(null), (error: unknown) => {
    assert.ok(error instanceof SecurityHttpError);
    assert.equal(error.status, 401);
    return true;
  });
  assert.throws(
    () => assertAdminSession({ user: { id: "1", email: "u@example.com", role: "user" }, accessToken: "token" }),
    (error: unknown) => error instanceof SecurityHttpError && error.status === 403,
  );
});

test("redirect validation blocks external, protocol-relative, encoded, and script destinations", () => {
  const fallback = "/account";
  for (const value of [
    "//attacker.example",
    "https://attacker.example",
    "javascript:alert(1)",
    "/\\attacker.example",
    "/%5c%5cattacker.example",
    "/%2f%2fattacker.example",
    "https://trusted.example@attacker.example",
  ]) {
    assert.equal(validateInternalRedirect(value, fallback), fallback);
  }
  assert.equal(validateInternalRedirect("/account?verified=1", fallback), "/account?verified=1");
});

test("same-origin validation accepts trusted mutations and rejects cross-origin requests", () => {
  const sameOrigin = new Request("https://cosmos.example/api/save", {
    method: "POST",
    headers: { origin: "https://cosmos.example", host: "cosmos.example", "x-forwarded-proto": "https" },
  });
  const crossOrigin = new Request("https://cosmos.example/api/save", {
    method: "POST",
    headers: { origin: "https://attacker.example", host: "cosmos.example", "x-forwarded-proto": "https" },
  });
  assert.equal(isSameOriginMutation(sameOrigin), true);
  assert.equal(isSameOriginMutation(crossOrigin), false);
});

test("safe URL validation rejects script, data, credentials, private networks, and metadata", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://trusted.example@attacker.example",
    "http://127.0.0.1/admin",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.1",
    "http://[::1]/",
  ]) {
    assert.equal(safeExternalUrl(value), null);
  }
  assert.equal(safeExternalUrl("https://images.nasa.gov/details-PIA123"), "https://images.nasa.gov/details-PIA123");
});

test("bounded JSON rejects malformed and oversized requests", async () => {
  await assert.rejects(
    readBoundedJson(new Request("https://cosmos.example", { method: "POST", body: "{" }), 100),
    (error: unknown) => error instanceof SecurityHttpError && error.status === 400,
  );
  await assert.rejects(
    readBoundedJson(new Request("https://cosmos.example", { method: "POST", body: JSON.stringify({ x: "a".repeat(101) }) }), 100),
    (error: unknown) => error instanceof SecurityHttpError && error.status === 413,
  );
  let deeplyNested = "0";
  for (let index = 0; index < 30; index += 1) deeplyNested = `{"x":${deeplyNested}}`;
  await assert.rejects(
    readBoundedJson(new Request("https://cosmos.example", { method: "POST", body: deeplyNested }), 2_000),
    (error: unknown) => error instanceof SecurityHttpError && error.status === 400,
  );
});

test("saved discovery validation rejects unexpected fields, malformed IDs, and unsafe URLs", () => {
  assert.equal(validateSavedDiscoveryInput({ id: "ok", type: "apod", title: "APOD", admin: true }).ok, false);
  assert.equal(validateSavedDiscoveryInput({ id: "../bad", type: "apod", title: "APOD" }).ok, false);
  assert.equal(
    validateSavedDiscoveryInput({ id: "apod-2026-07-18", type: "apod", title: "APOD", href: "javascript:alert(1)" }).ok,
    false,
  );
  const injection = validateSavedDiscoveryInput({ id: "item-1", type: "apod", title: "' OR 1=1 --" });
  assert.equal(injection.ok, true, "SQL-like text is treated as inert content, not query syntax");
});

test("mission layout validation rejects malformed shapes instead of silently erasing state", () => {
  assert.equal(validateWidgetLayoutInput({ layout: [{ id: "earth", x: 0, y: 0, w: 6, h: 4 }] }).ok, true);
  assert.equal(validateWidgetLayoutInput({ layout: [{ id: "earth", x: "0", y: 0, w: 6, h: 4 }] }).ok, false);
  assert.equal(validateWidgetLayoutInput({ layout: [], extra: true }).ok, false);
});

test("AI validation rejects oversized prompts, long history, and unexpected fields", () => {
  assert.equal(validateChatMessageList([{ role: "user", content: "a".repeat(8_001) }], 12, 8_000).ok, false);
  assert.equal(validateChatMessageList(Array.from({ length: 13 }, () => ({ role: "user", content: "hello" })), 12, 8_000).ok, false);
  assert.equal(validateChatMessageList([{ role: "user", content: "hello", tokenBudget: 999_999 }], 12, 8_000).ok, false);
});

test("rate limiting enforces anonymous and authenticated tiers with retry metadata", async () => {
  let now = 1_000;
  const store = new MemoryRateLimitStore(() => now);
  for (let count = 0; count < 5; count += 1) {
    const result = await enforceRateLimits(store, "ai-chat", "ip:hash", [
      { name: "burst", limit: 5, windowMs: 600_000 },
    ]);
    assert.equal(result.allowed, true);
  }
  const blocked = await enforceRateLimits(store, "ai-chat", "ip:hash", [
    { name: "burst", limit: 5, windowMs: 600_000 },
  ]);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds && blocked.retryAfterSeconds > 0);

  now += 600_001;
  const reset = await enforceRateLimits(store, "ai-chat", "ip:hash", [
    { name: "burst", limit: 5, windowMs: 600_000 },
  ]);
  assert.equal(reset.allowed, true);
});

test("production errors are redacted and carry a request ID", () => {
  const result = getPublicError(new Error("postgres password=secret relation profiles"), "req-123");
  assert.equal(result.requestId, "req-123");
  assert.equal(JSON.stringify(result).includes("password"), false);
  assert.equal(JSON.stringify(result).includes("postgres"), false);
});

test("security headers include CSP and browser hardening", () => {
  const headers = Object.fromEntries(getSecurityHeaders(true).map(({ key, value }) => [key, value]));
  assert.match(headers["Content-Security-Policy"], /default-src 'self'/);
  assert.match(headers["Content-Security-Policy"], /object-src 'none'/);
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(
    headers["Content-Security-Policy"],
    /media-src[^;]+https:\/\/\*\.public\.blob\.vercel-storage\.com/,
  );
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.match(headers["Strict-Transport-Security"], /max-age=/);
});
