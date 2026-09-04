import "server-only";

import { env } from "@/lib/env";
import { fetchJson, parseNumber } from "./shared";

export type WeatherstackCurrent = {
  location: string;
  temperatureC?: number;
  feelsLikeC?: number;
  humidityPct?: number;
  windKph?: number;
  condition?: string;
  observationTime?: string;
  source: "Weatherstack";
};

type WeatherstackResponse = {
  location?: { name?: string; region?: string; country?: string; localtime?: string };
  current?: {
    temperature?: number;
    feelslike?: number;
    humidity?: number;
    wind_speed?: number;
    weather_descriptions?: string[];
    observation_time?: string;
  };
};

export async function getWeatherstackCurrent(location: string): Promise<WeatherstackCurrent | null> {
  if (!env.weatherstackApiKey) return null;

  const url = new URL("http://api.weatherstack.com/current");
  url.searchParams.set("access_key", env.weatherstackApiKey);
  url.searchParams.set("query", location);

  const response = await fetchJson<WeatherstackResponse>(url, {
    revalidate: 1200,
    tags: ["cosmos", "weather", "weatherstack"],
  });
  const place = [response.location?.name, response.location?.region, response.location?.country].filter(Boolean).join(", ");

  return {
    location: place || location,
    temperatureC: parseNumber(response.current?.temperature),
    feelsLikeC: parseNumber(response.current?.feelslike),
    humidityPct: parseNumber(response.current?.humidity),
    windKph: parseNumber(response.current?.wind_speed),
    condition: response.current?.weather_descriptions?.[0],
    observationTime: response.current?.observation_time ?? response.location?.localtime,
    source: "Weatherstack",
  };
}
