import "server-only";

import { env } from "@/lib/env";
import { fetchJson, parseNumber } from "./shared";

export type OpenMeteoCurrent = {
  latitude: number;
  longitude: number;
  temperatureC?: number;
  humidityPct?: number;
  windKph?: number;
  cloudCoverPct?: number;
  precipitationProbabilityPct?: number;
  visibilityMeters?: number;
  observedAt?: string;
  source: "Open-Meteo";
};

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  current?: Record<string, unknown>;
};

export async function getOpenMeteoForecast(latitude: number, longitude: number): Promise<OpenMeteoCurrent> {
  const url = new URL(`${env.openMeteoBaseUrl.replace(/\/$/, "")}/v1/forecast`);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,precipitation,visibility");
  url.searchParams.set("hourly", "precipitation_probability");
  url.searchParams.set("timezone", "auto");

  const response = await fetchJson<OpenMeteoResponse>(url, {
    revalidate: 1200,
    tags: ["cosmos", "weather", "open-meteo"],
  });
  const current = response.current ?? {};

  return {
    latitude: response.latitude ?? latitude,
    longitude: response.longitude ?? longitude,
    temperatureC: parseNumber(current.temperature_2m),
    humidityPct: parseNumber(current.relative_humidity_2m),
    windKph: parseNumber(current.wind_speed_10m),
    cloudCoverPct: parseNumber(current.cloud_cover),
    precipitationProbabilityPct: parseNumber(current.precipitation),
    visibilityMeters: parseNumber(current.visibility),
    observedAt: typeof current.time === "string" ? current.time : undefined,
    source: "Open-Meteo",
  };
}
