import { NextResponse } from "next/server";
import { SecurityHttpError } from "@/lib/security/auth";
import { isNasaApiError, type NasaFetchOptions, type NasaRateLimit } from "@/services/nasa";

export function createNasaRouteContext() {
  let rateLimit: NasaRateLimit | undefined;

  const options: NasaFetchOptions = {
    onRateLimit: (nextRateLimit) => {
      rateLimit = nextRateLimit;
    },
  };

  return {
    options,
    json<T>(data: T) {
      const response = NextResponse.json(data);

      if (rateLimit?.limit !== undefined) {
        response.headers.set("x-cosmos-nasa-ratelimit-limit", String(rateLimit.limit));
      }

      if (rateLimit?.remaining !== undefined) {
        response.headers.set("x-cosmos-nasa-ratelimit-remaining", String(rateLimit.remaining));
      }

      if (rateLimit?.reset) {
        response.headers.set("x-cosmos-nasa-ratelimit-reset", rateLimit.reset);
      }

      return response;
    },
  };
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof SecurityHttpError) {
    return NextResponse.json({ error: { message: error.publicMessage, code: error.code } }, { status: error.status });
  }
  if (isNasaApiError(error)) {
    return NextResponse.json(
      {
        error: {
          message: "NASA data is temporarily unavailable.",
          code: "nasa_service_unavailable",
          rateLimit: error.rateLimit,
        },
      },
      { status: error.status ?? 502 },
    );
  }

  return NextResponse.json(
    {
      error: {
        message: "NASA data is temporarily unavailable.",
        code: "nasa_service_unavailable",
      },
    },
    { status: 503 },
  );
}

export function optionalNumber(value: string | null, min = 0, max = 10_000) {
  if (!value) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new SecurityHttpError(400, "A numeric parameter is outside its allowed range.", "INVALID_NUMBER");
  }
  return parsed;
}

export function optionalBoolean(value: string | null) {
  if (value === null) return undefined;
  if (!["true", "false", "1", "0"].includes(value)) {
    throw new SecurityHttpError(400, "A boolean parameter is invalid.", "INVALID_BOOLEAN");
  }
  return value === "true" || value === "1";
}

export function optionalText(value: string | null, maxLength = 500) {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new SecurityHttpError(400, "A text parameter is invalid.", "INVALID_TEXT");
  }
  return trimmed;
}

export function optionalIsoDate(value: string | null) {
  const date = optionalText(value, 10);
  if (date === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new SecurityHttpError(400, "A date parameter must use YYYY-MM-DD.", "INVALID_DATE");
  }
  return date;
}

export function optionalCsv(value: string | null) {
  if (!value) return undefined;
  if (value.length > 2_000) throw new SecurityHttpError(400, "A list parameter is too long.", "INVALID_LIST");

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((item) => item.slice(0, 100));
}
