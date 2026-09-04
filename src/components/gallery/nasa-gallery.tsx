"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  Loader2,
  Maximize2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import { safeExternalUrl } from "@/lib/security/safe-url";

type MediaType = "image" | "video" | "audio";

type GalleryItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  mediaType: MediaType | string;
  center?: string;
  photographer?: string;
  keywords: string[];
  previewUrl?: string;
  href?: string;
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
        keywords?: string[];
      }>;
      links?: Array<{
        href?: string;
        rel?: string;
        render?: string;
      }>;
    }>;
  };
};

const curatedQueries = ["Webb", "Apollo", "Mars", "Jupiter", "Nebula", "Earth at night"];

const mediaFilters: Array<{ label: string; value: MediaType }> = [
  { label: "Images", value: "image" },
  { label: "Video", value: "video" },
  { label: "Audio", value: "audio" },
];

function normalizeItems(response: NasaSearchResponse): GalleryItem[] {
  return (response.collection?.items ?? [])
    .map((item) => {
      const data = item.data?.[0];
      if (!data?.nasa_id) return null;

      return {
        id: data.nasa_id,
        title: data.title ?? "Untitled NASA asset",
        description: data.description ?? "No description available.",
        date: data.date_created ?? "",
        mediaType: data.media_type ?? "image",
        center: data.center,
        photographer: data.photographer,
        keywords: data.keywords ?? [],
        previewUrl: item.links?.find((link) => link.render === "image" || link.rel === "preview")?.href,
        href: item.href,
      } satisfies GalleryItem;
    })
    .filter(Boolean) as GalleryItem[];
}

function formatDate(date: string) {
  if (!date) return "Unknown date";

  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "Unknown date";
  }
}

function createFallbackItems(): GalleryItem[] {
  return [
    {
      id: "fallback-webb",
      title: "Deep Field Signal",
      description:
        "NASA Image Library results will appear here when the API is available. This fallback preserves the exhibition layout for local design review.",
      date: new Date().toISOString(),
      mediaType: "image",
      center: "COSMOS",
      keywords: ["deep field", "galaxy", "observatory"],
    },
    {
      id: "fallback-mars",
      title: "Rover Light Across Mars",
      description:
        "Search NASA imagery by mission, object, center, or phenomenon to build a cinematic wall of source-backed exploration.",
      date: new Date().toISOString(),
      mediaType: "image",
      center: "COSMOS",
      keywords: ["mars", "rover", "terrain"],
    },
    {
      id: "fallback-nebula",
      title: "Nebula Study",
      description:
        "The fullscreen viewer combines NASA metadata with a COSMOS AI explanation panel for guided interpretation.",
      date: new Date().toISOString(),
      mediaType: "image",
      center: "COSMOS",
      keywords: ["nebula", "infrared", "stars"],
    },
  ];
}

export function NasaGallery() {
  const [query, setQuery] = useState("Webb deep field");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [yearStart, setYearStart] = useState("2010");
  const [yearEnd, setYearEnd] = useState("2026");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const lastSearchRef = useRef("");
  const searchAbortRef = useRef<AbortController | null>(null);
  const explanationRequestRef = useRef("");

  const selectedItem = selectedIndex === null ? null : items[selectedIndex] ?? null;

  async function runSearch(
    nextQuery = query,
    overrides: Partial<{ mediaType: MediaType; yearStart: string; yearEnd: string }> = {},
  ) {
    const trimmedQuery = nextQuery.trim() || "NASA";
    const nextMediaType = overrides.mediaType ?? mediaType;
    const nextYearStart = overrides.yearStart ?? yearStart;
    const nextYearEnd = overrides.yearEnd ?? yearEnd;
    const searchSignature = `${trimmedQuery}-${nextMediaType}-${nextYearStart}-${nextYearEnd}`;
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    lastSearchRef.current = searchSignature;
    setSelectedIndex(null);
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      q: trimmedQuery,
      mediaType: nextMediaType,
      pageSize: "36",
      yearStart: nextYearStart,
      yearEnd: nextYearEnd,
    });

    try {
      const response = await fetch(`/api/nasa/media/search?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("NASA Image Library search failed.");
      const json = await response.json() as NasaSearchResponse;
      const nextItems = normalizeItems(json);
      if (lastSearchRef.current !== searchSignature) return;
      setItems(nextItems.length > 0 ? nextItems : createFallbackItems());
      setError(nextItems.length > 0 ? null : "NASA returned no matching assets, so COSMOS is showing a fallback exhibition wall.");
    } catch (searchError) {
      if (searchError instanceof DOMException && searchError.name === "AbortError") return;
      if (lastSearchRef.current !== searchSignature) return;
      setItems(createFallbackItems());
      setError("NASA Image Library is unavailable from this environment. Showing a fallback exhibition wall.");
    } finally {
      if (searchAbortRef.current === controller) searchAbortRef.current = null;
      if (lastSearchRef.current === searchSignature) setIsLoading(false);
    }
  }

  useEffect(() => {
    void runSearch();
    // The first load should happen once; later searches are explicit through the form/filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAiText("");
    setIsExplaining(false);
    explanationRequestRef.current = "";
  }, [selectedItem?.id]);

  useEffect(() => {
    return () => searchAbortRef.current?.abort();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch();
  }

  function selectCuratedPrompt(prompt: string) {
    setQuery(prompt);
    void runSearch(prompt);
  }

  function selectMediaType(nextMediaType: MediaType) {
    setMediaType(nextMediaType);
    void runSearch(query, { mediaType: nextMediaType });
  }

  function shiftSelection(direction: -1 | 1) {
    if (selectedIndex === null || items.length === 0) return;
    setSelectedIndex((selectedIndex + direction + items.length) % items.length);
  }

  async function explainItem(item: GalleryItem) {
    const explanationSignature = `${item.id}-${Date.now()}`;
    explanationRequestRef.current = explanationSignature;
    setAiText("");
    setIsExplaining(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Explain this NASA gallery image: ${item.title}`,
            },
          ],
          context: {
            page: "NASA Gallery",
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
        if (explanationRequestRef.current !== explanationSignature) return;
        setAiText((current) => `${current}${decoder.decode(value, { stream: true })}`);
      }
    } catch {
      if (explanationRequestRef.current !== explanationSignature) return;
      setAiText(
        "COSMOS could not complete the live AI request, so this exhibition guide is using the NASA title, description, date, center, and keywords as static context. Start by reading the NASA description, then inspect the image for scale, terrain, light, instruments, mission markings, and the observing system behind the record.",
      );
    } finally {
      if (explanationRequestRef.current === explanationSignature) setIsExplaining(false);
    }
  }

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <AnimatedStarfield />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_24%_0%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_78%_12%,rgba(167,139,250,0.14),transparent_32%),linear-gradient(180deg,rgba(3,4,10,0.08),#03040a_86%)]" />
      <div className="cosmos-orbital-grid fixed z-0" />
      <div className="noise-overlay fixed z-0" />

      <section className="relative z-10 min-h-screen px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
          <header className="glass-nav flex items-center justify-between rounded-full px-3 py-3 md:px-4">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-semibold text-cosmos-frost transition hover:bg-white/[0.06] hover:text-cosmos-white"
            >
              <ArrowLeft className="h-4 w-4" />
              COSMOS AI
            </Link>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cosmos-frost sm:flex">
              <ImageIcon className="h-3.5 w-3.5 text-oxygen-400" />
              NASA Image Library
            </div>
          </header>

          <GalleryHero
            query={query}
            setQuery={setQuery}
            mediaType={mediaType}
            setMediaType={selectMediaType}
            yearStart={yearStart}
            setYearStart={setYearStart}
            yearEnd={yearEnd}
            setYearEnd={setYearEnd}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            onCuratedPrompt={selectCuratedPrompt}
          />

          {error ? (
            <div className="rounded-[1rem] border border-solar-300/20 bg-solar-500/10 px-5 py-4 text-sm leading-6 text-solar-300">
              {error}
            </div>
          ) : null}

          <GalleryMasonry items={items} isLoading={isLoading} onSelect={setSelectedIndex} />
        </div>
      </section>

      {selectedItem ? (
        <FullscreenViewer
          item={selectedItem}
          aiText={aiText}
          isExplaining={isExplaining}
          onClose={() => setSelectedIndex(null)}
          onPrevious={() => shiftSelection(-1)}
          onNext={() => shiftSelection(1)}
          onAskCosmos={() => void explainItem(selectedItem)}
        />
      ) : null}
    </main>
  );
}

function GalleryHero({
  query,
  setQuery,
  mediaType,
  setMediaType,
  yearStart,
  setYearStart,
  yearEnd,
  setYearEnd,
  isLoading,
  onSubmit,
  onCuratedPrompt,
}: {
  query: string;
  setQuery: (query: string) => void;
  mediaType: MediaType;
  setMediaType: (mediaType: MediaType) => void;
  yearStart: string;
  setYearStart: (year: string) => void;
  yearEnd: string;
  setYearEnd: (year: string) => void;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCuratedPrompt: (prompt: string) => void;
}) {
  return (
    <section className="glass-panel rounded-[1.35rem]">
      <div className="relative z-10 grid gap-6 p-6 md:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:p-10">
        <div>
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-oxygen-400/25 bg-oxygen-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-oxygen-400">
            <Sparkles className="h-3.5 w-3.5" />
            Premium space exhibition
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-normal sm:text-6xl md:text-7xl xl:text-[5.65rem]">
            NASA Gallery
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-cosmos-frost md:text-lg md:leading-8">
            Search NASA&apos;s image library like a private photography archive: missions, planets, nebulae, launch systems, Earth observations, and the moments that made exploration visible.
          </p>
        </div>

        <form onSubmit={onSubmit} className="grid content-end gap-4">
          <div className="glass-card rounded-[1rem] p-3 transition focus-within:border-oxygen-400/[0.45] focus-within:shadow-glow-oxygen">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Search className="hidden h-5 w-5 flex-none text-oxygen-400 sm:block" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search NASA Image Library"
                placeholder="Search Webb, Apollo, Mars, nebulae..."
                className="h-12 min-w-0 flex-1 bg-transparent text-lg font-semibold text-cosmos-white outline-none placeholder:text-cosmos-slate"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-oxygen-500 px-5 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_150px_150px]">
            <div className="glass-card flex flex-wrap gap-2 rounded-[1rem] p-2">
              {mediaFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setMediaType(filter.value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    mediaType === filter.value
                      ? "bg-cosmos-white text-cosmos-black"
                      : "text-cosmos-mist hover:bg-white/[0.07] hover:text-cosmos-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <FilterInput label="From" value={yearStart} onChange={setYearStart} />
            <FilterInput label="To" value={yearEnd} onChange={setYearEnd} />
          </div>

          <div className="flex flex-wrap gap-2">
            {curatedQueries.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onCuratedPrompt(prompt)}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cosmos-mist transition hover:border-oxygen-400/30 hover:text-cosmos-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}

function FilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-[1rem] border border-white/10 bg-white/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        className="w-full bg-transparent text-sm font-bold text-cosmos-white outline-none"
      />
    </label>
  );
}

function GalleryMasonry({
  items,
  isLoading,
  onSelect,
}: {
  items: GalleryItem[];
  isLoading: boolean;
  onSelect: (index: number) => void;
}) {
  const loadingItems = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);

  if (isLoading && items.length === 0) {
    return (
      <div className="columns-1 gap-5 sm:columns-2 xl:columns-3 2xl:columns-4">
        {loadingItems.map((item) => (
          <div
            key={item}
            className="cosmos-skeleton mb-5 h-[360px] break-inside-avoid rounded-[1.25rem] border border-white/10 shadow-card"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <section className="glass-panel grid min-h-[340px] place-items-center rounded-[1.25rem] p-8 text-center">
        <div className="relative z-10">
          <Search className="mx-auto mb-5 h-10 w-10 text-oxygen-400" />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cosmos-mist">
            No media found
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal">No gallery signal yet.</h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-cosmos-frost">
            Try a mission, planet, observatory, NASA center, or a wider year range.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="columns-1 gap-5 sm:columns-2 xl:columns-3 2xl:columns-4">
      {items.map((item, index) => (
        <GalleryCard key={item.id} item={item} index={index} onSelect={onSelect} />
      ))}
    </section>
  );
}

function GalleryCard({
  item,
  index,
  onSelect,
}: {
  item: GalleryItem;
  index: number;
  onSelect: (index: number) => void;
}) {
  const heightClass = index % 5 === 0 ? "h-[420px] md:h-[520px]" : index % 3 === 0 ? "h-[360px] md:h-[430px]" : "h-[310px] md:h-[340px]";

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`glass-card group relative mb-5 w-full break-inside-avoid overflow-hidden rounded-[1.25rem] bg-cosmos-night text-left transition duration-300 hover:-translate-y-1 hover:border-oxygen-400/[0.35] hover:shadow-void ${heightClass}`}
    >
      {item.previewUrl ? (
        <Image
          src={item.previewUrl}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_24%,rgba(56,189,248,0.32),transparent_24%),radial-gradient(circle_at_70%_62%,rgba(167,139,250,0.24),transparent_28%),linear-gradient(135deg,#111827,#03040a)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-cosmos-black via-cosmos-black/[0.34] to-transparent" />
      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-cosmos-black/[0.45] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-frost backdrop-blur-xl">
        <ImageIcon className="h-3.5 w-3.5 text-oxygen-400" />
        {item.mediaType}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
          {item.center ?? "NASA"} / {formatDate(item.date)}
        </p>
        <h2 className="text-2xl font-semibold leading-[1.05] tracking-normal text-cosmos-white">
          {item.title}
        </h2>
        <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-oxygen-400 opacity-0 transition group-hover:opacity-100">
          Open exhibit
          <Maximize2 className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}

function FullscreenViewer({
  item,
  aiText,
  isExplaining,
  onClose,
  onPrevious,
  onNext,
  onAskCosmos,
}: {
  item: GalleryItem;
  aiText: string;
  isExplaining: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onAskCosmos: () => void;
}) {
  const manifestHref = safeExternalUrl(item.href);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-cosmos-black/95 p-4 backdrop-blur-2xl md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-viewer-title"
    >
      <div className="mx-auto grid min-h-full max-w-[1800px] gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="relative min-h-[52vh] overflow-hidden rounded-[1.25rem] border border-white/10 bg-cosmos-black shadow-void md:min-h-[58vh] lg:min-h-0">
          {item.previewUrl ? (
            <Image
              src={item.previewUrl}
              alt={item.title}
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_40%_30%,rgba(56,189,248,0.28),transparent_28%),linear-gradient(135deg,#111827,#03040a)]" />
          )}

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.12] bg-cosmos-black/[0.55] px-4 text-sm font-bold text-cosmos-white backdrop-blur-xl transition hover:bg-white/[0.08]"
            >
              <X className="h-4 w-4" />
              Close
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onPrevious}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.12] bg-cosmos-black/[0.55] text-cosmos-white backdrop-blur-xl transition hover:bg-white/[0.08]"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.12] bg-cosmos-black/[0.55] text-cosmos-white backdrop-blur-xl transition hover:bg-white/[0.08]"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        <aside className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[1.25rem] p-6">
          <div className="border-b border-white/10 pb-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
              Gallery Exhibit
            </p>
            <h2 id="gallery-viewer-title" className="mt-3 text-4xl font-semibold leading-[0.95] tracking-normal">
              {item.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge icon={<CalendarDays className="h-3.5 w-3.5" />} label={formatDate(item.date)} />
              <Badge icon={<ImageIcon className="h-3.5 w-3.5" />} label={item.mediaType} />
              {item.center ? <Badge icon={<Check className="h-3.5 w-3.5" />} label={item.center} /> : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-5">
            <section>
              <p className="mb-2 text-sm font-semibold text-cosmos-white">NASA description</p>
              <p className="text-sm leading-7 text-cosmos-frost">{item.description}</p>
            </section>

            <section className="mt-6 rounded-[1rem] border border-ai/[0.24] bg-ai/10 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md border border-ai/[0.35] bg-ai/15">
                    <Bot className="h-4 w-4 text-ai" />
                  </span>
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-ai">
                      COSMOS AI
                    </p>
                    <p className="text-sm font-semibold text-cosmos-white">Exhibition guide</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onAskCosmos}
                  disabled={isExplaining}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-cosmos-frost transition hover:bg-white/[0.1] disabled:opacity-50"
                >
                  {aiText ? "Regenerate" : "Ask COSMOS about this image"}
                </button>
              </div>
              {isExplaining && !aiText ? (
                <div className="flex items-center gap-2 text-sm text-cosmos-frost">
                  <Loader2 className="h-4 w-4 animate-spin text-ai" />
                  Reading NASA source context...
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-7 text-cosmos-frost">
                  {aiText ||
                    "COSMOS only generates an AI explanation after you ask. Until then, the NASA description and metadata remain available for exploration."}
                </p>
              )}
            </section>
          </div>

          {manifestHref ? (
            <a
              href={manifestHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.06] text-sm font-bold text-cosmos-white transition hover:bg-white/[0.1]"
            >
              Open NASA asset manifest
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Badge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-cosmos-frost">
      {icon}
      {label}
    </span>
  );
}
