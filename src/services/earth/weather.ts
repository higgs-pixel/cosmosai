import { serverFetchJson } from "@/lib/server-fetch";

export type EarthWeather = {
  locationName: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  cloudCoverPct: number;
  humidityPct: number;
  windSpeedKmh: number;
  observedAt: string;
  timezone?: string;
};

type OpenMeteoResponse = {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
  };
};

export const DEFAULT_LATITUDE = 28.61;
export const DEFAULT_LONGITUDE = 77.2;
export const DEFAULT_LOCATION = "Delhi, India";
const EARTH_REVALIDATE_SECONDS = 900;
const EARTH_TIMEOUT_MS = 4500;

type EarthWeatherRequest = {
  latitude?: number;
  longitude?: number;
  locationName?: string;
};

function buildOpenMeteoUrl(latitude = DEFAULT_LATITUDE, longitude = DEFAULT_LONGITUDE) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m");
  url.searchParams.set("timezone", "auto");
  return url;
}

function requireNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Open-Meteo response missing ${label}.`);
  }

  return value;
}

export async function getEarthWeather({
  latitude = DEFAULT_LATITUDE,
  longitude = DEFAULT_LONGITUDE,
  locationName = DEFAULT_LOCATION,
}: EarthWeatherRequest = {}): Promise<EarthWeather> {
  const payload = await serverFetchJson<OpenMeteoResponse>(buildOpenMeteoUrl(latitude, longitude), {
    revalidate: EARTH_REVALIDATE_SECONDS,
    tags: ["earth", "earth:weather"],
    timeoutMs: EARTH_TIMEOUT_MS,
  });
  const current = payload.current;

  if (!current?.time) {
    throw new Error("Open-Meteo response missing current time.");
  }

  return {
    locationName,
    latitude,
    longitude,
    temperatureC: requireNumber(current.temperature_2m, "temperature"),
    cloudCoverPct: requireNumber(current.cloud_cover, "cloud cover"),
    humidityPct: requireNumber(current.relative_humidity_2m, "humidity"),
    windSpeedKmh: requireNumber(current.wind_speed_10m, "wind speed"),
    observedAt: new Date(current.time.endsWith("Z") ? current.time : `${current.time}Z`).toISOString(),
    timezone: payload.timezone,
  };
}

export async function getDefaultEarthWeather(): Promise<EarthWeather> {
  return getEarthWeather();
}
