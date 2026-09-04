import { NextResponse } from "next/server";
import { OpenAlexError, type OpenAlexSearchType } from "@/lib/openalex";

const VALID_SEARCH_TYPES = new Set<OpenAlexSearchType>(["papers", "authors", "institutions", "topics", "all"]);
const VALID_SORTS = new Set(["cited_by_count:desc", "publication_year:desc", "publication_year:asc"]);

export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status },
  );
}

export function handleOpenAlexRouteError(error: unknown) {
  if (error instanceof OpenAlexError) {
    return jsonError("OpenAlex research data is temporarily unavailable.", error.status && error.status < 500 ? error.status : 502);
  }

  console.error({
    scope: "cosmos-openalex-api",
    event: "route_error",
    errorName: error instanceof Error ? error.name : "UnknownError",
  });

  return jsonError("OpenAlex research data is temporarily unavailable.", 502);
}

export function readQueryParam(params: URLSearchParams, key: string, maxLength: number) {
  const value = params.get(key)?.trim();
  if (!value) return undefined;
  return value.length <= maxLength ? value : undefined;
}

export function readPositiveInteger(params: URLSearchParams, key: string, fallback: number, max: number) {
  const raw = params.get(key);
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
}

export function readYear(params: URLSearchParams, key: string) {
  const raw = params.get(key);
  if (!raw) return undefined;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return undefined;

  const year = Math.floor(parsed);
  const maxYear = new Date().getFullYear() + 1;
  return year >= 1800 && year <= maxYear ? year : undefined;
}

export function readSearchType(params: URLSearchParams) {
  const raw = params.get("type")?.trim();
  if (!raw) return "papers" satisfies OpenAlexSearchType;
  return VALID_SEARCH_TYPES.has(raw as OpenAlexSearchType) ? (raw as OpenAlexSearchType) : undefined;
}

export function readOpenAlexSort(params: URLSearchParams) {
  const raw = params.get("sort")?.trim();
  if (!raw) return undefined;
  return VALID_SORTS.has(raw) ? raw : undefined;
}
