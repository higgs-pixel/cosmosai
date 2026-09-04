import {
  buildUrl,
  NASA_IMAGE_LIBRARY_BASE_URL,
  nasaFetch,
} from "./nasa-fetch";
import type {
  ImageLibraryAssetParams,
  ImageLibrarySearchParams,
  NasaFetchOptions,
} from "./nasa-types";
import {
  resolveNasaSearchResponse,
  type NasaImageResolutionFailure,
} from "./image-asset-resolver";

export async function searchNasaImages(
  params: ImageLibrarySearchParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(NASA_IMAGE_LIBRARY_BASE_URL, "/search", {
    q: params.q,
    center: params.center,
    description: params.description,
    description_508: params.description508,
    keywords: params.keywords,
    location: params.location,
    media_type: params.mediaType,
    nasa_id: params.nasaId,
    page: params.page,
    page_size: params.pageSize,
    photographer: params.photographer,
    secondary_creator: params.secondaryCreator,
    title: params.title,
    year_start: params.yearStart,
    year_end: params.yearEnd,
  });

  return nasaFetch<unknown>(url, {
    cacheProfile: "standard",
    tags: ["nasa", "nasa:image-library", "nasa:image-library:search"],
    ...options,
  });
}

export async function searchNasaImagesWithResolvedPreviews(
  params: ImageLibrarySearchParams,
  options: NasaFetchOptions = {},
  onPreviewFailure?: (failure: {
    nasaId: string;
    category: NasaImageResolutionFailure;
    sourceHost?: string;
    status?: number;
  }) => void,
) {
  const response = await searchNasaImages(params, options);
  return resolveNasaSearchResponse(response, {
    fetchManifest: (nasaId) => getNasaImageAsset({ nasaId }, options),
    onFailure: onPreviewFailure,
  });
}

export async function getNasaImageAsset(
  params: ImageLibraryAssetParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_IMAGE_LIBRARY_BASE_URL,
    `/asset/${encodeURIComponent(params.nasaId)}`,
  );

  return nasaFetch<unknown>(url, {
    cacheProfile: "archive",
    tags: ["nasa", "nasa:image-library", `nasa:image-library:${params.nasaId}`],
    ...options,
  });
}

export async function getNasaImageMetadataLocation(
  params: ImageLibraryAssetParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_IMAGE_LIBRARY_BASE_URL,
    `/metadata/${encodeURIComponent(params.nasaId)}`,
  );

  return nasaFetch<{ location: string }>(url, {
    cacheProfile: "archive",
    tags: ["nasa", "nasa:image-library", `nasa:image-library:${params.nasaId}`],
    ...options,
  });
}

export async function getNasaImageCaptionsLocation(
  params: ImageLibraryAssetParams,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_IMAGE_LIBRARY_BASE_URL,
    `/captions/${encodeURIComponent(params.nasaId)}`,
  );

  return nasaFetch<{ location: string }>(url, {
    cacheProfile: "archive",
    tags: ["nasa", "nasa:image-library", `nasa:image-library:${params.nasaId}`],
    ...options,
  });
}

export async function getNasaImageAlbum(
  albumName: string,
  page?: number,
  options: NasaFetchOptions = {},
) {
  const url = buildUrl(
    NASA_IMAGE_LIBRARY_BASE_URL,
    `/album/${encodeURIComponent(albumName)}`,
    { page },
  );

  return nasaFetch<unknown>(url, {
    cacheProfile: "archive",
    tags: ["nasa", "nasa:image-library", `nasa:image-library:album:${albumName}`],
    ...options,
  });
}
