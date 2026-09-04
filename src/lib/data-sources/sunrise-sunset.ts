import "server-only";

import { env } from "@/lib/env";
import { fetchJson } from "./shared";

export type SunriseSunsetSummary = {
  sunrise?: string;
  sunset?: string;
  dayLength?: string;
  solarNoon?: string;
  civilTwilightBegin?: string;
  civilTwilightEnd?: string;
  source: "Sunrise-Sunset";
};

type SunriseSunsetResponse = {
  results?: {
    sunrise?: string;
    sunset?: string;
    day_length?: string;
    solar_noon?: string;
    civil_twilight_begin?: string;
    civil_twilight_end?: string;
  };
};

export async function getSunriseSunset(latitude: number, longitude: number): Promise<SunriseSunsetSummary> {
  const url = new URL(`${env.sunriseSunsetBaseUrl.replace(/\/$/, "")}/json`);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lng", String(longitude));
  url.searchParams.set("formatted", "0");

  const response = await fetchJson<SunriseSunsetResponse>(url, {
    revalidate: 43200,
    tags: ["cosmos", "sunrise-sunset"],
  });

  return {
    sunrise: response.results?.sunrise,
    sunset: response.results?.sunset,
    dayLength: response.results?.day_length,
    solarNoon: response.results?.solar_noon,
    civilTwilightBegin: response.results?.civil_twilight_begin,
    civilTwilightEnd: response.results?.civil_twilight_end,
    source: "Sunrise-Sunset",
  };
}
