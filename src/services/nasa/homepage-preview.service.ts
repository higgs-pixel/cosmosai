import { safeExternalUrl } from "../../lib/security/safe-url.ts";
import type { ApodEntry, ApodParams } from "./nasa-types.ts";

const HOMEPAGE_PREVIEW_COUNT = 6;
const HOMEPAGE_APOD_RANGE_DAYS = 30;
const TRUSTED_NASA_IMAGE_HOSTS = new Set([
  "apod.nasa.gov",
  "images-assets.nasa.gov",
  "mars.nasa.gov",
  "photojournal.jpl.nasa.gov",
  "www.nasa.gov",
]);

export type HomeNasaPreview = {
  id: string;
  date: string;
  title: string;
  imageUrl: string;
  sourceUrl: string;
  attribution: string;
  mediaType: "image";
};

export type HomeNasaPreviewSlot = HomeNasaPreview | null;

type HomepageApodFetcher = (
  params: ApodParams,
) => Promise<ApodEntry | ApodEntry[]>;

type HomepageImageLibraryFetcher = () => Promise<unknown>;

async function fetchHomepageApod(params: ApodParams) {
  const { getApod } = await import("./apod.service.ts");
  return getApod(params);
}

async function fetchHomepageImageLibrary() {
  const { searchNasaImages } = await import("./image-library.service.ts");
  return searchNasaImages({
    q: "space",
    mediaType: ["image"],
    pageSize: 18,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function trustedNasaImageUrl(value: string | undefined) {
  const safeUrl = safeExternalUrl(value);
  if (!safeUrl) return undefined;

  try {
    const parsed = new URL(safeUrl);
    return TRUSTED_NASA_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function apodSourceUrl(date: string) {
  const compactDate = `${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}`;
  return `https://apod.nasa.gov/apod/ap${compactDate}.html`;
}

export function normalizeHomepageNasaPreviews(entries: readonly ApodEntry[]) {
  const ordered = [...entries].sort((left, right) => right.date.localeCompare(left.date));
  const seenDates = new Set<string>();
  const previews: HomeNasaPreview[] = [];

  for (const entry of ordered) {
    if (previews.length >= HOMEPAGE_PREVIEW_COUNT) break;
    if (!isIsoDate(entry.date) || seenDates.has(entry.date)) continue;

    const candidateUrl = entry.media_type === "video" ? entry.thumbnail_url : entry.url;
    const imageUrl = trustedNasaImageUrl(candidateUrl);
    const title = entry.title.trim();
    if (!imageUrl || !title) continue;

    seenDates.add(entry.date);
    previews.push({
      id: `apod-${entry.date}`,
      date: entry.date,
      title,
      imageUrl,
      sourceUrl: apodSourceUrl(entry.date),
      attribution: entry.copyright?.trim() || "NASA",
      mediaType: "image",
    });
  }

  return previews;
}

export function normalizeHomepageNasaLibraryPreviews(value: unknown) {
  if (!isRecord(value) || !isRecord(value.collection) || !Array.isArray(value.collection.items)) {
    return [];
  }

  const previews: HomeNasaPreview[] = [];
  const seenIds = new Set<string>();

  for (const item of value.collection.items) {
    if (previews.length >= HOMEPAGE_PREVIEW_COUNT || !isRecord(item)) break;
    const data = Array.isArray(item.data) && isRecord(item.data[0]) ? item.data[0] : undefined;
    const previewLink = Array.isArray(item.links)
      ? item.links.find((link) =>
        isRecord(link) &&
        link.rel === "preview" &&
        link.render === "image" &&
        typeof link.href === "string"
      )
      : undefined;
    const nasaId = typeof data?.nasa_id === "string" ? data.nasa_id.trim() : "";
    const title = typeof data?.title === "string" ? data.title.trim() : "";
    const createdAt = typeof data?.date_created === "string" ? data.date_created.slice(0, 10) : "";
    const imageUrl = trustedNasaImageUrl(
      isRecord(previewLink) && typeof previewLink.href === "string"
        ? previewLink.href
        : undefined,
    );
    const center = typeof data?.center === "string" ? data.center.trim() : "";

    if (!nasaId || seenIds.has(nasaId) || !title || !isIsoDate(createdAt) || !imageUrl) continue;
    seenIds.add(nasaId);
    previews.push({
      id: `nasa-${nasaId}`,
      date: createdAt,
      title,
      imageUrl,
      sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`,
      attribution: center ? `NASA / ${center}` : "NASA",
      mediaType: "image",
    });
  }

  return previews;
}

export function createHomepageNasaSlots(
  previews: readonly HomeNasaPreview[],
): HomeNasaPreviewSlot[] {
  return Array.from(
    { length: HOMEPAGE_PREVIEW_COUNT },
    (_, index) => previews[index] ?? null,
  );
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function getHomepageNasaPreviews({
  now = new Date(),
  fetchApod = fetchHomepageApod,
  fetchImageLibrary = fetchHomepageImageLibrary,
}: {
  now?: Date;
  fetchApod?: HomepageApodFetcher;
  fetchImageLibrary?: HomepageImageLibraryFetcher;
} = {}) {
  const endDate = new Date(now);
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() - (HOMEPAGE_APOD_RANGE_DAYS - 1));

  let previews: HomeNasaPreview[] = [];
  try {
    const response = await fetchApod({
      startDate: isoDate(startDate),
      endDate: isoDate(endDate),
      thumbs: true,
    });
    previews = normalizeHomepageNasaPreviews(Array.isArray(response) ? response : [response]);
  } catch {}

  if (previews.length >= HOMEPAGE_PREVIEW_COUNT) return previews;

  try {
    const fallbackPreviews = normalizeHomepageNasaLibraryPreviews(
      await fetchImageLibrary(),
    );
    const seenImages = new Set(previews.map(({ imageUrl }) => imageUrl));
    return [...previews, ...fallbackPreviews.filter(({ imageUrl }) => !seenImages.has(imageUrl))]
      .slice(0, HOMEPAGE_PREVIEW_COUNT);
  } catch {
    return previews;
  }
}
