import { getNasaApiKey } from "@/lib/env";
import { NasaApiError, type NasaRateLimit } from "./nasa-error";
import type { NasaCacheProfile, NasaFetchOptions } from "./nasa-types";

export const NASA_OPEN_API_BASE_URL = "https://api.nasa.gov";
export const NASA_IMAGE_LIBRARY_BASE_URL = "https://images-api.nasa.gov";

const CACHE_SECONDS: Record<NasaCacheProfile, number> = {
  realtime: 60,
  brief: 900,
  standard: 3600,
  archive: 86400,
};

type Primitive = string | number | boolean | undefined | null;

export function buildUrl(
  baseUrl: string,
  path: string,
  params: Record<string, Primitive | Primitive[]> = {},
) {
  const url = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      const filtered = value.filter((item) => item !== undefined && item !== null && item !== "");
      if (filtered.length > 0) url.searchParams.set(key, filtered.join(","));
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

export function withNasaApiKey(
  params: Record<string, Primitive | Primitive[]> = {},
  apiKey = getNasaApiKey(),
) {
  return {
    ...params,
    api_key: apiKey,
  };
}

export function readRateLimit(headers: Headers): NasaRateLimit {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");

  return {
    limit: limit ? Number(limit) : undefined,
    remaining: remaining ? Number(remaining) : undefined,
    reset: reset ?? undefined,
  };
}

async function parseResponseBody(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 5_000_000) {
    throw new NasaApiError("NASA response exceeded the safety limit.", { endpoint: response.url, status: 502 });
  }
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (text.length > 5_000_000) {
    throw new NasaApiError("NASA response exceeded the safety limit.", { endpoint: response.url, status: 502 });
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(text) as unknown;
  }

  return text;
}

export async function nasaFetch<T>(
  url: URL,
  options: NasaFetchOptions = {},
): Promise<T> {
  const cacheProfile = options.cacheProfile ?? "standard";

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: CACHE_SECONDS[cacheProfile],
        tags: options.tags,
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    throw new NasaApiError("NASA request failed before receiving a response.", {
      endpoint: url.toString(),
      details: error,
    });
  }

  const rateLimit = readRateLimit(response.headers);
  options.onRateLimit?.(rateLimit);

  if (
    rateLimit.remaining !== undefined &&
    rateLimit.limit !== undefined &&
    rateLimit.limit > 0 &&
    rateLimit.remaining / rateLimit.limit <= 0.1
  ) {
    console.warn("NASA API rate-limit remaining is below 10 percent.", {
      endpoint: url.toString(),
      rateLimit,
    });
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new NasaApiError("NASA API returned an error response.", {
      endpoint: url.toString(),
      status: response.status,
      statusText: response.statusText,
      rateLimit,
      details: body,
    });
  }

  return body as T;
}
