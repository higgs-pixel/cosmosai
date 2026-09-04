import {
  buildUrl,
  NASA_OPEN_API_BASE_URL,
  nasaFetch,
  withNasaApiKey,
} from "./nasa-fetch";
import type {
  NeoWsBrowseParams,
  NeoWsFeedParams,
  NeoWsLookupParams,
  NasaFetchOptions,
} from "./nasa-types";

export async function getNeoWsFeed(
  params: NeoWsFeedParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_OPEN_API_BASE_URL,
    "/neo/rest/v1/feed",
    withNasaApiKey(
      {
        start_date: params.startDate,
        end_date: params.endDate,
      },
      options.apiKey,
    ),
  );

  return nasaFetch<unknown>(url, {
    cacheProfile: "brief",
    tags: ["nasa", "nasa:neows", "nasa:neows:feed"],
    ...options,
  });
}

export async function getNeoWsAsteroid(
  params: NeoWsLookupParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_OPEN_API_BASE_URL,
    `/neo/rest/v1/neo/${encodeURIComponent(params.asteroidId)}`,
    withNasaApiKey({}, options.apiKey),
  );

  return nasaFetch<unknown>(url, {
    cacheProfile: "archive",
    tags: ["nasa", "nasa:neows", `nasa:neows:${params.asteroidId}`],
    ...options,
  });
}

export async function browseNeoWsAsteroids(
  params: NeoWsBrowseParams = {},
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_OPEN_API_BASE_URL,
    "/neo/rest/v1/neo/browse",
    withNasaApiKey(
      {
        page: params.page,
        size: params.size,
      },
      options.apiKey,
    ),
  );

  return nasaFetch<unknown>(url, {
    cacheProfile: "standard",
    tags: ["nasa", "nasa:neows", "nasa:neows:browse"],
    ...options,
  });
}
