import { serverFetchJson } from "@/lib/server-fetch";

export type IssLocation = {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  timestamp: string;
};

type WhereTheIssResponse = {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  velocity?: number;
  timestamp?: number;
};

const ISS_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const EARTH_REVALIDATE_SECONDS = 600;
const EARTH_TIMEOUT_MS = 4500;

function requireNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`ISS response missing ${label}.`);
  }

  return value;
}

export async function getIssLocation(): Promise<IssLocation> {
  const payload = await serverFetchJson<WhereTheIssResponse>(ISS_URL, {
    revalidate: EARTH_REVALIDATE_SECONDS,
    tags: ["earth", "earth:iss"],
    timeoutMs: EARTH_TIMEOUT_MS,
  });
  const timestamp = requireNumber(payload.timestamp, "timestamp");

  return {
    latitude: requireNumber(payload.latitude, "latitude"),
    longitude: requireNumber(payload.longitude, "longitude"),
    altitudeKm: requireNumber(payload.altitude, "altitude"),
    velocityKmh: requireNumber(payload.velocity, "velocity"),
    timestamp: new Date(timestamp * 1000).toISOString(),
  };
}
