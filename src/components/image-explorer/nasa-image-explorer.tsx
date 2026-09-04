"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  Film,
  Headphones,
  ImageIcon,
  Loader2,
  Maximize2,
  Search,
  Sparkles,
  Telescope,
  type LucideIcon,
  X,
} from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import { SaveDiscoveryButton } from "@/components/saved/save-discovery-button";
import { GradientActionMenu } from "@/components/ui/gradient-action-menu";
import { NasaPreviewImage } from "./nasa-preview-image";
import { trackImageExplorerSearch } from "@/lib/cosmos-analytics";
import { recordViewedImage } from "@/lib/cosmos-retention";
import type { SavedDiscovery } from "@/lib/saved-discoveries";
import { safeExternalUrl } from "@/lib/security/safe-url";

type MediaType = "image" | "video" | "audio";

type ExplorerItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  mediaType: MediaType;
  center?: string;
  photographer?: string;
  secondaryCreator?: string;
  keywords: string[];
  previewUrl?: string;
  originalUrl?: string;
  previewSource?: "search-preview" | "asset-manifest" | "fallback";
  previewWidth?: number;
  previewHeight?: number;
  href?: string;
};

type DownloadLink = {
  href: string;
  label: string;
  kind: "image" | "video" | "audio" | "metadata" | "other";
};

type NasaSearchResponse = {
  collection?: {
    items?: Array<{
      href?: string;
      data?: Array<{
        title?: string;
        description?: string;
        nasa_id?: string;
        date_created?: string;
        media_type?: string;
        center?: string;
        photographer?: string;
        secondary_creator?: string;
        keywords?: string[];
      }>;
      links?: Array<{
        href?: string;
        rel?: string;
        render?: string;
      }>;
      resolvedImage?: {
        previewUrl: string | null;
        originalUrl?: string | null;
        width?: number;
        height?: number;
        source: "search-preview" | "asset-manifest" | "fallback";
      };
    }>;
  };
};

type AssetResponse = {
  asset?: {
    collection?: {
      items?: Array<{
        href?: string;
      }>;
    };
  };
};

const PAGE_SIZE = 24;

const mediaFilters: Array<{ label: string; value: MediaType; icon: LucideIcon }> = [
  { label: "Images", value: "image", icon: ImageIcon },
  { label: "Videos", value: "video", icon: Film },
  { label: "Audio", value: "audio", icon: Headphones },
];

const categoryQueries = [
  "Mars",
  "Moon",
  "Earth",
  "Galaxies",
  "Nebulae",
  "Astronauts",
  "Spacecraft",
  "Apollo",
  "James Webb",
  "Hubble",
  "Artemis",
  "ISS",
  "Saturn",
  "Jupiter",
  "Sun",
  "Exoplanets",
];

const editorialQueries = [
  "James Webb deep field",
  "Apollo lunar surface",
  "Mars rover panorama",
  "Earth from space",
  "Hubble nebula",
  "Space shuttle launch",
];

function createFallbackExplorerItems(mediaType: MediaType): ExplorerItem[] {
  const fallbackDate = new Date().toISOString();
  const fallbackItems: ExplorerItem[] = [
    {
      id: "sample-webb-deep-field",
      title: "Sample Archive: Webb Deep Field",
      description:
        "NASA media search is temporarily unavailable, so COSMOS is showing a sample exhibit. Webb deep field imagery helps viewers inspect early galaxies, gravitational lensing, and the way infrared light turns deep time into visible evidence.",
      date: fallbackDate,
      mediaType: "image",
      center: "COSMOS sample",
      keywords: ["webb", "deep field", "galaxies"],
      previewUrl: "https://www.nasa.gov/wp-content/uploads/2022/07/main_image_deep_field_smacs0723-5mb.jpg",
    },
    {
      id: "sample-apollo-lunar-surface",
      title: "Sample Archive: Apollo Lunar Surface",
      description:
        "Lunar surface media connects spacecraft engineering, human exploration, geology, and mission operations. Shadows, footprints, tools, and horizon lines all carry context about working on another world.",
      date: fallbackDate,
      mediaType: "image",
      center: "COSMOS sample",
      keywords: ["apollo", "moon", "lunar"],
      previewUrl: "https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/AS11-40-5903HR.jpg",
    },
    {
      id: "sample-mars-rover-terrain",
      title: "Sample Archive: Mars Rover Terrain",
      description:
        "Rover imagery helps scientists read another planet from the ground: layered rock, wheel tracks, dust, dunes, and fracture lines can point to wind, water, volcanic, or impact history.",
      date: fallbackDate,
      mediaType: "image",
      center: "COSMOS sample",
      keywords: ["mars", "rover", "terrain"],
      previewUrl: "https://www.nasa.gov/wp-content/uploads/2021/02/pia24486-1.jpg",
    },
  ];

  if (mediaType === "image") return fallbackItems;

  return fallbackItems.map((item) => ({
    ...item,
    id: `${item.id}-${mediaType}`,
    mediaType,
    title: item.title.replace("Sample Archive", mediaType === "video" ? "Sample Video Exhibit" : "Sample Audio Exhibit"),
  }));
}

function nasaSourceUrl(item: ExplorerItem) {
  return `https://images.nasa.gov/details-${encodeURIComponent(item.id)}`;
}

function discoveryForItem(item: ExplorerItem): SavedDiscovery {
  return {
    id: `nasa-image-${item.id}`,
    type: "nasa-image",
    title: item.title,
    subtitle: `${item.center ?? "NASA"} / ${formatDate(item.date)}`,
    description: item.description,
    imageUrl: item.previewUrl,
    href: `/image-explorer?q=${encodeURIComponent(item.title)}&mediaType=${item.mediaType}`,
    source: "NASA Image and Video Library",
    savedAt: new Date().toISOString(),
    metadata: {
      nasaId: item.id,
      mediaType: item.mediaType,
      center: item.center,
    },
  };
}

function bestOriginalLink(downloadLinks: DownloadLink[], item: ExplorerItem) {
  return (
    item.originalUrl ??
    downloadLinks.find((link) => link.kind === item.mediaType)?.href ??
    downloadLinks.find((link) => link.kind === "image")?.href ??
    item.previewUrl ??
    item.href ??
    nasaSourceUrl(item)
  );
}

function relatedSearchesForItem(item: ExplorerItem) {
  const titleWords = item.title
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9-]/gi, ""))
    .filter((word) => word.length > 3)
    .slice(0, 3);
  const keywordSearches = item.keywords
    .filter((keyword) => keyword.length > 2)
    .slice(0, 5);

  return Array.from(new Set([...keywordSearches, ...titleWords, item.center].filter(Boolean) as string[])).slice(0, 6);
}

function normalizeItems(response: NasaSearchResponse): ExplorerItem[] {
  return (response.collection?.items ?? [])
    .map((item) => {
      const data = item.data?.[0];
      const mediaType = data?.media_type;
      if (!data?.nasa_id || (mediaType !== "image" && mediaType !== "video" && mediaType !== "audio")) return null;

      return {
        id: data.nasa_id,
        title: data.title ?? "Untitled NASA media",
        description: data.description ?? "No NASA description is available for this media asset.",
        date: data.date_created ?? "",
        mediaType,
        center: data.center,
        photographer: data.photographer,
        secondaryCreator: data.secondary_creator,
        keywords: data.keywords ?? [],
        previewUrl: item.resolvedImage?.previewUrl ?? undefined,
        originalUrl: item.resolvedImage?.originalUrl ?? undefined,
        previewSource: item.resolvedImage?.source,
        previewWidth: item.resolvedImage?.width,
        previewHeight: item.resolvedImage?.height,
        href: item.href,
      };
    })
    .filter(Boolean) as ExplorerItem[];
}

function formatDate(date: string) {
  if (!date) return "Unknown date";

  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "Unknown date";
  }
}

function extensionFromUrl(url: string) {
  try {
    const pathname = new URL(url, "https://images-assets.nasa.gov").pathname;
    return pathname.split(".").pop()?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

function classifyDownload(url: string): DownloadLink["kind"] {
  const extension = extensionFromUrl(url);
  if (["jpg", "jpeg", "png", "webp"].includes(extension)) return "image";
  if (["mp4", "mov", "m4v", "webm"].includes(extension)) return "video";
  if (["mp3", "wav", "m4a"].includes(extension)) return "audio";
  if (["json", "xml", "srt", "vtt"].includes(extension)) return "metadata";
  return "other";
}

function normalizeDownloadLinks(response: AssetResponse, fallbackHref?: string): DownloadLink[] {
  const assetItems = response.asset?.collection?.items ?? [];
  const links = assetItems
    .map((item) => item.href)
    .filter((href): href is string => Boolean(href))
    .map((href) => {
      const extension = extensionFromUrl(href);
      const kind = classifyDownload(href);

      return {
        href,
        kind,
        label: extension ? `${extension.toUpperCase()} ${kind}` : kind,
      } satisfies DownloadLink;
    });

  if (links.length > 0) return links;

  return fallbackHref
    ? [
        {
          href: fallbackHref,
          kind: "other",
          label: "NASA manifest",
        },
      ]
    : [];
}

function missionSignal(item: ExplorerItem) {
  const source = [item.center, item.photographer, item.secondaryCreator, ...item.keywords].filter(Boolean).join(" / ");
  if (source) return source;
  return item.mediaType === "image" ? "NASA visual archive" : item.mediaType === "video" ? "NASA motion archive" : "NASA audio archive";
}

function staticMediaExplanation(item: ExplorerItem) {
  const text = `${item.title} ${item.description} ${item.keywords.join(" ")}`.toLowerCase();

  if (text.includes("apollo") || text.includes("artemis") || text.includes("moon") || text.includes("lunar")) {
    return {
      why: "Lunar mission records connect engineering, human exploration, surface science, and spacecraft operations in one historical thread.",
      look: "Look for hardware, terrain, shadows, crew scale, and mission markings; those details reveal both the environment and the operational story.",
    };
  }

  if (text.includes("webb") || text.includes("hubble") || text.includes("nebula") || text.includes("galaxy")) {
    return {
      why: "Observatory images make invisible distance and deep time inspectable, turning light into evidence about stars, dust, galaxies, and cosmic structure.",
      look: "Compare color, brightness, dense regions, and dark dust lanes. Those visual differences often map temperature, chemistry, age, or density.",
    };
  }

  if (text.includes("mars") || text.includes("rover") || text.includes("perseverance") || text.includes("curiosity")) {
    return {
      why: "Mars media links planetary geology with robotic fieldwork, showing how scientists read terrain from another world.",
      look: "Look for rock layering, wheel tracks, dunes, fracture lines, and color changes; each can hint at wind, water, impact, or volcanic history.",
    };
  }

  if (text.includes("earth") || text.includes("climate") || text.includes("hurricane") || text.includes("weather")) {
    return {
      why: "Earth-observing media connects spaceflight with climate, atmosphere, oceans, and the changing systems that shape daily life.",
      look: "Trace cloud structures, coastlines, fires, storms, or ice edges. Patterns at planetary scale often reveal processes invisible from the ground.",
    };
  }

  return {
    why: "NASA media records preserve the mission context behind a moment: what was observed, where it came from, and why the agency made it public.",
    look: "Start with the subject, then inspect the metadata: date, center, camera, creator, and keywords often explain why this asset belongs in the archive.",
  };
}

function uniqueById(items: ExplorerItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function NasaImageExplorer() {
  const [query, setQuery] = useState("James Webb deep field");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [center, setCenter] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [items, setItems] = useState<ExplorerItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const requestRef = useRef("");
  const searchAbortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchSourceRef = useRef<"instant" | "editorial" | "url">("instant");

  const selectedItem = selectedIndex === null ? null : items[selectedIndex] ?? null;

  useEffect(() => {
    if (!selectedItem) return;

    recordViewedImage({
      title: selectedItem.title,
      href: `/image-explorer?q=${encodeURIComponent(selectedItem.title)}&mediaType=${selectedItem.mediaType}`,
      imageUrl: selectedItem.previewUrl,
      source: selectedItem.center ?? "NASA Image and Video Library",
    });
  }, [selectedItem]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextQuery = params.get("q");
    const nextMediaType = params.get("mediaType");

    if (nextQuery) {
      searchSourceRef.current = "url";
      setQuery(nextQuery);
    }
    if (nextMediaType === "image" || nextMediaType === "video" || nextMediaType === "audio") {
      setMediaType(nextMediaType);
    }
  }, []);

  const loadPage = useCallback(async (nextPage: number, mode: "replace" | "append") => {
    const trimmedQuery = query.trim() || "NASA";
    const trimmedCenter = center.trim();
    const trimmedYearStart = yearStart.trim();
    const trimmedYearEnd = yearEnd.trim();
    const signature = `${trimmedQuery}-${mediaType}-${trimmedCenter}-${trimmedYearStart}-${trimmedYearEnd}-${nextPage}-${mode}-${Date.now()}`;
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    requestRef.current = signature;
    setError(null);

    if (mode === "replace") {
      setIsLoading(true);
      setHasMore(true);
      trackImageExplorerSearch({
        query: trimmedQuery,
        mediaType,
        center: trimmedCenter,
        yearStart: trimmedYearStart,
        yearEnd: trimmedYearEnd,
        source: searchSourceRef.current,
      });
      searchSourceRef.current = "instant";
    } else {
      setIsLoadingMore(true);
    }

    const params = new URLSearchParams({
      q: trimmedQuery,
      mediaType,
      page: String(nextPage),
      pageSize: String(PAGE_SIZE),
    });
    if (trimmedCenter) params.set("center", trimmedCenter);
    if (trimmedYearStart) params.set("yearStart", trimmedYearStart);
    if (trimmedYearEnd) params.set("yearEnd", trimmedYearEnd);

    try {
      const response = await fetch(`/api/nasa/media/search?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("NASA Image and Video Library search failed.");

      const json = await response.json() as NasaSearchResponse;
      const normalized = normalizeItems(json);
      if (requestRef.current !== signature) return;

      setPage(nextPage);
      setHasMore(normalized.length >= PAGE_SIZE);
      setItems((current) => (mode === "replace" ? normalized : uniqueById([...current, ...normalized])));
      setError(null);
    } catch (searchError) {
      if (searchError instanceof DOMException && searchError.name === "AbortError") return;
      if (requestRef.current !== signature) return;
      setError("NASA media search is unavailable right now. Showing a sample COSMOS archive wall until the live NASA signal returns.");
      if (mode === "replace") setItems(createFallbackExplorerItems(mediaType));
      setHasMore(false);
    } finally {
      if (searchAbortRef.current === controller) searchAbortRef.current = null;
      if (requestRef.current === signature) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [center, mediaType, query, yearEnd, yearStart]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPage(1, "replace");
    }, 360);

    return () => window.clearTimeout(timeout);
  }, [loadPage]);

  useEffect(() => {
    return () => searchAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          void loadPage(page + 1, "append");
        }
      },
      { rootMargin: "900px 0px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, loadPage, page]);

  function chooseEditorialQuery(nextQuery: string) {
    searchSourceRef.current = "editorial";
    setQuery(nextQuery);
  }

  function chooseCategory(nextQuery: string) {
    searchSourceRef.current = "editorial";
    setQuery(nextQuery);
    setCenter("");
    setYearStart("");
    setYearEnd("");
  }

  function shiftSelection(direction: -1 | 1) {
    if (selectedIndex === null || items.length === 0) return;
    setSelectedIndex((selectedIndex + direction + items.length) % items.length);
  }

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <AnimatedStarfield />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_26%_0%,rgba(56,189,248,0.15),transparent_30%),radial-gradient(circle_at_72%_8%,rgba(245,158,11,0.1),transparent_28%),linear-gradient(180deg,rgba(3,4,10,0.08),#03040a_82%)]" />
      <div className="cosmos-orbital-grid fixed z-0" />
      <div className="noise-overlay fixed z-0" />

      <section className="relative z-10 min-h-screen px-3 py-4 sm:px-4 md:px-6 md:py-6">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
          <header className="glass-nav flex items-center justify-between rounded-full px-3 py-3 md:px-4">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-semibold text-cosmos-frost transition hover:bg-white/[0.06] hover:text-cosmos-white"
            >
              <ArrowLeft className="h-4 w-4" />
              COSMOS AI
            </Link>

            <div className="hidden items-center gap-2 rounded-full border border-oxygen-400/20 bg-oxygen-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-oxygen-400 sm:flex">
              <Telescope className="h-3.5 w-3.5" />
              NASA Image and Video Library
            </div>
          </header>

          <ExplorerHero
            query={query}
            setQuery={setQuery}
            mediaType={mediaType}
            setMediaType={setMediaType}
            center={center}
            setCenter={setCenter}
            yearStart={yearStart}
            setYearStart={setYearStart}
            yearEnd={yearEnd}
            setYearEnd={setYearEnd}
            isLoading={isLoading}
            onEditorialQuery={chooseEditorialQuery}
            onCategoryQuery={chooseCategory}
          />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cosmos-mist">
                Showing {items.length} {mediaType} results
              </p>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-normal md:text-3xl">Editorial archive wall</h2>
            </div>
            {error ? <ErrorBanner message={error} /> : null}
          </div>

          {isLoading ? (
            <SkeletonGrid />
          ) : items.length === 0 ? (
            <EmptyState query={query} mediaType={mediaType} />
          ) : (
            <MediaGrid items={items} onSelect={setSelectedIndex} />
          )}

          <div ref={sentinelRef} className="h-10" />
          {isLoadingMore ? (
            <div className="flex items-center justify-center gap-3 pb-10 text-sm text-cosmos-mist">
              <Loader2 className="h-4 w-4 animate-spin text-oxygen-400" />
              Loading more NASA media
            </div>
          ) : null}
        </div>
      </section>

      {selectedItem ? (
        <MediaViewer
          item={selectedItem}
          onClose={() => setSelectedIndex(null)}
          onPrevious={() => shiftSelection(-1)}
          onNext={() => shiftSelection(1)}
          onSearchRelated={(nextQuery) => {
            chooseCategory(nextQuery);
            setSelectedIndex(null);
          }}
        />
      ) : null}
    </main>
  );
}

function ExplorerHero({
  query,
  setQuery,
  mediaType,
  setMediaType,
  center,
  setCenter,
  yearStart,
  setYearStart,
  yearEnd,
  setYearEnd,
  isLoading,
  onEditorialQuery,
  onCategoryQuery,
}: {
  query: string;
  setQuery: (query: string) => void;
  mediaType: MediaType;
  setMediaType: (mediaType: MediaType) => void;
  center: string;
  setCenter: (center: string) => void;
  yearStart: string;
  setYearStart: (yearStart: string) => void;
  yearEnd: string;
  setYearEnd: (yearEnd: string) => void;
  isLoading: boolean;
  onEditorialQuery: (query: string) => void;
  onCategoryQuery: (query: string) => void;
}) {
  function clearFilters() {
    setQuery("");
    setCenter("");
    setYearStart("");
    setYearEnd("");
  }

  async function shareArchive() {
    const url = window.location.href;
    const title = "COSMOS AI NASA Image Explorer";

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
    } catch {
      // Sharing is a convenience action; failing silently keeps the archive controls calm.
    }
  }

  const quickActions = [
    {
      title: "Images",
      icon: ImageIcon,
      gradientFrom: "#38bdf8",
      gradientTo: "#2563eb",
      active: mediaType === "image",
      onClick: () => setMediaType("image" as const),
      ariaLabel: "Show NASA images",
    },
    {
      title: "Videos",
      icon: Film,
      gradientFrom: "#22d3ee",
      gradientTo: "#4f46e5",
      active: mediaType === "video",
      onClick: () => setMediaType("video" as const),
      ariaLabel: "Show NASA videos",
    },
    {
      title: "Audio",
      icon: Headphones,
      gradientFrom: "#67e8f9",
      gradientTo: "#7c3aed",
      active: mediaType === "audio",
      onClick: () => setMediaType("audio" as const),
      ariaLabel: "Show NASA audio",
    },
    {
      title: "Saved",
      icon: Check,
      gradientFrom: "#34d399",
      gradientTo: "#0ea5e9",
      href: "/discoveries",
      ariaLabel: "Open saved discoveries",
    },
    {
      title: "Share",
      icon: ExternalLink,
      gradientFrom: "#93c5fd",
      gradientTo: "#06b6d4",
      onClick: () => void shareArchive(),
      ariaLabel: "Share NASA Image Explorer",
    },
  ];
  const subjectGradients = [
    ["#38bdf8", "#2563eb"],
    ["#22d3ee", "#4f46e5"],
    ["#67e8f9", "#7c3aed"],
    ["#34d399", "#0ea5e9"],
    ["#93c5fd", "#06b6d4"],
  ] as const;
  const subjectActions = categoryQueries.map((item, index) => {
    const [gradientFrom, gradientTo] = subjectGradients[index % subjectGradients.length];

    return {
      title: item,
      icon: index % 3 === 0 ? Telescope : index % 3 === 1 ? Sparkles : ImageIcon,
      gradientFrom,
      gradientTo,
      active: query.trim().toLowerCase() === item.toLowerCase(),
      onClick: () => onCategoryQuery(item),
      ariaLabel: `Discover NASA media about ${item}`,
    };
  });

  return (
    <section className="glass-panel overflow-hidden rounded-[1.25rem]">
      <div className="relative z-10 grid min-w-0 gap-5 p-4 md:p-5 lg:p-6 xl:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] xl:gap-6 2xl:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-solar-300/25 bg-solar-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-solar-300">
            <Sparkles className="h-3.5 w-3.5" />
            NASA Image Explorer
          </div>
          <h1 className="max-w-5xl text-[clamp(2.45rem,4.6vw,3.75rem)] font-semibold leading-[1.04] tracking-normal xl:whitespace-nowrap 2xl:text-[4.25rem]">
            Archive, in Motion
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-cosmos-frost md:text-base md:leading-8">
            Search NASA imagery, film, and mission audio through a cinematic editorial lens.
          </p>
          <div className="mt-6 grid max-w-xl grid-cols-3 gap-2.5">
            <ArchiveStat label="Media" value={mediaType} />
            <ArchiveStat label="Search" value={query.trim() || "NASA"} />
            <ArchiveStat label="Mode" value="Instant" />
          </div>
        </div>

        <div className="relative z-10 grid min-w-0 content-end gap-3 rounded-[1.1rem] border border-white/10 bg-cosmos-black/32 p-3 shadow-card md:p-4">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
                Archive controls
              </p>
              <p className="mt-1 text-xs text-cosmos-mist">Filter, save, and share without leaving the archive.</p>
            </div>
            <GradientActionMenu actions={quickActions} className="max-w-full" />
          </div>

          <label className="glass-card rounded-[1rem] p-3 transition focus-within:border-oxygen-400/[0.45] focus-within:shadow-glow-oxygen">
            <span className="sr-only">Search NASA media</span>
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 flex-none text-oxygen-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search missions, planets, observatories..."
                className="h-12 min-w-0 flex-1 bg-transparent text-base font-semibold text-cosmos-white outline-none placeholder:text-cosmos-slate md:text-lg"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-cosmos-mist transition hover:bg-white/[0.08] hover:text-cosmos-white"
                  aria-label="Clear search query"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-oxygen-400" /> : null}
            </div>
          </label>

          <div className="rounded-[1rem] border border-white/10 bg-cosmos-black/24 p-3">
            <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
                  Filters and media type
                </p>
                <p className="mt-1 text-xs text-cosmos-mist">Group the archive before opening a media record.</p>
              </div>
              <div className="flex max-w-full flex-wrap gap-2">
                {mediaFilters.map((filter) => {
                  const Icon = filter.icon;
                  const selected = mediaType === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setMediaType(filter.value)}
                      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
                        selected
                          ? "border-cosmos-white bg-cosmos-white text-cosmos-black"
                          : "border-white/10 bg-white/[0.055] text-cosmos-mist hover:border-white/20 hover:text-cosmos-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,0.56fr)_minmax(0,0.56fr)_auto]">
              <label className="glass-card min-w-0 rounded-md px-3 py-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">
                  NASA center
                </span>
                <input
                  value={center}
                  onChange={(event) => setCenter(event.target.value)}
                  placeholder="JPL, GSFC, HQ..."
                  className="mt-1 h-8 w-full bg-transparent text-sm font-semibold text-cosmos-white outline-none placeholder:text-cosmos-slate"
                />
              </label>
              <label className="glass-card min-w-0 rounded-md px-3 py-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">
                  From
                </span>
                <input
                  value={yearStart}
                  onChange={(event) => setYearStart(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1969"
                  inputMode="numeric"
                  className="mt-1 h-8 w-full bg-transparent text-sm font-semibold text-cosmos-white outline-none placeholder:text-cosmos-slate"
                />
              </label>
              <label className="glass-card min-w-0 rounded-md px-3 py-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">
                  To
                </span>
                <input
                  value={yearEnd}
                  onChange={(event) => setYearEnd(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="2026"
                  inputMode="numeric"
                  className="mt-1 h-8 w-full bg-transparent text-sm font-semibold text-cosmos-white outline-none placeholder:text-cosmos-slate"
                />
              </label>
              <button
                type="button"
                onClick={clearFilters}
                className="glass-button min-h-12 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cosmos-mist transition hover:border-white/25 hover:text-cosmos-white"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-[1rem] border border-white/10 bg-cosmos-black/24 p-3">
            <p className="mb-2 text-left font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
              Discover by subject
            </p>
            <GradientActionMenu
              actions={subjectActions}
              className="w-full justify-start rounded-[1rem]"
              label="Discover NASA media by subject"
            />
          </div>

          <div className="flex max-w-full flex-wrap gap-2">
            {editorialQueries.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onEditorialQuery(item)}
                className="rounded-full border border-white/10 bg-white/[0.055] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-cosmos-mist transition hover:border-oxygen-400/30 hover:text-cosmos-white"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MediaGrid({ items, onSelect }: { items: ExplorerItem[]; onSelect: (index: number) => void }) {
  return (
    <section className="columns-1 gap-3 sm:columns-2 xl:columns-3 2xl:columns-4">
      {items.map((item, index) => (
        <MediaCard key={`${item.id}-${index}`} item={item} index={index} onSelect={() => onSelect(index)} />
      ))}
    </section>
  );
}

function MediaCard({ item, index, onSelect }: { item: ExplorerItem; index: number; onSelect: () => void }) {
  const featured = index === 0;
  const Icon = item.mediaType === "image" ? ImageIcon : item.mediaType === "video" ? Film : Headphones;
  const tall = !featured && index % 8 === 3;
  const compact = !featured && index % 5 === 2;

  function reportPreviewFailure() {
    if (!item.previewUrl || item.previewSource === "fallback") return;
    void fetch("/api/nasa/media/preview-failure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nasaId: item.id, failureCategory: "image_load_failed" }),
      keepalive: true,
    }).catch(() => undefined);
  }

  return (
    <article
      className={`glass-card group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[1rem] bg-cosmos-night text-left transition duration-500 hover:-translate-y-1 hover:border-oxygen-400/[0.35] hover:shadow-void ${
        featured ? "min-h-[410px] md:min-h-[500px]" : tall ? "min-h-[350px] md:min-h-[420px]" : compact ? "min-h-[260px] md:min-h-[300px]" : "min-h-[310px] md:min-h-[360px]"
      }`}
    >
      <button type="button" onClick={onSelect} className="absolute inset-0 text-left" aria-label={`Open ${item.title}`}>
        <div className="absolute inset-0 opacity-95 saturate-[1.08] transition duration-700 group-hover:scale-105">
          <NasaPreviewImage
            src={item.previewUrl}
            alt={item.title}
            sizes={featured ? "(max-width: 1280px) 100vw, 50vw" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"}
            onFailure={reportPreviewFailure}
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.05),rgba(3,4,10,0.44)_52%,rgba(3,4,10,0.9))]" />
        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-cosmos-black/[0.52] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-frost backdrop-blur-xl">
          <Icon className="h-3.5 w-3.5 text-oxygen-400" />
          {item.mediaType}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">
            {item.center ?? "NASA"} / {formatDate(item.date)}
          </p>
          <h3 className="line-clamp-3 text-xl font-semibold leading-[1.08] tracking-normal text-cosmos-white md:text-2xl">
            {item.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-cosmos-frost">
            {item.description}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-oxygen-400 opacity-0 transition group-hover:opacity-100">
            Open media
            <Maximize2 className="h-3.5 w-3.5" />
          </div>
        </div>
      </button>
      <SaveDiscoveryButton
        discovery={discoveryForItem(item)}
        compact
        className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-cosmos-black/[0.58] text-cosmos-frost backdrop-blur-xl transition hover:border-oxygen-400/35 hover:text-cosmos-white"
      />
    </article>
  );
}

function MediaViewer({
  item,
  onClose,
  onPrevious,
  onNext,
  onSearchRelated,
}: {
  item: ExplorerItem;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSearchRelated: (query: string) => void;
}) {
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiRequestRef = useRef("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrevious]);

  useEffect(() => {
    let mounted = true;
    setIsLoadingLinks(true);
    setLinksError(null);
    setAiText("");
    setAiError(null);
    setIsExplaining(false);
    aiRequestRef.current = "";

    async function loadAssetLinks() {
      try {
        const response = await fetch(`/api/nasa/media/${encodeURIComponent(item.id)}?metadata=false&captions=false`);
        if (!response.ok) throw new Error("NASA asset manifest request failed.");
        const json = await response.json() as AssetResponse;
        if (!mounted) return;
        setDownloadLinks(normalizeDownloadLinks(json, item.href));
      } catch {
        if (!mounted) return;
        setDownloadLinks(normalizeDownloadLinks({}, item.href));
        setLinksError("Download links are limited for this asset.");
      } finally {
        if (mounted) setIsLoadingLinks(false);
      }
    }

    void loadAssetLinks();

    return () => {
      mounted = false;
    };
  }, [item.href, item.id]);

  async function askCosmosAboutImage() {
    const requestSignature = `${item.id}-${Date.now()}`;
    aiRequestRef.current = requestSignature;
    setAiText("");
    setAiError(null);
    setIsExplaining(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "nasa-media",
          audience: "student",
          messages: [
            {
              role: "user",
              content: `Explain this NASA media asset: ${item.title}. ${item.description.slice(0, 900)}`,
            },
          ],
          context: {
            page: "NASA Image Explorer",
            title: item.title,
            description: item.description,
            imageUrl: item.previewUrl,
          },
        }),
      });

      if (!response.body) throw new Error("No AI stream returned.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (aiRequestRef.current !== requestSignature) return;
        setAiText((current) => `${current}${decoder.decode(value, { stream: true })}`);
      }

      if (!response.ok && aiRequestRef.current === requestSignature) {
        setAiError("COSMOS is using available NASA and astronomy context.");
      }
    } catch {
      if (aiRequestRef.current !== requestSignature) return;
      setAiError("COSMOS is using available NASA and astronomy context.");
    } finally {
      if (aiRequestRef.current === requestSignature) setIsExplaining(false);
    }
  }

  const imageDownload = useMemo(() => downloadLinks.find((link) => link.kind === "image"), [downloadLinks]);
  const videoDownload = useMemo(() => downloadLinks.find((link) => link.kind === "video"), [downloadLinks]);
  const audioDownload = useMemo(() => downloadLinks.find((link) => link.kind === "audio"), [downloadLinks]);
  const explanation = useMemo(() => staticMediaExplanation(item), [item]);
  const mediaSrc = item.mediaType === "image" ? imageDownload?.href ?? item.previewUrl : item.mediaType === "video" ? videoDownload?.href : audioDownload?.href;
  const sourceUrl = useMemo(() => safeExternalUrl(nasaSourceUrl(item)), [item]);
  const originalUrl = useMemo(() => safeExternalUrl(bestOriginalLink(downloadLinks, item)), [downloadLinks, item]);
  const relatedSearches = useMemo(() => relatedSearchesForItem(item), [item]);

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto bg-cosmos-black/[0.96] p-4 backdrop-blur-2xl md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nasa-media-viewer-title"
    >
      <div className="mx-auto grid min-h-full max-w-[1900px] gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <section className="relative min-h-[54vh] overflow-hidden rounded-[1.25rem] border border-white/10 bg-cosmos-black shadow-void md:min-h-[62vh] xl:min-h-0">
          <MediaStage item={item} mediaSrc={mediaSrc} />

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.12] bg-cosmos-black/[0.62] px-4 text-sm font-bold text-cosmos-white backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <X className="h-4 w-4" />
              Close
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onPrevious}
                className="h-11 rounded-full border border-white/[0.12] bg-cosmos-black/[0.62] px-4 text-sm font-bold text-cosmos-white backdrop-blur-xl transition hover:bg-white/[0.08]"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={onNext}
                className="h-11 rounded-full border border-white/[0.12] bg-cosmos-black/[0.62] px-4 text-sm font-bold text-cosmos-white backdrop-blur-xl transition hover:bg-white/[0.08]"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <aside className="glass-panel flex min-h-0 flex-col rounded-[1.25rem] p-6">
          <div className="border-b border-white/10 pb-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
              NASA media record
            </p>
            <h2 id="nasa-media-viewer-title" className="mt-3 text-4xl font-semibold leading-[0.98] tracking-normal">
              {item.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <MetadataBadge icon={<CalendarDays className="h-3.5 w-3.5" />} label={formatDate(item.date)} />
              <MetadataBadge icon={<Check className="h-3.5 w-3.5" />} label={item.center ?? "NASA"} />
              <MetadataBadge icon={<ImageIcon className="h-3.5 w-3.5" />} label={item.mediaType} />
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {sourceUrl ? <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-bold text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white"
              >
                <ExternalLink className="h-4 w-4" />
                NASA source
              </a> : null}
              {originalUrl ? <a
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-oxygen-500 px-4 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400"
              >
                <Download className="h-4 w-4" />
                Open original
              </a> : null}
              <Link
                href={{
                  pathname: "/ask",
                  query: {
                    mode: "nasa-media",
                    prompt: `Explain this NASA media asset: ${item.title}. ${item.description.slice(0, 900)}`,
                  },
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
              >
                <Sparkles className="h-4 w-4" />
                Ask COSMOS
              </Link>
              <SaveDiscoveryButton
                discovery={discoveryForItem(item)}
                label="Save"
                savedLabel="Saved"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-aurora-400/25 bg-aurora-400/10 px-4 text-sm font-bold text-aurora-400 transition hover:border-aurora-400/45 hover:text-cosmos-white"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-5">
            <section>
              <p className="mb-2 text-sm font-semibold text-cosmos-white">Mission information</p>
              <p className="text-sm leading-7 text-cosmos-frost">{missionSignal(item)}</p>
            </section>

            <section className="mt-6">
              <p className="mb-2 text-sm font-semibold text-cosmos-white">NASA description</p>
              <p className="text-sm leading-7 text-cosmos-frost">{item.description}</p>
            </section>

            <section className="mt-6 grid gap-3">
              <div className="rounded-[1rem] border border-solar-300/20 bg-solar-500/10 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-solar-300">
                  Why this matters
                </p>
                <p className="mt-3 text-sm leading-7 text-cosmos-frost">{explanation.why}</p>
              </div>
              <div className="rounded-[1rem] border border-oxygen-400/20 bg-oxygen-400/10 p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-oxygen-400">
                  What to inspect
                </p>
                <p className="mt-3 text-sm leading-7 text-cosmos-frost">{explanation.look}</p>
              </div>
              <div className="rounded-[1rem] border border-ai/20 bg-ai/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-ai">
                    COSMOS guide
                  </p>
                  <button
                    type="button"
                    onClick={() => void askCosmosAboutImage()}
                    disabled={isExplaining}
                    className="rounded-full border border-ai/25 bg-ai/12 px-3 py-1.5 text-xs font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {aiText ? "Regenerate" : "Ask COSMOS about this image"}
                  </button>
                </div>
                {isExplaining && !aiText ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-cosmos-frost">
                    <Loader2 className="h-4 w-4 animate-spin text-ai" />
                    Reading NASA source context...
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-cosmos-frost">
                    {aiText || "COSMOS only generates a live explanation after you ask. Until then, this panel uses NASA metadata, asset descriptions, and static educational context."}
                  </p>
                )}
                {aiError ? <p className="mt-3 text-xs leading-5 text-solar-300">{aiError}</p> : null}
              </div>
            </section>

            <section className="mt-6 grid gap-3">
              <PanelMetric label="NASA ID" value={item.id} />
              <PanelMetric label="Photographer" value={item.photographer ?? item.secondaryCreator ?? "Not listed"} />
              <PanelMetric label="Keywords" value={item.keywords.slice(0, 8).join(", ") || "Not listed"} />
            </section>

            {relatedSearches.length > 0 ? (
              <section className="glass-card mt-6 rounded-[1rem] p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cosmos-mist">
                  Related searches
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {relatedSearches.map((search) => (
                    <button
                      key={search}
                      type="button"
                      onClick={() => onSearchRelated(search)}
                      className="rounded-full border border-white/10 bg-cosmos-black/35 px-3 py-1.5 text-xs font-bold text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="glass-card mt-6 rounded-[1rem] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cosmos-mist">
                    Downloads
                  </p>
                  <p className="mt-1 text-sm text-cosmos-frost">NASA-hosted asset links</p>
                </div>
                {isLoadingLinks ? <Loader2 className="h-4 w-4 animate-spin text-oxygen-400" /> : <Download className="h-4 w-4 text-oxygen-400" />}
              </div>

              {linksError ? (
                <p className="mb-3 text-xs leading-5 text-solar-300">{linksError}</p>
              ) : null}

              <div className="grid gap-2">
                {downloadLinks.length > 0 ? (
                  downloadLinks.slice(0, 8).map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center justify-between gap-3 rounded-md border border-white/10 bg-cosmos-black/35 px-3 py-2 text-xs font-bold text-cosmos-frost transition hover:border-oxygen-400/30 hover:text-cosmos-white"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-cosmos-mist">No downloadable assets are listed for this media record.</p>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MediaStage({ item, mediaSrc }: { item: ExplorerItem; mediaSrc?: string }) {
  if (item.mediaType === "video" && mediaSrc) {
    return <video src={mediaSrc} controls className="h-full min-h-[54vh] w-full bg-black object-contain md:min-h-[62vh]" poster={item.previewUrl} />;
  }

  if (item.mediaType === "audio" && mediaSrc) {
    return (
      <div className="grid h-full min-h-[54vh] place-items-center bg-[radial-gradient(circle_at_50%_34%,rgba(167,139,250,0.24),transparent_24%),linear-gradient(135deg,#111827,#03040a)] p-8 md:min-h-[62vh]">
        <div className="w-full max-w-2xl text-center">
          <Headphones className="mx-auto mb-6 h-12 w-12 text-ai" />
          <audio src={mediaSrc} controls className="w-full" />
        </div>
      </div>
    );
  }

  if (mediaSrc) {
    return (
      <div className="relative h-full min-h-[54vh] w-full bg-black md:min-h-[62vh]">
        <NasaPreviewImage
          src={mediaSrc}
          alt={item.title}
          priority
          sizes="100vw"
          fit="contain"
        />
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-[54vh] place-items-center bg-[radial-gradient(circle_at_40%_30%,rgba(56,189,248,0.24),transparent_28%),linear-gradient(135deg,#111827,#03040a)] md:min-h-[62vh]">
      <div className="text-center">
        <ImageIcon className="mx-auto mb-4 h-10 w-10 text-oxygen-400" />
        <p className="text-sm text-cosmos-frost">Preview unavailable</p>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <section className="columns-1 gap-3 sm:columns-2 xl:columns-3 2xl:columns-4">
      {Array.from({ length: 12 }, (_, index) => (
        <div
          key={index}
          className={`cosmos-skeleton mb-3 break-inside-avoid overflow-hidden rounded-[1rem] border border-white/10 shadow-card ${
            index === 0 ? "min-h-[410px] md:min-h-[500px]" : index % 6 === 4 ? "min-h-[260px] md:min-h-[300px]" : "min-h-[310px] md:min-h-[360px]"
          }`}
        />
      ))}
    </section>
  );
}

function EmptyState({ query, mediaType }: { query: string; mediaType: MediaType }) {
  return (
    <section className="glass-panel grid min-h-[360px] place-items-center rounded-[1.25rem] p-8 text-center">
      <div className="relative z-10">
        <Search className="mx-auto mb-5 h-10 w-10 text-oxygen-400" />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cosmos-mist">
          No {mediaType} results
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-normal">No signal for &quot;{query}&quot;.</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-cosmos-frost">
          Try a mission, observatory, planet, spacecraft, or NASA center.
        </p>
      </div>
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex max-w-xl items-start gap-3 rounded-[1rem] border border-mars-400/25 bg-mars-400/10 px-5 py-4 text-sm leading-6 text-mars-400">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
      <p>{message}</p>
    </div>
  );
}

function ArchiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card min-w-0 rounded-md p-3">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold capitalize text-cosmos-white">{value}</p>
    </div>
  );
}

function PanelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-md p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-cosmos-white">{value}</p>
    </div>
  );
}

function MetadataBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-cosmos-frost">
      {icon}
      {label}
    </span>
  );
}
