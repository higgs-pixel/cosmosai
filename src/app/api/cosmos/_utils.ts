import { jsonError } from "@/lib/api-response";
import { boundedLimit, optionalCoordinate, requireQuery } from "@/lib/data-sources/shared";

export function parseLimit(searchParams: URLSearchParams, fallback = 5, max = 20) {
  return boundedLimit(searchParams.get("limit"), fallback, max);
}

export function parseQuery(searchParams: URLSearchParams, key = "query") {
  return requireQuery(searchParams.get(key), key);
}

export function parseCoordinates(searchParams: URLSearchParams, defaults = { latitude: 26.2183, longitude: 78.1828 }) {
  const latitude = optionalCoordinate(searchParams.get("latitude"), defaults.latitude);
  const longitude = optionalCoordinate(searchParams.get("longitude"), defaults.longitude);
  if (latitude < -90 || latitude > 90) throw new Error("latitude is invalid.");
  if (longitude < -180 || longitude > 180) throw new Error("longitude is invalid.");
  return { latitude, longitude };
}

export function cosmosApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "COSMOS data source is temporarily unavailable.";
  const status = /required|invalid|latitude|longitude|query/i.test(message) ? 400 : 503;
  return jsonError(status === 400 ? message : "COSMOS data source is temporarily unavailable.", {
    code: status === 400 ? "bad_request" : "service_unavailable",
    status,
  });
}
