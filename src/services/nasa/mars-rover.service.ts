import {
  buildUrl,
  NASA_OPEN_API_BASE_URL,
  nasaFetch,
  withNasaApiKey,
} from "./nasa-fetch";
import type {
  MarsRoverManifestParams,
  MarsRoverPhotosParams,
  NasaFetchOptions,
} from "./nasa-types";

export async function getMarsRoverPhotos(
  params: MarsRoverPhotosParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_OPEN_API_BASE_URL,
    `/mars-photos/api/v1/rovers/${encodeURIComponent(params.rover)}/photos`,
    withNasaApiKey(
      {
        sol: params.sol,
        earth_date: params.earthDate,
        camera: params.camera,
        page: params.page,
      },
      options.apiKey,
    ),
  );

  return nasaFetch<unknown>(url, {
    cacheProfile: params.earthDate || params.sol !== undefined ? "archive" : "standard",
    tags: ["nasa", "nasa:mars-rover", `nasa:mars-rover:${params.rover}`],
    ...options,
  });
}

export async function getMarsRoverManifest(
  params: MarsRoverManifestParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_OPEN_API_BASE_URL,
    `/mars-photos/api/v1/manifests/${encodeURIComponent(params.rover)}`,
    withNasaApiKey({}, options.apiKey),
  );

  return nasaFetch<unknown>(url, {
    cacheProfile: "standard",
    tags: ["nasa", "nasa:mars-rover", `nasa:mars-rover:${params.rover}:manifest`],
    ...options,
  });
}
