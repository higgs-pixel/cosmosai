import "server-only";

import { ServerFetchError, serverFetchJson, serverFetchText, type ServerFetchOptions } from "@/lib/server-fetch";
import type { ScholarlyPaperType } from "@/lib/retrieval/research-request";

export type SourceAttribution = {
  name: string;
  url?: string;
  provider: string;
  retrievedAt: string;
};

export type DataSourceResult<T> = {
  available: boolean;
  data: T | null;
  source: SourceAttribution;
  message?: string;
};

export type ResearchItem = {
  title: string;
  authors: string[];
  year?: number;
  source?: string;
  summary?: string;
  doi?: string;
  url?: string;
  openAccess?: boolean;
  provider: "OpenAlex" | "CORE" | "arXiv";
  citationCount?: number;
  publishedAt?: string;
  openAlexId?: string;
  arxivId?: string;
  adsBibcode?: string;
  paperType?: ScholarlyPaperType;
  isRetracted?: boolean;
  isPreprint?: boolean;
  isPeerReviewed?: boolean;
  concepts?: string[];
  keywords?: string[];
  sourceProviders?: string[];
  rawProviderIds?: Record<string, string>;
};

export const DEFAULT_TIMEOUT_MS = 7000;

export function source(name: string, provider: string, url?: string): SourceAttribution {
  return {
    name,
    provider,
    url,
    retrievedAt: new Date().toISOString(),
  };
}

export function ok<T>(data: T, attribution: SourceAttribution): DataSourceResult<T> {
  return {
    available: true,
    data,
    source: attribution,
  };
}

export function unavailable<T>(message: string, attribution: SourceAttribution): DataSourceResult<T> {
  return {
    available: false,
    data: null,
    source: attribution,
    message,
  };
}

export function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

export function compactText(value: unknown, maxLength = 900) {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : undefined;
}

export function compactList(values: Array<string | undefined>, limit = 6) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).slice(0, limit);
}

export function boundedLimit(value: string | null, fallback = 5, max = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

export function requireQuery(value: string | null, name = "query") {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${name} is required.`);
  }
  if (trimmed.length > 500 || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new Error(`${name} is invalid or too long.`);
  }
  return trimmed;
}

export function optionalCoordinate(value: string | null, fallback: number) {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Coordinate is invalid.");
  return parsed;
}

export async function fetchJson<T>(
  input: string | URL,
  options: ServerFetchOptions = {},
): Promise<T> {
  return serverFetchJson<T>(input, {
    timeoutMs: DEFAULT_TIMEOUT_MS,
    ...options,
  });
}

export async function fetchText(
  input: string | URL,
  options: ServerFetchOptions = {},
) {
  return serverFetchText(input, {
    timeoutMs: DEFAULT_TIMEOUT_MS,
    ...options,
  });
}

export function cleanServiceError(error: unknown, fallback = "Source temporarily unavailable.") {
  if (error instanceof ServerFetchError && error.status) {
    return `Source temporarily unavailable (${error.status}).`;
  }

  if (error instanceof Error && /required|not configured/i.test(error.message)) {
    return error.message;
  }

  return fallback;
}

export function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

export function textBetween(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : undefined;
}
