import "server-only";

import { env } from "@/lib/env";
import { fetchJson, parseNumber } from "./shared";

export type AstroWeather = {
  cloudCover?: number;
  seeing?: number;
  transparency?: number;
  precipitation?: string;
  wind?: string;
  bestObservationWindow?: string;
  source: "7Timer";
};

type SevenTimerResponse = {
  dataseries?: Array<{
    timepoint?: number;
    cloudcover?: number;
    seeing?: number;
    transparency?: number;
    prec_type?: string;
    wind10m?: { direction?: string; speed?: number };
  }>;
};

export async function getSevenTimerAstroWeather(latitude: number, longitude: number): Promise<AstroWeather> {
  const url = new URL(`${env.sevenTimerBaseUrl.replace(/\/$/, "")}/bin/api.pl`);
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("product", "astro");
  url.searchParams.set("output", "json");

  const response = await fetchJson<SevenTimerResponse>(url, {
    revalidate: 7200,
    tags: ["cosmos", "astro-weather", "seven-timer"],
  });
  const windows = response.dataseries ?? [];
  const best = windows
    .map((window) => ({
      window,
      score: (10 - (parseNumber(window.cloudcover) ?? 10)) + (parseNumber(window.transparency) ?? 0) + (parseNumber(window.seeing) ?? 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.window;

  return {
    cloudCover: parseNumber(best?.cloudcover),
    seeing: parseNumber(best?.seeing),
    transparency: parseNumber(best?.transparency),
    precipitation: best?.prec_type,
    wind: best?.wind10m ? `${best.wind10m.direction ?? "variable"} ${best.wind10m.speed ?? "?"}` : undefined,
    bestObservationWindow: best?.timepoint !== undefined ? `T+${best.timepoint}h` : undefined,
    source: "7Timer",
  };
}
