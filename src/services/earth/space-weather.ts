import { serverFetchJson } from "@/lib/server-fetch";

export type PlanetaryKIndex = {
  kpIndex: number;
  observedAt?: string;
  source: "NOAA SWPC";
};

const NOAA_KP_PRODUCTS_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
const NOAA_KP_ONE_MINUTE_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const EARTH_REVALIDATE_SECONDS = 600;
const EARTH_TIMEOUT_MS = 4500;

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function parseProductRows(value: unknown): PlanetaryKIndex | null {
  if (!Array.isArray(value) || value.length < 2) return null;

  const rows = value.slice(1).filter(Array.isArray) as unknown[][];
  for (const row of rows.reverse()) {
    const kpIndex = parseNumber(row[1] ?? row[2]);
    if (kpIndex === null) continue;

    return {
      kpIndex,
      observedAt: normalizeDate(row[0]),
      source: "NOAA SWPC",
    };
  }

  return null;
}

function parseOneMinuteRows(value: unknown): PlanetaryKIndex | null {
  if (!Array.isArray(value)) return null;

  for (const row of [...value].reverse()) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    const kpIndex = parseNumber(record.kp_index ?? record.kp ?? record.Kp);
    if (kpIndex === null) continue;

    return {
      kpIndex,
      observedAt: normalizeDate(record.time_tag ?? record.time ?? record.observed_at),
      source: "NOAA SWPC",
    };
  }

  return null;
}

export async function getNoaaPlanetaryKIndex(): Promise<PlanetaryKIndex> {
  try {
    const productRows = await serverFetchJson<unknown>(NOAA_KP_PRODUCTS_URL, {
      revalidate: EARTH_REVALIDATE_SECONDS,
      tags: ["earth", "earth:space-weather", "earth:noaa-kp"],
      timeoutMs: EARTH_TIMEOUT_MS,
    });
    const parsed = parseProductRows(productRows);
    if (parsed) return parsed;
  } catch {
    // Try the one-minute JSON feed below before surfacing a clean fallback to the caller.
  }

  const oneMinuteRows = await serverFetchJson<unknown>(NOAA_KP_ONE_MINUTE_URL, {
    revalidate: EARTH_REVALIDATE_SECONDS,
    tags: ["earth", "earth:space-weather", "earth:noaa-kp"],
    timeoutMs: EARTH_TIMEOUT_MS,
  });
  const parsed = parseOneMinuteRows(oneMinuteRows);
  if (!parsed) {
    throw new Error("NOAA SWPC Kp response did not include a usable Kp value.");
  }

  return parsed;
}
