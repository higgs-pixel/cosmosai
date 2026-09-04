import "server-only";

import { env } from "@/lib/env";
import { fetchJson, parseNumber } from "./shared";

export type EarthquakeEvent = {
  magnitude?: number;
  place?: string;
  time?: string;
  coordinates?: [number, number, number?];
  url?: string;
  source: "USGS";
};

type UsgsGeoJson = {
  features?: Array<{
    properties?: { mag?: number; place?: string; time?: number; url?: string };
    geometry?: { coordinates?: [number, number, number?] };
  }>;
};

export async function getRecentEarthquakes(limit = 8): Promise<EarthquakeEvent[]> {
  const url = `${env.usgsEarthquakeBaseUrl.replace(/\/$/, "")}/earthquakes/feed/v1.0/summary/2.5_day.geojson`;
  const response = await fetchJson<UsgsGeoJson>(url, {
    revalidate: 600,
    tags: ["cosmos", "earth", "earthquakes"],
  });

  return (response.features ?? []).slice(0, limit).map((feature) => ({
    magnitude: parseNumber(feature.properties?.mag),
    place: feature.properties?.place,
    time: feature.properties?.time ? new Date(feature.properties.time).toISOString() : undefined,
    coordinates: feature.geometry?.coordinates,
    url: feature.properties?.url,
    source: "USGS" as const,
  }));
}
