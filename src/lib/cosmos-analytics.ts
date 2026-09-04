"use client";

type AnalyticsValue = string | number | boolean | null;
type AnalyticsPayload = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    va?: (event: "event", payload: { name: string; data?: AnalyticsPayload }) => void;
    vaq?: unknown[];
  }
}

function sanitizeText(value: string, maxLength = 72) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s:/?.#-]/g, "")
    .slice(0, maxLength);
}

export function trackCosmosEvent(name: string, data: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    name: sanitizeText(name, 48),
    data,
  };

  if (window.va) {
    window.va("event", payload);
    return;
  }

  window.vaq = window.vaq || [];
  window.vaq.push(["event", payload]);
}

export function trackImageExplorerSearch({
  query,
  mediaType,
  center,
  yearStart,
  yearEnd,
  source,
}: {
  query: string;
  mediaType: string;
  center?: string;
  yearStart?: string;
  yearEnd?: string;
  source: "instant" | "editorial" | "url";
}) {
  trackCosmosEvent("image_explorer_search", {
    query: sanitizeText(query),
    mediaType: sanitizeText(mediaType, 20),
    center: center ? sanitizeText(center, 24) : null,
    yearStart: yearStart ? sanitizeText(yearStart, 4) : null,
    yearEnd: yearEnd ? sanitizeText(yearEnd, 4) : null,
    source,
  });
}

export function trackPlanetCardClick(planet: string, source: "homepage" | "solar_system") {
  trackCosmosEvent("planet_card_click", {
    planet: sanitizeText(planet, 24).toLowerCase(),
    source,
  });
}
