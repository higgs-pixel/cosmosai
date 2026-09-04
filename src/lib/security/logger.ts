import { createHash, randomBytes, randomUUID } from "node:crypto";

const REDACT_KEYS = /authorization|cookie|password|secret|token|api[-_]?key|prompt|content/i;
const runtimeSalt = randomBytes(32).toString("hex");

export function createSecurityRequestId() {
  return randomUUID();
}

export function hashActor(value: string | null | undefined) {
  if (!value) return "anonymous";
  const salt = process.env.SECURITY_LOG_SALT || runtimeSalt;
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 16);
}

function redact(details: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, REDACT_KEYS.test(key) ? "[redacted]" : value]),
  );
}

export function logSecurityEvent(
  event: string,
  details: { endpoint: string; requestId: string; actor?: string; reason?: string; [key: string]: unknown },
) {
  console.warn({
    timestamp: new Date().toISOString(),
    type: "security",
    event,
    ...redact(details),
  });
}
