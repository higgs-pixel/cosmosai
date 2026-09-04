import type { Metadata } from "next";
import { env, getOpenAiApiKey } from "@/lib/env";
import { MissionControlBriefing, type MissionControlBriefingData } from "@/components/briefing/mission-control-briefing";
import {
  getCoronalMassEjections,
  getGeomagneticStorms,
  getMarsRoverManifest,
  getMarsRoverPhotos,
  getNeoWsFeed,
  getSolarFlares,
  getTodaysApod,
  searchNasaImages,
  type ApodEntry,
} from "@/services/nasa";
import { getOpenAiModelCandidates, isOpenAiModelUnavailable } from "@/services/openai";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Daily Cosmic Briefing",
  description:
    "A Mission Control dashboard combining NASA APOD, near-Earth objects, DONKI space weather, Mars rover photos, mission highlights, and a guided space activity summary.",
  alternates: {
    canonical: "/briefing",
  },
  openGraph: {
    title: "Daily Cosmic Briefing | COSMOS AI",
    description:
      "A premium cinematic Mission Control briefing built from NASA signals and source-grounded summarization.",
    url: "/briefing",
  },
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type NeoWsAsteroid = {
  id?: string;
  name?: string;
  is_potentially_hazardous_asteroid?: boolean;
  estimated_diameter?: {
    meters?: {
      estimated_diameter_min?: number;
      estimated_diameter_max?: number;
    };
  };
  close_approach_data?: Array<{
    close_approach_date?: string;
    relative_velocity?: {
      kilometers_per_hour?: string;
      kilometers_per_second?: string;
    };
    miss_distance?: {
      kilometers?: string;
      lunar?: string;
    };
  }>;
};

type NeoWsFeedResponse = {
  element_count?: number;
  near_earth_objects?: Record<string, NeoWsAsteroid[]>;
};

type DonkiEvent = {
  activityID?: string;
  flrID?: string;
  cmeID?: string;
  gstID?: string;
  startTime?: string;
  peakTime?: string;
  classType?: string;
  sourceLocation?: string;
  note?: string;
  link?: string;
};

type MarsManifestResponse = {
  photo_manifest?: {
    name?: string;
    status?: string;
    latest_sol?: number;
    max_sol?: number;
    max_date?: string;
    total_photos?: number;
  };
};

type MarsPhotosResponse = {
  photos?: Array<{
    id?: number;
    sol?: number;
    img_src?: string;
    earth_date?: string;
    camera?: {
      full_name?: string;
      name?: string;
    };
    rover?: {
      name?: string;
      status?: string;
    };
  }>;
};

type ImageSearchResponse = {
  collection?: {
    items?: Array<{
      data?: Array<{
        title?: string;
        description?: string;
        date_created?: string;
        nasa_id?: string;
        center?: string;
      }>;
      links?: Array<{
        href?: string;
        rel?: string;
        render?: string;
      }>;
    }>;
  };
};

type NasaNewsItem = {
  title: string;
  link: string;
  pubDate?: string;
};

const newsFeeds = [
  "https://www.nasa.gov/news-release/feed/",
  "https://www.nasa.gov/rss/dyn/breaking_news.rss",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

async function settle<T>(task: Promise<T>) {
  try {
    return await task;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatKm(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unavailable";
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function readXmlTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : undefined;
}

function parseNewsFeed(xml: string): NasaNewsItem[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return items
    .map((item) => ({
      title: readXmlTag(item, "title") ?? "NASA news update",
      link: readXmlTag(item, "link") ?? "https://www.nasa.gov/news/",
      pubDate: readXmlTag(item, "pubDate"),
    }))
    .filter((item) => item.title)
    .slice(0, 4);
}

async function getNasaNews() {
  for (const feed of newsFeeds) {
    try {
      const response = await fetch(feed, {
        next: {
          revalidate: 60 * 60,
          tags: ["nasa", "nasa:news", "briefing:nasa-news"],
        },
      });

      if (!response.ok) continue;

      const items = parseNewsFeed(await response.text());
      if (items.length > 0) return items;
    } catch {
      continue;
    }
  }

  return [];
}

function normalizeApod(value: ApodEntry | ApodEntry[] | null): MissionControlBriefingData["apod"] {
  const apod = Array.isArray(value) ? value[0] : value;

  if (!apod) {
    return {
      title: "Awaiting NASA APOD Signal",
      date: todayIso(),
      description:
        "NASA's Astronomy Picture of the Day is unavailable in this environment. Add NASA_API_KEY to enable the live APOD panel.",
      mediaType: "image",
      imageUrl: "",
      sourceUrl: "/apod",
      credit: "NASA APOD",
      isFallback: true,
    };
  }

  return {
    title: apod.title,
    date: apod.date,
    description: apod.explanation,
    mediaType: apod.media_type,
    imageUrl: apod.thumbnail_url ?? apod.hdurl ?? apod.url,
    sourceUrl: apod.hdurl ?? apod.url,
    credit: apod.copyright ?? "NASA APOD",
    isFallback: apod.service_version === "fallback",
  };
}

function normalizeAsteroids(value: unknown): MissionControlBriefingData["asteroids"] {
  if (!isRecord(value)) {
    return {
      total: 0,
      hazardous: 0,
      safe: 0,
      closest: null,
      objects: [],
      isFallback: true,
    };
  }

  const response = value as NeoWsFeedResponse;
  const objects = Object.entries(response.near_earth_objects ?? {})
    .flatMap(([date, asteroids]) =>
      asteroids.map((asteroid) => {
        const approach = asteroid.close_approach_data?.[0];
        const min = asteroid.estimated_diameter?.meters?.estimated_diameter_min ?? 0;
        const max = asteroid.estimated_diameter?.meters?.estimated_diameter_max ?? min;
        const missDistanceKm = Number(approach?.miss_distance?.kilometers ?? 0);
        const velocityKph = Number(approach?.relative_velocity?.kilometers_per_hour ?? 0);

        return {
          id: asteroid.id ?? asteroid.name ?? `${date}-${missDistanceKm}`,
          name: asteroid.name?.replace(/[()]/g, "") ?? "Unnamed object",
          date: approach?.close_approach_date ?? date,
          sizeMeters: (min + max) / 2,
          velocityKph,
          missDistanceKm,
          missDistanceLunar: Number(approach?.miss_distance?.lunar ?? 0),
          hazardous: Boolean(asteroid.is_potentially_hazardous_asteroid),
        };
      }),
    )
    .filter((object) => object.missDistanceKm > 0 || object.velocityKph > 0)
    .sort((a, b) => a.missDistanceKm - b.missDistanceKm)
    .slice(0, 8);

  const total = response.element_count ?? objects.length;
  const hazardous = objects.filter((object) => object.hazardous).length;

  return {
    total,
    hazardous,
    safe: Math.max(0, total - hazardous),
    closest: objects[0] ?? null,
    objects,
    isFallback: false,
  };
}

function getDonkiEventTime(event: DonkiEvent) {
  return event.startTime ?? event.peakTime ?? "";
}

function normalizeDonkiEvents(events: unknown, type: "Solar Flare" | "CME" | "Geomagnetic Storm") {
  if (!Array.isArray(events)) return [];

  return events
    .map((event) => event as DonkiEvent)
    .map((event) => ({
      id: event.flrID ?? event.cmeID ?? event.gstID ?? event.activityID ?? `${type}-${getDonkiEventTime(event)}`,
      type,
      title:
        type === "Solar Flare" && event.classType
          ? `${event.classType} solar flare`
          : type === "CME"
            ? "Coronal mass ejection"
            : "Geomagnetic storm",
      time: getDonkiEventTime(event),
      source: event.sourceLocation ?? "NASA DONKI",
      note: event.note,
      link: event.link,
    }))
    .filter((event) => event.time || event.note)
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
}

function normalizeSpaceWeather(
  flares: unknown,
  cmes: unknown,
  storms: unknown,
): MissionControlBriefingData["spaceWeather"] {
  const events = [
    ...normalizeDonkiEvents(flares, "Solar Flare"),
    ...normalizeDonkiEvents(cmes, "CME"),
    ...normalizeDonkiEvents(storms, "Geomagnetic Storm"),
  ]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 8);

  return {
    counts: {
      flares: Array.isArray(flares) ? flares.length : 0,
      cmes: Array.isArray(cmes) ? cmes.length : 0,
      storms: Array.isArray(storms) ? storms.length : 0,
    },
    events,
    isFallback: events.length === 0,
  };
}

function normalizeMarsPhotos(
  manifestValue: unknown,
  photosValue: unknown,
): MissionControlBriefingData["mars"] {
  const manifest = isRecord(manifestValue) ? (manifestValue as MarsManifestResponse).photo_manifest : undefined;
  const photos = isRecord(photosValue) ? (photosValue as MarsPhotosResponse).photos ?? [] : [];

  return {
    rover: manifest?.name ?? "Perseverance",
    status: manifest?.status ?? photos[0]?.rover?.status ?? "active",
    latestSol: manifest?.latest_sol ?? manifest?.max_sol ?? photos[0]?.sol,
    latestEarthDate: manifest?.max_date ?? photos[0]?.earth_date,
    totalPhotos: manifest?.total_photos,
    photos: photos.slice(0, 4).map((photo) => ({
      id: String(photo.id ?? photo.img_src ?? "mars-photo"),
      imageUrl: photo.img_src ?? "",
      earthDate: photo.earth_date ?? manifest?.max_date ?? "",
      sol: photo.sol ?? manifest?.latest_sol,
      camera: photo.camera?.full_name ?? photo.camera?.name ?? "Mars rover camera",
    })),
    isFallback: photos.length === 0,
  };
}

function normalizeMissionHighlights(results: Array<unknown>): MissionControlBriefingData["missionHighlights"] {
  const highlights = results
    .flatMap((result) => {
      if (!isRecord(result)) return [];
      const items = (result as ImageSearchResponse).collection?.items ?? [];

      return items
        .map((item) => {
          const data = item.data?.[0];
          const imageUrl = item.links?.find((link) => link.render === "image" || link.rel === "preview")?.href;

          if (!data?.title) return null;

          return {
            id: data.nasa_id ?? data.title,
            title: data.title,
            description: data.description ?? "NASA mission media highlight.",
            date: data.date_created,
            center: data.center,
            imageUrl: imageUrl ?? "",
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
    })
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 6);

  if (highlights.length > 0) return highlights;

  return [
    {
      id: "fallback-artemis",
      title: "Artemis lunar systems",
      description: "NASA mission operations and lunar exploration milestones queued for live media highlights.",
      imageUrl: "",
      center: "NASA",
    },
    {
      id: "fallback-webb",
      title: "James Webb Space Telescope",
      description: "Infrared observatory discoveries and deep-space imagery prepared for COSMOS interpretation.",
      imageUrl: "",
      center: "NASA",
    },
    {
      id: "fallback-mars",
      title: "Mars surface operations",
      description: "Rover science, terrain imagery, and mission context from the Martian surface.",
      imageUrl: "",
      center: "NASA",
    },
  ];
}

function fallbackSummary(data: Omit<MissionControlBriefingData, "aiSummary">): MissionControlBriefingData["aiSummary"] {
  const bullets = [
    data.apod.title
      ? `Today's visual lead is NASA APOD: ${data.apod.title}.`
      : "NASA APOD is waiting for a live signal.",
    data.asteroids.total > 0
      ? `${data.asteroids.total} near-Earth objects are listed today; ${data.asteroids.hazardous} are marked potentially hazardous by NASA criteria.`
      : "No near-Earth object entries are available in the current NeoWs window.",
    data.spaceWeather.events.length > 0
      ? `${data.spaceWeather.events.length} recent DONKI event signals are visible across flares, CMEs, and storms.`
      : "DONKI space-weather activity is quiet or unavailable in this briefing window.",
    data.news[0]
      ? `NASA's latest headline: ${data.news[0].title}.`
      : "NASA news is quiet or unavailable in the current feed window.",
    data.mars.photos.length > 0
      ? `${data.mars.rover} returned recent surface imagery from sol ${data.mars.latestSol ?? "unknown"}.`
      : "Mars rover photo context is waiting for the latest NASA image feed.",
  ];

  return {
    headline: "Today's Mission Control picture is assembled from live NASA signals.",
    bullets,
    note:
      "COSMOS is using a conservative static summary for this briefing. Live AI summaries are used only when OpenAI is configured and the request succeeds.",
    generatedBy: "fallback",
  };
}

function extractOutputText(response: OpenAiResponse) {
  if (response.output_text) return response.output_text;

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && content.text)
    ?.text;
}

function stripJsonFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseAiSummary(
  text: string,
  data: Omit<MissionControlBriefingData, "aiSummary">,
): MissionControlBriefingData["aiSummary"] {
  try {
    const parsed = JSON.parse(stripJsonFence(text)) as Partial<MissionControlBriefingData["aiSummary"]>;
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];

    if (parsed.headline && parsed.note && bullets.length > 0) {
      return {
        headline: parsed.headline,
        bullets,
        note: parsed.note,
        generatedBy: "openai",
      };
    }
  } catch {
    return fallbackSummary(data);
  }

  return fallbackSummary(data);
}

async function generateAiSummary(
  data: Omit<MissionControlBriefingData, "aiSummary">,
): Promise<MissionControlBriefingData["aiSummary"]> {
  if (!env.openaiApiKey) {
    return fallbackSummary(data);
  }

  const prompt = [
    "You are COSMOS AI, a cinematic but scientifically careful Mission Control briefer.",
    "Summarize today's space activity using only the provided NASA-derived context.",
    "Do not overstate danger. Treat potentially hazardous asteroids as classification flags, not impact warnings.",
    "Return strict JSON with keys: headline, bullets, note.",
    "Use 4 or 5 concise bullets. Keep the tone premium, operational, and source-grounded.",
    "",
    `Date: ${data.date}`,
    `APOD: ${data.apod.title}. ${data.apod.description}`,
    `Near-Earth objects: total ${data.asteroids.total}, hazardous ${data.asteroids.hazardous}, closest ${data.asteroids.closest?.name ?? "unavailable"} at ${formatKm(data.asteroids.closest?.missDistanceKm)} km.`,
    `DONKI: ${data.spaceWeather.counts.flares} flares, ${data.spaceWeather.counts.cmes} CMEs, ${data.spaceWeather.counts.storms} geomagnetic storms. Latest events: ${data.spaceWeather.events.map((event) => `${event.type} ${event.title}`).join(" | ") || "none"}.`,
    `NASA news: ${data.news.map((item) => item.title).join(" | ") || "unavailable"}.`,
    `Mars: ${data.mars.rover}, status ${data.mars.status}, latest sol ${data.mars.latestSol ?? "unavailable"}, photos ${data.mars.photos.length}.`,
    `Mission highlights: ${data.missionHighlights.map((item) => item.title).join(" | ") || "unavailable"}.`,
  ].join("\n");

  try {
    let outputText: string | undefined;
    const modelCandidates = getOpenAiModelCandidates();

    for (const [index, model] of modelCandidates.entries()) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
        headers: {
          Authorization: `Bearer ${getOpenAiApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: prompt,
          max_output_tokens: 620,
        }),
        next: {
          revalidate: 60 * 60,
          tags: ["openai", "briefing", `briefing:${data.date}`],
        },
      });

      if (!response.ok) {
        const upstreamMessage = await response.text();
        const nextModel = modelCandidates[index + 1];
        if (nextModel && isOpenAiModelUnavailable(response.status, upstreamMessage)) {
          console.warn({
            scope: "cosmos-briefing-page",
            event: "openai_model_fallback",
            fromModel: model,
            toModel: nextModel,
            status: response.status,
          });
          continue;
        }
        return fallbackSummary(data);
      }

      const json = (await response.json()) as OpenAiResponse;
      outputText = extractOutputText(json);
      break;
    }

    return outputText ? parseAiSummary(outputText, data) : fallbackSummary(data);
  } catch {
    return fallbackSummary(data);
  }
}

async function loadBriefingData(): Promise<MissionControlBriefingData> {
  const date = todayIso();
  const weekStart = addDaysIso(date, -7);

  const [apod, asteroidFeed, flares, cmes, storms, manifest, missionArtemis, missionWebb, missionMars] =
    await Promise.all([
      settle(getTodaysApod()),
      settle(getNeoWsFeed({ startDate: date, endDate: date })),
      settle(getSolarFlares({ startDate: weekStart, endDate: date })),
      settle(getCoronalMassEjections({ startDate: weekStart, endDate: date })),
      settle(getGeomagneticStorms({ startDate: weekStart, endDate: date })),
      settle(getMarsRoverManifest({ rover: "perseverance" })),
      settle(searchNasaImages({ q: "Artemis", mediaType: ["image"], pageSize: 2 })),
      settle(searchNasaImages({ q: "James Webb Space Telescope", mediaType: ["image"], pageSize: 2 })),
      settle(searchNasaImages({ q: "Perseverance Mars rover", mediaType: ["image"], pageSize: 2 })),
    ]);
  const news = await settle(getNasaNews());

  const latestSol = isRecord(manifest)
    ? (manifest as MarsManifestResponse).photo_manifest?.latest_sol ??
      (manifest as MarsManifestResponse).photo_manifest?.max_sol
    : undefined;

  const marsPhotos = latestSol
    ? await settle(getMarsRoverPhotos({ rover: "perseverance", sol: latestSol, page: 1 }))
    : null;

  const baseData: Omit<MissionControlBriefingData, "aiSummary"> = {
    date,
    generatedAt: new Date().toISOString(),
    apod: normalizeApod(apod),
    asteroids: normalizeAsteroids(asteroidFeed),
    spaceWeather: normalizeSpaceWeather(flares, cmes, storms),
    mars: normalizeMarsPhotos(manifest, marsPhotos),
    news: news ?? [],
    missionHighlights: normalizeMissionHighlights([missionArtemis, missionWebb, missionMars]),
  };

  return {
    ...baseData,
    aiSummary: await generateAiSummary(baseData),
  };
}

export default async function Page() {
  const data = await loadBriefingData();

  return <MissionControlBriefing data={data} />;
}
