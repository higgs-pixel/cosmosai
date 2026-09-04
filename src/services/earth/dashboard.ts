import "server-only";

import {
  getCoronalMassEjections,
  getGeomagneticStorms,
  getMarsRoverManifest,
  getNeoWsFeed,
  getSolarFlares,
  getTodaysApod,
  type ApodEntry,
} from "@/services/nasa";
import { getIssLocation, type IssLocation } from "./iss";
import { getNoaaPlanetaryKIndex, type PlanetaryKIndex } from "./space-weather";
import { getDefaultEarthWeather, type EarthWeather } from "./weather";
import type { EarthDashboardData } from "./types";

type NeoWsAsteroid = {
  name?: string;
  is_potentially_hazardous_asteroid?: boolean;
  close_approach_data?: Array<{
    miss_distance?: {
      kilometers?: string;
    };
  }>;
};

type NeoWsFeedResponse = {
  element_count?: number;
  near_earth_objects?: Record<string, NeoWsAsteroid[]>;
};

type MarsManifestResponse = {
  photo_manifest?: {
    name?: string;
    status?: string;
    latest_sol?: number;
    max_sol?: number;
    max_date?: string;
    total_photos?: number;
  };
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

async function settle<T>(task: Promise<T>) {
  try {
    return await task;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeApod(entry: ApodEntry | ApodEntry[] | null): EarthDashboardData["apod"] {
  const apod = Array.isArray(entry) ? entry[0] : entry;

  if (!apod) {
    return {
      title: "Awaiting NASA APOD Signal",
      date: todayIso(),
      sourceUrl: "/apod",
      isFallback: true,
    };
  }

  return {
    title: apod.title,
    date: apod.date,
    sourceUrl: apod.hdurl ?? apod.url ?? "/apod",
    isFallback: apod.service_version === "fallback",
  };
}

function normalizeAsteroids(feed: unknown): EarthDashboardData["asteroids"] {
  if (!isRecord(feed)) {
    return {
      total: 0,
      hazardous: 0,
      closestName: "Awaiting NeoWs",
      closestMissKm: null,
      isFallback: true,
    };
  }

  const response = feed as NeoWsFeedResponse;
  const asteroids = Object.values(response.near_earth_objects ?? {}).flat();
  const total = response.element_count ?? asteroids.length;
  const hazardous = asteroids.filter((asteroid) => asteroid.is_potentially_hazardous_asteroid).length;
  const closest = asteroids.reduce<{ name: string; missKm: number } | null>((current, asteroid) => {
    const missKm = Number(asteroid.close_approach_data?.[0]?.miss_distance?.kilometers ?? Number.POSITIVE_INFINITY);
    if (!Number.isFinite(missKm)) return current;
    if (!current || missKm < current.missKm) {
      return {
        name: asteroid.name?.replace(/[()]/g, "") ?? "Near-Earth object",
        missKm,
      };
    }

    return current;
  }, null);

  return {
    total,
    hazardous,
    closestName: closest?.name ?? "No close approach listed",
    closestMissKm: closest?.missKm ?? null,
    isFallback: false,
  };
}

function countEvents(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function normalizeMars(manifestValue: unknown): EarthDashboardData["mars"] {
  const manifest = isRecord(manifestValue) ? (manifestValue as MarsManifestResponse).photo_manifest : undefined;

  return {
    rover: manifest?.name ?? "Perseverance",
    status: manifest?.status ?? "active",
    latestSol: manifest?.latest_sol ?? manifest?.max_sol,
    latestEarthDate: manifest?.max_date,
    totalPhotos: manifest?.total_photos,
    isFallback: !manifest,
  };
}

function normalizeIss(value: IssLocation | null): EarthDashboardData["iss"] {
  if (!value) {
    return {
      latitude: null,
      longitude: null,
      altitudeKm: null,
      velocityKmh: null,
      isFallback: true,
    };
  }

  return {
    latitude: value.latitude,
    longitude: value.longitude,
    altitudeKm: value.altitudeKm,
    velocityKmh: value.velocityKmh,
    timestamp: value.timestamp,
    isFallback: false,
  };
}

function normalizeWeather(value: EarthWeather | null): EarthDashboardData["weather"] {
  if (!value) {
    return {
      locationName: "Delhi, India",
      temperatureC: null,
      cloudCoverPct: null,
      humidityPct: null,
      windSpeedKmh: null,
      timezone: "Unavailable",
      isFallback: true,
    };
  }

  return {
    locationName: value.locationName,
    temperatureC: value.temperatureC,
    cloudCoverPct: value.cloudCoverPct,
    humidityPct: value.humidityPct,
    windSpeedKmh: value.windSpeedKmh,
    observedAt: value.observedAt,
    timezone: value.timezone,
    isFallback: false,
  };
}

function buildRotationStatus(): EarthDashboardData["rotation"] {
  const now = new Date();
  const utcSeconds =
    now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds() + now.getUTCMilliseconds() / 1000;
  const siderealSeconds = 23 * 3600 + 56 * 60 + 4;

  return {
    siderealDay: "23h 56m 4s",
    currentUtc: now.toISOString(),
    progressPct: ((utcSeconds % siderealSeconds) / siderealSeconds) * 100,
  };
}

export async function getEarthDashboardData(): Promise<EarthDashboardData> {
  const date = todayIso();
  const weekStart = addDaysIso(date, -7);
  const [apod, asteroidFeed, flares, cmes, storms, kpIndex, issLocation, weather, marsManifest] = await Promise.all([
    settle(getTodaysApod()),
    settle(getNeoWsFeed({ startDate: date, endDate: date })),
    settle(getSolarFlares({ startDate: weekStart, endDate: date })),
    settle(getCoronalMassEjections({ startDate: weekStart, endDate: date })),
    settle(getGeomagneticStorms({ startDate: weekStart, endDate: date })),
    settle(getNoaaPlanetaryKIndex()),
    settle(getIssLocation()),
    settle(getDefaultEarthWeather()),
    settle(getMarsRoverManifest({ rover: "perseverance" })),
  ]);
  const noaaKp = kpIndex as PlanetaryKIndex | null;

  return {
    date,
    generatedAt: new Date().toISOString(),
    apod: normalizeApod(apod),
    asteroids: normalizeAsteroids(asteroidFeed),
    spaceWeather: {
      flares: countEvents(flares),
      cmes: countEvents(cmes),
      storms: countEvents(storms),
      latestKp: noaaKp?.kpIndex,
      kpObservedAt: noaaKp?.observedAt,
      isFallback: !Array.isArray(flares) && !Array.isArray(cmes) && !Array.isArray(storms) && !noaaKp,
    },
    iss: normalizeIss(issLocation),
    weather: normalizeWeather(weather),
    rotation: buildRotationStatus(),
    mars: normalizeMars(marsManifest),
  };
}
