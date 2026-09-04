import type { NasaRateLimit } from "./nasa-error";

export type NasaCacheProfile = "realtime" | "brief" | "standard" | "archive";

export type NasaFetchOptions = {
  cacheProfile?: NasaCacheProfile;
  tags?: string[];
  apiKey?: string;
  onRateLimit?: (rateLimit: NasaRateLimit) => void;
};

export type ApodParams = {
  date?: string;
  startDate?: string;
  endDate?: string;
  count?: number;
  thumbs?: boolean;
};

export type ApodEntry = {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: "image" | "video" | string;
  service_version: string;
  title: string;
  url: string;
  copyright?: string;
  thumbnail_url?: string;
};

export type NeoWsFeedParams = {
  startDate: string;
  endDate?: string;
};

export type NeoWsLookupParams = {
  asteroidId: string;
};

export type NeoWsBrowseParams = {
  page?: number;
  size?: number;
};

export type DonkiEventType =
  | "CME"
  | "CMEAnalysis"
  | "GST"
  | "IPS"
  | "FLR"
  | "SEP"
  | "MPC"
  | "RBE"
  | "HSS"
  | "WSAEnlilSimulations"
  | "notifications";

export type DonkiParams = {
  type: DonkiEventType;
  startDate?: string;
  endDate?: string;
};

export type NasaImageMediaType = "image" | "video" | "audio";

export type ImageLibrarySearchParams = {
  q?: string;
  center?: string;
  description?: string;
  description508?: string;
  keywords?: string[];
  location?: string;
  mediaType?: NasaImageMediaType[];
  nasaId?: string;
  page?: number;
  pageSize?: number;
  photographer?: string;
  secondaryCreator?: string;
  title?: string;
  yearStart?: string;
  yearEnd?: string;
};

export type ImageLibraryAssetParams = {
  nasaId: string;
};

export type MarsRoverName = "curiosity" | "opportunity" | "spirit" | "perseverance";

export type MarsRoverPhotosParams = {
  rover: MarsRoverName;
  sol?: number;
  earthDate?: string;
  camera?: string;
  page?: number;
};

export type MarsRoverManifestParams = {
  rover: MarsRoverName;
};
