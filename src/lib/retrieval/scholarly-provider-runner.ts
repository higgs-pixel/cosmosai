import type { ProviderPaperRecord } from "./scholarly-paper.ts";
import type { ScholarlyProvider, ScholarlyQueryPlan } from "./scholarly-query-plan.ts";

export type ScholarlyProviderAdapter = (plan: ScholarlyQueryPlan) => Promise<ProviderPaperRecord[]>;
export type ScholarlyProviderAdapters = Record<ScholarlyProvider, ScholarlyProviderAdapter>;

export type ProviderRunStatus = {
  status: "success" | "empty" | "failed";
  count: number;
  latencyMs: number;
  reason?: "timeout" | "provider_error";
};

export type ScholarlyProviderRunResult = {
  records: ProviderPaperRecord[];
  statuses: Record<ScholarlyProvider, ProviderRunStatus>;
  allProvidersFailed: boolean;
};

class ProviderTimeoutError extends Error {
  constructor() {
    super("Provider request timed out.");
    this.name = "ProviderTimeoutError";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new ProviderTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function runScholarlyProviders(
  plan: ScholarlyQueryPlan,
  adapters: ScholarlyProviderAdapters,
  timeoutMs = 9_000,
): Promise<ScholarlyProviderRunResult> {
  const providers = plan.providers.slice(0, 3);
  const results = await Promise.all(providers.map(async (provider) => {
    const startedAt = performance.now();
    try {
      const records = await withTimeout(adapters[provider](plan), Math.min(10_000, Math.max(10, timeoutMs)));
      return {
        provider,
        records: records.slice(0, plan.candidateLimitPerProvider * 2),
        status: {
          status: records.length > 0 ? "success" : "empty",
          count: records.length,
          latencyMs: Math.round(performance.now() - startedAt),
        } satisfies ProviderRunStatus,
      };
    } catch (error) {
      return {
        provider,
        records: [],
        status: {
          status: "failed",
          count: 0,
          latencyMs: Math.round(performance.now() - startedAt),
          reason: error instanceof ProviderTimeoutError ? "timeout" : "provider_error",
        } satisfies ProviderRunStatus,
      };
    }
  }));

  const statuses = Object.fromEntries(results.map((result) => [result.provider, result.status])) as Record<ScholarlyProvider, ProviderRunStatus>;
  for (const provider of ["OpenAlex", "arXiv", "CORE"] as const) {
    statuses[provider] ??= { status: "empty", count: 0, latencyMs: 0 };
  }

  return {
    records: results.flatMap((result) => result.records),
    statuses,
    allProvidersFailed: results.length > 0 && results.every((result) => result.status.status === "failed"),
  };
}

