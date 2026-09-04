import "server-only";
import { env } from "@/lib/env";

export type CosmosAiModelStatus =
  | "live_ai"
  | "gpt5_active"
  | "gpt4o_fallback"
  | "fallback_mode"
  | "missing_api_key"
  | "rate_limited"
  | "quota_or_billing_issue"
  | "service_unavailable";

export const OPENAI_PREFERRED_MODEL = "gpt-5-mini";
export const OPENAI_FALLBACK_MODEL = "gpt-4o-mini";

export function getOpenAiModelCandidates() {
  const candidates = [env.openaiModel, OPENAI_PREFERRED_MODEL, OPENAI_FALLBACK_MODEL].filter(
    (model): model is string => Boolean(model),
  );

  return Array.from(new Set(candidates));
}

export function getOpenAiModelStatus(model?: string, source?: "openai" | "fallback" | "cache"): CosmosAiModelStatus {
  if (!env.openaiApiKey) return "missing_api_key";
  if (source === "fallback") return "fallback_mode";
  if (!model) return "live_ai";
  if (model.startsWith("gpt-5")) return "gpt5_active";
  if (model === OPENAI_FALLBACK_MODEL) return "gpt4o_fallback";
  return "live_ai";
}

export function isOpenAiModelUnavailable(status: number, upstreamMessage?: string) {
  const normalized = upstreamMessage?.toLowerCase() ?? "";

  return (
    (status === 400 || status === 404 || status === 403) &&
    normalized.includes("model") &&
    (normalized.includes("does not exist") ||
      normalized.includes("not found") ||
      normalized.includes("unsupported") ||
      normalized.includes("unavailable") ||
      normalized.includes("invalid"))
  );
}

export function fallbackReasonToModelStatus(reason?: string): CosmosAiModelStatus {
  if (!reason) return "fallback_mode";
  if (reason.includes("rate_limited")) return "rate_limited";
  if (reason === "missing_openai_key") return "missing_api_key";
  if (reason === "openai_quota_or_credits_unavailable") return "quota_or_billing_issue";
  if (reason.startsWith("openai_status_") || reason === "openai_fetch_failed" || reason === "openai_timeout") {
    return "service_unavailable";
  }
  return "fallback_mode";
}
