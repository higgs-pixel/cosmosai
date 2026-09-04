export type RateLimitRule = { name: string; limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number; rule?: string };

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  async increment(key: string, windowMs: number) {
    const now = this.now();
    const existing = this.entries.get(key);
    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs };
      this.entries.set(key, entry);
      return entry;
    }
    existing.count += 1;
    return existing;
  }
}

class UpstashRateLimitStore implements RateLimitStore {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async increment(key: string, windowMs: number) {
    const response = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PTTL", key],
        ["PEXPIRE", key, windowMs, "NX"],
        ["PTTL", key],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error("Distributed rate-limit store unavailable.");
    const payload = (await response.json()) as Array<{ result?: number }>;
    const count = Number(payload[0]?.result ?? 0);
    const ttl = Number(payload[3]?.result ?? payload[1]?.result ?? windowMs);
    return { count, resetAt: Date.now() + Math.max(1, ttl) };
  }
}

const developmentStore = new MemoryRateLimitStore();

export function getRateLimitStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token && (process.env.NODE_ENV !== "production" || process.env.SECURITY_LOG_SALT)) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) {
        return new UpstashRateLimitStore(parsed.origin, token);
      }
    } catch {
      // Invalid configuration is handled by the conservative fallback below.
    }
  }
  return process.env.NODE_ENV === "production" ? null : developmentStore;
}

export async function enforceRateLimits(
  store: RateLimitStore,
  endpoint: string,
  actor: string,
  rules: RateLimitRule[],
): Promise<RateLimitResult> {
  for (const rule of rules) {
    const bucket = Math.floor(Date.now() / rule.windowMs);
    const result = await store.increment(`cosmos:${endpoint}:${actor}:${rule.name}:${bucket}`, rule.windowMs);
    if (result.count > rule.limit) {
      return {
        allowed: false,
        rule: rule.name,
        retryAfterSeconds: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000)),
      };
    }
  }
  return { allowed: true };
}
