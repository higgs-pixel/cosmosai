import { NextResponse } from "next/server";
import { env, getOpenAiApiKey } from "@/lib/env";
import {
  getCoronalMassEjections,
  getGeomagneticStorms,
  getNeoWsFeed,
  getSolarFlares,
  getTodaysApod,
  type ApodEntry,
} from "@/services/nasa";
import { getOpenAiModelCandidates, isOpenAiModelUnavailable } from "@/services/openai";

export const revalidate = 3600;

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
  name?: string;
  is_potentially_hazardous_asteroid?: boolean;
  close_approach_data?: Array<{
    miss_distance?: {
      kilometers?: string;
    };
  }>;
};

type NeoWsFeedResponse = {
  element_count?: number;
  near_earth_objects?: Record<string, NeoWsAsteroid[]>;
};

type NasaNewsItem = {
  title: string;
  link: string;
  pubDate?: string;
};

type AsteroidBriefing = {
  total: number;
  hazardous: number;
  safe: number;
  closestName?: string;
  closestMissKm?: number;
};

type SpaceWeatherBriefing = {
  flares: number;
  cmes: number;
  storms: number;
};

type DailyBriefingContext = {
  date: string;
  apod?: Pick<ApodEntry, "date" | "explanation" | "media_type" | "title" | "url" | "hdurl" | "thumbnail_url">;
  asteroids: AsteroidBriefing;
  spaceWeather: SpaceWeatherBriefing;
  news: NasaNewsItem[];
};

type DailyBriefingSummary = {
  headline: string;
  bullets: string[];
  note: string;
  generatedBy: "openai" | "fallback";
};

const newsFeeds = [
  "https://www.nasa.gov/news-release/feed/",
  "https://www.nasa.gov/rss/dyn/breaking_news.rss",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

function normalizeApod(entry: ApodEntry | ApodEntry[] | null) {
  const apod = Array.isArray(entry) ? entry[0] : entry;

  if (!apod) return undefined;

  return {
    date: apod.date,
    explanation: apod.explanation,
    hdurl: apod.hdurl,
    media_type: apod.media_type,
    thumbnail_url: apod.thumbnail_url,
    title: apod.title,
    url: apod.url,
  };
}

function normalizeAsteroids(feed: unknown): AsteroidBriefing {
  if (!isRecord(feed)) {
    return { total: 0, hazardous: 0, safe: 0 };
  }

  const response = feed as NeoWsFeedResponse;
  const asteroids = Object.values(response.near_earth_objects ?? {}).flat();
  const total = response.element_count ?? asteroids.length;
  const hazardous = asteroids.filter((asteroid) => asteroid.is_potentially_hazardous_asteroid).length;
  const closest = asteroids.reduce<{ name?: string; missKm: number } | null>((current, asteroid) => {
    const missKm = Number(asteroid.close_approach_data?.[0]?.miss_distance?.kilometers ?? Number.POSITIVE_INFINITY);

    if (!Number.isFinite(missKm)) return current;
    if (!current || missKm < current.missKm) {
      return {
        name: asteroid.name?.replace(/[()]/g, ""),
        missKm,
      };
    }

    return current;
  }, null);

  return {
    total,
    hazardous,
    safe: Math.max(0, total - hazardous),
    closestName: closest?.name,
    closestMissKm: closest?.missKm,
  };
}

function countEvents(events: unknown) {
  return Array.isArray(events) ? events.length : 0;
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

      const xml = await response.text();
      const items = parseNewsFeed(xml);
      if (items.length > 0) return items;
    } catch {
      continue;
    }
  }

  return [];
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function formatKm(value?: number) {
  if (!value) return undefined;
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function fallbackSummary(context: DailyBriefingContext): DailyBriefingSummary {
  const bullets = [
    context.spaceWeather.flares > 0
      ? `${plural(context.spaceWeather.flares, "solar flare")} detected by NASA DONKI today.`
      : "No solar flares are visible in the current DONKI briefing window.",
    context.asteroids.total > 0
      ? `${plural(context.asteroids.total, "near-Earth asteroid")} logged, with ${context.asteroids.safe} safely classified as non-hazardous in this view.`
      : "No near-Earth asteroid approaches are visible in the current NeoWs window.",
    context.news[0]
      ? `NASA's latest headline: ${context.news[0].title}.`
      : "NASA news is quiet in the current feed window.",
  ];

  if (context.asteroids.closestName && context.asteroids.closestMissKm) {
    bullets.splice(
      2,
      0,
      `${context.asteroids.closestName} is the closest listed approach at roughly ${formatKm(context.asteroids.closestMissKm)} km.`,
    );
  }

  return {
    headline: context.apod?.title
      ? `Today's briefing opens with ${context.apod.title}.`
      : "Today's cosmic signal is still resolving.",
    bullets: bullets.slice(0, 4),
    note:
      "COSMOS AI prepared this briefing from NASA APOD, NeoWs, DONKI, and NASA news signals with conservative fallbacks.",
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

function parseAiSummary(text: string, context: DailyBriefingContext): DailyBriefingSummary {
  try {
    const parsed = JSON.parse(stripJsonFence(text)) as Partial<DailyBriefingSummary>;
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [];

    if (parsed.headline && bullets.length > 0 && parsed.note) {
      return {
        headline: parsed.headline,
        bullets,
        note: parsed.note,
        generatedBy: "openai",
      };
    }
  } catch {
    return fallbackSummary(context);
  }

  return fallbackSummary(context);
}

async function generateDailySummary(context: DailyBriefingContext): Promise<DailyBriefingSummary> {
  if (!env.openaiApiKey) {
    return fallbackSummary(context);
  }

  const prompt = [
    "You are COSMOS AI, a cinematic but scientifically careful space guide.",
    "Create today's daily cosmic briefing from only the provided NASA-derived context.",
    "Do not overstate hazard, danger, or certainty. Avoid raw JSON in prose.",
    "Return strict JSON with keys: headline, bullets, note.",
    "The headline should feel premium and concise. Bullets should be short, specific, and source-grounded.",
    "",
    `Date: ${context.date}`,
    `APOD title: ${context.apod?.title ?? "Unavailable"}`,
    `APOD description: ${context.apod?.explanation ?? "Unavailable"}`,
    `Asteroids: total ${context.asteroids.total}, hazardous ${context.asteroids.hazardous}, safe ${context.asteroids.safe}, closest ${context.asteroids.closestName ?? "Unavailable"} at ${formatKm(context.asteroids.closestMissKm) ?? "Unavailable"} km`,
    `Space weather: ${context.spaceWeather.flares} flares, ${context.spaceWeather.cmes} CMEs, ${context.spaceWeather.storms} geomagnetic storms`,
    `NASA news headlines: ${context.news.map((item) => item.title).join(" | ") || "Unavailable"}`,
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
          max_output_tokens: 520,
        }),
        next: {
          revalidate: 60 * 60,
          tags: ["openai", "briefing", `briefing:${context.date}`],
        },
      });

      if (!response.ok) {
        const upstreamMessage = await response.text();
        const nextModel = modelCandidates[index + 1];
        if (nextModel && isOpenAiModelUnavailable(response.status, upstreamMessage)) {
          console.warn({
            scope: "cosmos-briefing-api",
            event: "openai_model_fallback",
            fromModel: model,
            toModel: nextModel,
            status: response.status,
          });
          continue;
        }
        return fallbackSummary(context);
      }

      const json = (await response.json()) as OpenAiResponse;
      outputText = extractOutputText(json);
      break;
    }

    return outputText ? parseAiSummary(outputText, context) : fallbackSummary(context);
  } catch {
    return fallbackSummary(context);
  }
}

export async function GET() {
  const date = todayIso();
  const [apod, asteroidFeed, flares, cmes, storms, news] = await Promise.all([
    settle(getTodaysApod()),
    settle(getNeoWsFeed({ startDate: date, endDate: date })),
    settle(getSolarFlares({ startDate: date, endDate: date })),
    settle(getCoronalMassEjections({ startDate: date, endDate: date })),
    settle(getGeomagneticStorms({ startDate: date, endDate: date })),
    settle(getNasaNews()),
  ]);

  const context: DailyBriefingContext = {
    date,
    apod: normalizeApod(apod),
    asteroids: normalizeAsteroids(asteroidFeed),
    spaceWeather: {
      flares: countEvents(flares),
      cmes: countEvents(cmes),
      storms: countEvents(storms),
    },
    news: news ?? [],
  };

  const summary = await generateDailySummary(context);

  return NextResponse.json({
    ...summary,
    date: context.date,
    apod: context.apod
      ? {
          date: context.apod.date,
          mediaType: context.apod.media_type,
          title: context.apod.title,
          url: context.apod.thumbnail_url ?? context.apod.hdurl ?? context.apod.url,
        }
      : null,
    metrics: {
      asteroids: context.asteroids,
      spaceWeather: context.spaceWeather,
      news: {
        count: context.news.length,
      },
    },
    news: context.news,
  });
}
