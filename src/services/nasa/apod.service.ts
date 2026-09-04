import {
  buildUrl,
  NASA_OPEN_API_BASE_URL,
  nasaFetch,
  withNasaApiKey,
} from "./nasa-fetch";
import type { ApodEntry, ApodParams, NasaFetchOptions } from "./nasa-types";

export async function getApod(
  params: ApodParams = {},
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_OPEN_API_BASE_URL,
    "/planetary/apod",
    withNasaApiKey(
      {
        date: params.date,
        start_date: params.startDate,
        end_date: params.endDate,
        count: params.count,
        thumbs: params.thumbs,
      },
      options.apiKey,
    ),
  );

  return nasaFetch<ApodEntry | ApodEntry[]>(url, {
    cacheProfile: params.date || params.startDate || params.endDate ? "archive" : "brief",
    tags: ["nasa", "nasa:apod"],
    ...options,
  });
}

export async function getTodaysApod(options: NasaFetchOptions = {}) {
  return getApod({ thumbs: true }, options);
}
