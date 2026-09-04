import {
  buildUrl,
  NASA_OPEN_API_BASE_URL,
  nasaFetch,
  withNasaApiKey,
} from "./nasa-fetch";
import type { DonkiParams, NasaFetchOptions } from "./nasa-types";

export async function getDonkiEvents(
  params: DonkiParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_OPEN_API_BASE_URL,
    `/DONKI/${params.type}`,
    withNasaApiKey(
      {
        startDate: params.startDate,
        endDate: params.endDate,
      },
      options.apiKey,
    ),
  );

  return nasaFetch<unknown>(url, {
    cacheProfile: "brief",
    tags: ["nasa", "nasa:donki", `nasa:donki:${params.type}`],
    ...options,
  });
}

export async function getSolarFlares(
  params: Omit<DonkiParams, "type"> = {},
  options: NasaFetchOptions = {},
) {
  return getDonkiEvents({ ...params, type: "FLR" }, options);
}

export async function getCoronalMassEjections(
  params: Omit<DonkiParams, "type"> = {},
  options: NasaFetchOptions = {},
) {
  return getDonkiEvents({ ...params, type: "CME" }, options);
}

export async function getGeomagneticStorms(
  params: Omit<DonkiParams, "type"> = {},
  options: NasaFetchOptions = {},
) {
  return getDonkiEvents({ ...params, type: "GST" }, options);
}
