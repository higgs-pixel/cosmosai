export type NasaImageResolutionFailure =
  | "manifest_unavailable"
  | "no_supported_asset"
  | "invalid_media_url"
  | "image_host_not_allowed"
  | "provider_timeout";

export type ResolvedNasaImage = {
  previewUrl: string | null;
  originalUrl?: string | null;
  width?: number;
  height?: number;
  source: "search-preview" | "asset-manifest" | "fallback";
  failureCategory?: NasaImageResolutionFailure;
};

export type NasaImageLink = {
  href?: string;
  rel?: string;
  render?: string;
  width?: number;
  height?: number;
};

export type NasaImageSearchItem = {
  href?: string;
  data?: Array<{
    nasa_id?: string;
    media_type?: string;
    [key: string]: unknown;
  }>;
  links?: NasaImageLink[];
  resolvedImage?: ResolvedNasaImage;
  [key: string]: unknown;
};

export type NasaImageSearchResponse = {
  collection?: {
    items?: NasaImageSearchItem[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ResolveOptions = {
  fetchManifest: (nasaId: string) => Promise<unknown>;
  timeoutMs?: number;
  onFailure?: (failure: {
    nasaId: string;
    category: NasaImageResolutionFailure;
    sourceHost?: string;
    status?: number;
  }) => void;
};

type NormalizedNasaImageUrl =
  | { ok: true; url: string; extension: "jpg" | "jpeg" | "png" }
  | { ok: false; reason: "invalid_media_url" | "image_host_not_allowed" | "no_supported_asset" };

type SelectedNasaImageAsset = {
  url: string;
  width?: number;
  height?: number;
};

const NASA_IMAGE_ASSET_HOSTS = new Set(["images-assets.nasa.gov"]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);
const DEFAULT_MANIFEST_TIMEOUT_MS = 7_500;
const MAX_RESOLUTION_CONCURRENCY = 4;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extensionFromPath(pathname: string) {
  const extension = pathname.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_IMAGE_EXTENSIONS.has(extension)
    ? extension as "jpg" | "jpeg" | "png"
    : null;
}

export function normalizeNasaImageUrl(input: string | null | undefined): NormalizedNasaImageUrl {
  if (!input || input.startsWith("//") || /[\u0000-\u001f\u007f]/.test(input)) {
    return { ok: false, reason: "invalid_media_url" };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "invalid_media_url" };
  }

  if (url.username || url.password || (url.protocol !== "https:" && url.protocol !== "http:")) {
    return { ok: false, reason: "invalid_media_url" };
  }
  if (!NASA_IMAGE_ASSET_HOSTS.has(url.hostname.toLowerCase())) {
    return { ok: false, reason: "image_host_not_allowed" };
  }

  const extension = extensionFromPath(url.pathname);
  if (!extension) return { ok: false, reason: "no_supported_asset" };

  url.protocol = "https:";
  url.hash = "";
  return { ok: true, url: url.toString(), extension };
}

function previewRank(url: string, extension: "jpg" | "jpeg" | "png") {
  const path = new URL(url).pathname.toLowerCase();
  const formatPenalty = extension === "png" ? 20 : 0;
  if (/~small\./.test(path)) return formatPenalty;
  if (/~medi(?:um)?\./.test(path)) return formatPenalty + 1;
  if (/~thumb\./.test(path)) return formatPenalty + 2;
  if (/~large\./.test(path)) return formatPenalty + 3;
  if (/~orig\./.test(path)) return formatPenalty + 8;
  return formatPenalty + 5;
}

function originalRank(url: string, extension: "jpg" | "jpeg" | "png") {
  const path = new URL(url).pathname.toLowerCase();
  const formatPenalty = extension === "png" ? 1 : 0;
  if (/~orig\./.test(path)) return formatPenalty;
  if (/~large\./.test(path)) return 2 + formatPenalty;
  if (/~medi(?:um)?\./.test(path)) return 4 + formatPenalty;
  if (/~small\./.test(path)) return 6 + formatPenalty;
  return 8 + formatPenalty;
}

function normalizedCandidates(links: NasaImageLink[]) {
  return links.flatMap((link) => {
    const normalized = normalizeNasaImageUrl(link.href);
    if (!normalized.ok) return [];
    return [{ link, ...normalized }];
  });
}

export function selectBestNasaImageAsset(links: NasaImageLink[]): SelectedNasaImageAsset | null {
  const candidates = normalizedCandidates(links).sort(
    (left, right) => previewRank(left.url, left.extension) - previewRank(right.url, right.extension),
  );
  const selected = candidates[0];
  if (!selected) return null;
  return { url: selected.url, width: selected.link.width, height: selected.link.height };
}

function selectOriginalNasaImageAsset(links: NasaImageLink[]): SelectedNasaImageAsset | null {
  const candidates = normalizedCandidates(links).sort(
    (left, right) => originalRank(left.url, left.extension) - originalRank(right.url, right.extension),
  );
  const selected = candidates[0];
  return selected ? { url: selected.url, width: selected.link.width, height: selected.link.height } : null;
}

function manifestLinks(value: unknown): NasaImageLink[] {
  if (!isRecord(value) || !isRecord(value.collection) || !Array.isArray(value.collection.items)) return [];
  return value.collection.items.flatMap((item) => {
    if (!isRecord(item) || typeof item.href !== "string") return [];
    return [{ href: item.href }];
  });
}

function failureFromLinks(links: NasaImageLink[]): NasaImageResolutionFailure {
  let sawUntrustedHost = false;
  let sawInvalidUrl = false;
  for (const link of links) {
    const normalized = normalizeNasaImageUrl(link.href);
    if (!normalized.ok && normalized.reason === "image_host_not_allowed") sawUntrustedHost = true;
    if (!normalized.ok && normalized.reason === "invalid_media_url") sawInvalidUrl = true;
  }
  if (sawUntrustedHost) return "image_host_not_allowed";
  if (sawInvalidUrl) return "invalid_media_url";
  return "no_supported_asset";
}

function sourceHost(item: NasaImageSearchItem) {
  try {
    return item.href ? new URL(item.href).hostname : undefined;
  } catch {
    return undefined;
  }
}

function providerStatus(error: unknown) {
  if (!isRecord(error) || typeof error.status !== "number") return undefined;
  return error.status;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error("NASA image manifest timed out.");
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function unavailable(
  item: NasaImageSearchItem,
  options: ResolveOptions,
  category: NasaImageResolutionFailure,
  status?: number,
): ResolvedNasaImage {
  const nasaId = item.data?.[0]?.nasa_id ?? "unknown";
  options.onFailure?.({ nasaId, category, sourceHost: sourceHost(item), status });
  return { previewUrl: null, originalUrl: null, source: "fallback", failureCategory: category };
}

export async function resolveNasaImage(
  item: NasaImageSearchItem,
  options: ResolveOptions,
): Promise<ResolvedNasaImage> {
  const directLinks = item.links ?? [];
  const directPreviewLinks = directLinks.filter(
    (link) => link.render === "image" && (link.rel === "preview" || link.rel === "alternate"),
  );
  const directPreview = selectBestNasaImageAsset(directPreviewLinks);
  if (directPreview) {
    const directOriginal = selectOriginalNasaImageAsset(directLinks);
    return {
      previewUrl: directPreview.url,
      originalUrl: directOriginal?.url ?? directPreview.url,
      width: directPreview.width,
      height: directPreview.height,
      source: "search-preview",
    };
  }

  const nasaId = item.data?.[0]?.nasa_id;
  if (!nasaId) return unavailable(item, options, failureFromLinks(directLinks));

  let manifest: unknown;
  try {
    manifest = await withTimeout(
      options.fetchManifest(nasaId),
      options.timeoutMs ?? DEFAULT_MANIFEST_TIMEOUT_MS,
    );
  } catch (error) {
    return unavailable(
      item,
      options,
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "provider_timeout"
        : "manifest_unavailable",
      providerStatus(error),
    );
  }

  const links = manifestLinks(manifest);
  const preview = selectBestNasaImageAsset(links);
  if (!preview) return unavailable(item, options, failureFromLinks(links));
  const original = selectOriginalNasaImageAsset(links);
  return {
    previewUrl: preview.url,
    originalUrl: original?.url ?? preview.url,
    width: preview.width,
    height: preview.height,
    source: "asset-manifest",
  };
}

export async function resolveNasaSearchResponse(
  value: unknown,
  options: ResolveOptions,
): Promise<NasaImageSearchResponse> {
  if (!isRecord(value)) return {};
  const collection = isRecord(value.collection) ? value.collection : undefined;
  const items = collection && Array.isArray(collection.items)
    ? collection.items.filter(isRecord) as NasaImageSearchItem[]
    : [];
  if (!collection || items.length === 0) return value as NasaImageSearchResponse;

  const manifestCache = new Map<string, Promise<ResolvedNasaImage>>();
  const resolvedItems = new Array<NasaImageSearchItem>(items.length);
  let cursor = 0;

  async function resolveNext() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      const hasDirectPreview = selectBestNasaImageAsset(
        (item.links ?? []).filter(
          (link) => link.render === "image" && (link.rel === "preview" || link.rel === "alternate"),
        ),
      );
      const nasaId = item.data?.[0]?.nasa_id;
      let resolution: ResolvedNasaImage;
      if (hasDirectPreview || !nasaId) {
        resolution = await resolveNasaImage(item, options);
      } else {
        const pending = manifestCache.get(nasaId) ?? resolveNasaImage(item, options);
        manifestCache.set(nasaId, pending);
        resolution = await pending;
      }
      resolvedItems[index] = { ...item, resolvedImage: resolution };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_RESOLUTION_CONCURRENCY, items.length) }, () => resolveNext()),
  );

  return {
    ...value,
    collection: { ...collection, items: resolvedItems },
  } as NasaImageSearchResponse;
}
