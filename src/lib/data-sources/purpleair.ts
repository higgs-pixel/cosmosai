import "server-only";

import { env } from "@/lib/env";
import { fetchJson, parseNumber } from "./shared";

export type PurpleAirSummary = {
  pm25?: number;
  aqiEstimate?: number;
  nearestSensor?: string;
  sensorCount: number;
  lastUpdated?: string;
  source: "PurpleAir";
};

type PurpleAirResponse = {
  fields?: string[];
  data?: unknown[][];
};

function pm25ToAqi(pm25?: number) {
  if (pm25 === undefined) return undefined;
  if (pm25 <= 12) return Math.round((50 / 12) * pm25);
  if (pm25 <= 35.4) return Math.round(50 + ((100 - 50) / (35.4 - 12.1)) * (pm25 - 12.1));
  if (pm25 <= 55.4) return Math.round(101 + ((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5));
  return Math.round(151 + Math.min(149, pm25 - 55.5));
}

export async function getPurpleAirQuality(latitude: number, longitude: number, radiusMeters = 10_000): Promise<PurpleAirSummary | null> {
  if (!env.purpleAirApiKey) return null;

  const url = new URL("https://api.purpleair.com/v1/sensors");
  url.searchParams.set("fields", "name,pm2.5_atm,last_seen,latitude,longitude");
  url.searchParams.set("location_type", "0");
  url.searchParams.set("max_age", "3600");
  url.searchParams.set("nwlng", String(longitude - 0.15));
  url.searchParams.set("nwlat", String(latitude + 0.15));
  url.searchParams.set("selng", String(longitude + 0.15));
  url.searchParams.set("selat", String(latitude - 0.15));
  void radiusMeters;

  const response = await fetchJson<PurpleAirResponse>(url, {
    revalidate: 600,
    tags: ["cosmos", "air-quality", "purpleair"],
    headers: {
      "X-API-Key": env.purpleAirApiKey,
    },
  });
  const fields = response.fields ?? [];
  const pmIndex = fields.indexOf("pm2.5_atm");
  const nameIndex = fields.indexOf("name");
  const lastSeenIndex = fields.indexOf("last_seen");
  const first = response.data?.[0];
  const pm25 = first ? parseNumber(first[pmIndex]) : undefined;
  const lastSeen = first && lastSeenIndex >= 0 ? parseNumber(first[lastSeenIndex]) : undefined;

  return {
    pm25,
    aqiEstimate: pm25ToAqi(pm25),
    nearestSensor: first && nameIndex >= 0 && typeof first[nameIndex] === "string" ? first[nameIndex] : undefined,
    sensorCount: response.data?.length ?? 0,
    lastUpdated: lastSeen ? new Date(lastSeen * 1000).toISOString() : undefined,
    source: "PurpleAir",
  };
}
