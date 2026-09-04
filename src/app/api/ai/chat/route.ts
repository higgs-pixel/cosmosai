import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPrimaryAiProvider, streamAiChatResponse } from "@/lib/ai/provider";
import { classifyCosmosQuery, intentNeedsScholarlyRetrieval, type CosmosQueryIntent } from "@/lib/ai/query-intent";
import { getAuthoritativeEvidence } from "@/lib/ai/authoritative-evidence";
import { buildCosmosToolContext } from "@/lib/ai/tool-context";
import { expandRetrievalQuery } from "@/lib/retrieval/query-expansion";
import { retrieveRankedResearchSources } from "@/lib/retrieval/research-retrieval";
import type { RankedSource } from "@/lib/retrieval/relevance-score";
import {
  getCoronalMassEjections,
  getGeomagneticStorms,
  getNeoWsFeed,
  getSolarFlares,
  getTodaysApod,
  searchNasaImages,
  type ApodEntry,
} from "@/services/nasa";
import {
  createChatCacheKey,
  encodeSourceCardsHeader,
  fallbackReasonToModelStatus,
  fallbackGuideAnswer,
  getCachedChatResponse,
  setCachedChatResponse,
  getOpenAiModelStatus,
  OPENAI_FALLBACK_MODEL,
  OPENAI_PREFERRED_MODEL,
  isCosmosAudienceMode,
  isCosmosChatMode,
  latestUserMessage,
  streamText,
  type CosmosAudienceMode,
  type CosmosChatContext,
  type CosmosChatMessage,
  type CosmosChatMode,
  type CosmosNasaSourceCard,
} from "@/services/openai";

export const runtime = "nodejs";

type ChatRequest = {
  messages?: unknown;
  context?: unknown;
  mode?: unknown;
  audience?: unknown;
};

type ImageSearchResponse = {
  collection?: {
    items?: Array<{
      href?: string;
      data?: Array<{
        title?: string;
        description?: string;
        nasa_id?: string;
        date_created?: string;
        media_type?: string;
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

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 6;
const DAILY_RATE_LIMIT_WINDOW_MS = 86_400_000;
const DAILY_RATE_LIMIT_MAX_REQUESTS = 50;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_CONTEXT_LENGTH = 2_500;
const minuteRateLimits = new Map<string, RateLimitEntry>();
const dailyRateLimits = new Map<string, RateLimitEntry>();

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function logChatRoute(
  level: "info" | "warn" | "error",
  event: string,
  details: Record<string, unknown> = {},
) {
  const payload = {
    scope: "cosmos-ai-chat-route",
    event,
    ...details,
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

function clientKey(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

function checkWindowLimit(
  limits: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  maxRequests: number,
) {
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || entry.resetAt <= now) {
    limits.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null;
  }

  if (entry.count >= maxRequests) {
    return Math.ceil((entry.resetAt - now) / 1000);
  }

  entry.count += 1;
  return null;
}

function checkRateLimit(request: NextRequest) {
  const key = clientKey(request);
  const minuteRetryAfter = checkWindowLimit(minuteRateLimits, key, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS);
  if (minuteRetryAfter !== null) {
    return { retryAfter: minuteRetryAfter, scope: "minute" as const };
  }

  const dailyRetryAfter = checkWindowLimit(dailyRateLimits, key, DAILY_RATE_LIMIT_WINDOW_MS, DAILY_RATE_LIMIT_MAX_REQUESTS);
  if (dailyRetryAfter !== null) {
    return { retryAfter: dailyRetryAfter, scope: "daily" as const };
  }

  return null;
}

function sanitizeText(value: unknown, maxLength = MAX_MESSAGE_LENGTH) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function validateMessages(value: unknown): CosmosChatMessage[] | string {
  if (!Array.isArray(value)) {
    return "messages must be an array.";
  }

  const messages = value.slice(-MAX_MESSAGES).map((message) => {
    if (
      typeof message !== "object" ||
      message === null ||
      !("role" in message) ||
      !("content" in message)
    ) {
      return null;
    }

    const role = (message as { role?: unknown }).role;
    const content = sanitizeText((message as { content?: unknown }).content);

    if ((role !== "user" && role !== "assistant") || !content) {
      return null;
    }

    return {
      role,
      content,
    } satisfies CosmosChatMessage;
  });

  if (messages.some((message) => message === null)) {
    return "messages contains an invalid chat message.";
  }

  return messages as CosmosChatMessage[];
}

function validateContext(value: unknown): CosmosChatContext {
  if (typeof value !== "object" || value === null) return {};

  const record = value as Record<string, unknown>;

  return {
    page: sanitizeText(record.page, 120),
    title: sanitizeText(record.title, 180),
    description: sanitizeText(record.description, MAX_CONTEXT_LENGTH),
    imageUrl: sanitizeText(record.imageUrl, 800),
  };
}

function normalizeMode(value: unknown): CosmosChatMode {
  return isCosmosChatMode(value) ? value : "general";
}

function normalizeAudience(value: unknown): CosmosAudienceMode {
  return isCosmosAudienceMode(value) ? value : "student";
}

function inferNasaQuery(prompt: string, mode: CosmosChatMode) {
  const normalized = prompt.toLowerCase();

  if (mode === "research") return prompt.split(/\s+/).slice(0, 8).join(" ");
  if (mode === "mars-image") return "mars rover";
  if (mode === "apod") return "astronomy picture of the day";
  if (mode === "planet") return "planet";
  if (mode === "briefing") return "NASA astronomy";
  if (mode === "nasa-media") return prompt.split(/\s+/).slice(0, 8).join(" ");
  if (normalized.includes("black hole")) return "black hole";
  if (normalized.includes("exoplanet")) return "exoplanet";
  if (normalized.includes("mars")) return "mars rover";
  if (normalized.includes("moon") || normalized.includes("lunar")) return "moon";
  if (normalized.includes("nebula")) return "nebula";
  if (normalized.includes("galaxy")) return "galaxy";
  if (normalized.includes("image") || normalized.includes("picture")) return "astronomy";

  return prompt.split(/\s+/).slice(0, 8).join(" ");
}

function summarizeApod(apod: ApodEntry) {
  return [
    `APOD title: ${apod.title}`,
    `APOD date: ${apod.date}`,
    `APOD media type: ${apod.media_type}`,
    `APOD NASA description: ${apod.explanation}`,
  ].join("\n");
}

function summarizeImageResults(results: ImageSearchResponse) {
  const items = results.collection?.items ?? [];

  return items
    .slice(0, 2)
    .map((item, index) => {
      const data = item.data?.[0];
      if (!data) return null;

      return [
        `NASA media result ${index + 1}: ${data.title ?? "Untitled"}`,
        `NASA ID: ${data.nasa_id ?? "unknown"}`,
        `Media type: ${data.media_type ?? "unknown"}`,
        `Date: ${data.date_created ?? "unknown"}`,
        `Description: ${data.description ?? "No description available."}`,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

type NasaContextResult = {
  text: string;
  sources: string[];
  sourceCards: CosmosNasaSourceCard[];
};

export function GET() {
  const primaryProvider = getPrimaryAiProvider();
  const modelStatus = primaryProvider === "groq"
    ? "live_ai"
    : getOpenAiModelStatus(env.openaiModel, env.openaiApiKey ? "openai" : "fallback");

  return NextResponse.json(
    {
      primaryProvider,
      hasGroqKey: Boolean(env.groqApiKey),
      configuredGroqModel: env.groqModel,
      hasOpenAiKey: Boolean(env.openaiApiKey),
      configuredModel: env.openaiModel,
      preferredModel: OPENAI_PREFERRED_MODEL,
      fallbackModel: OPENAI_FALLBACK_MODEL,
      modelStatus,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function shouldLoadDailyBriefing(prompt: string, mode: CosmosChatMode) {
  const normalized = prompt.toLowerCase();
  return (
    mode === "briefing" ||
    (mode === "general" &&
      (normalized.includes("today") ||
        normalized.includes("briefing") ||
        normalized.includes("space weather") ||
        normalized.includes("space activity")))
  );
}

type NeoWsBriefingAsteroid = {
  name?: string;
  is_potentially_hazardous_asteroid?: boolean;
  close_approach_data?: Array<{
    close_approach_date?: string;
    miss_distance?: {
      kilometers?: string;
      lunar?: string;
    };
  }>;
};

type NeoWsBriefingResponse = {
  element_count?: number;
  near_earth_objects?: Record<string, NeoWsBriefingAsteroid[]>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function summarizeCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function summarizeBriefingAsteroids(feed: unknown) {
  if (typeof feed !== "object" || feed === null) return "Near-Earth object data is unavailable.";

  const response = feed as NeoWsBriefingResponse;
  const asteroids = Object.values(response.near_earth_objects ?? {}).flat();
  const total = response.element_count ?? asteroids.length;
  const hazardous = asteroids.filter((asteroid) => asteroid.is_potentially_hazardous_asteroid).length;
  const safe = Math.max(0, total - hazardous);

  return `${total} near-Earth objects are visible in the current NeoWs window; ${safe} are non-hazardous in this view and ${hazardous} carry NASA's potentially hazardous classification.`;
}

function formatDistanceKm(value?: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return `${Math.round(numeric).toLocaleString("en-US")} km`;
}

function apodSourceUrl(apod: ApodEntry) {
  const compactDate = apod.date?.replaceAll("-", "").slice(2);
  return compactDate && compactDate.length === 6
    ? `https://apod.nasa.gov/apod/ap${compactDate}.html`
    : "https://apod.nasa.gov/apod/astropix.html";
}

function imageLibrarySearchUrl(query: string) {
  return `https://images.nasa.gov/search?q=${encodeURIComponent(query)}`;
}

function createApodSourceCard(apod: ApodEntry): CosmosNasaSourceCard {
  return {
    id: `apod-${apod.date}`,
    type: "apod",
    title: apod.title,
    subtitle: "Astronomy Picture of the Day",
    date: apod.date,
    href: apodSourceUrl(apod),
    details: [
      { label: "Source", value: "NASA APOD" },
      { label: "Media", value: apod.media_type },
    ],
  };
}

function createImageSourceCard(query: string, results: ImageSearchResponse): CosmosNasaSourceCard | undefined {
  const item = results.collection?.items?.[0];
  const data = item?.data?.[0];
  if (!data) return undefined;

  return {
    id: `nasa-media-${data.nasa_id ?? query}`,
    type: "nasa-media",
    title: data.title ?? `NASA media search: ${query}`,
    subtitle: data.nasa_id ? `NASA ID ${data.nasa_id}` : "NASA Image and Video Library",
    date: data.date_created?.slice(0, 10),
    href: data.nasa_id ? `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}` : imageLibrarySearchUrl(query),
    details: [
      { label: "Source", value: "NASA Image Library" },
      { label: "Media", value: data.media_type ?? "image" },
      { label: "Query", value: query },
    ],
  };
}

function createNeoWsSourceCard(feed: unknown, date: string): CosmosNasaSourceCard | undefined {
  if (typeof feed !== "object" || feed === null) return undefined;

  const response = feed as NeoWsBriefingResponse;
  const asteroids = Object.values(response.near_earth_objects ?? {}).flat();
  const closest = asteroids
    .map((asteroid) => {
      const approach = asteroid.close_approach_data?.[0];
      const missKm = Number(approach?.miss_distance?.kilometers);
      return {
        asteroid,
        approach,
        missKm,
      };
    })
    .filter((item) => Number.isFinite(item.missKm))
    .sort((left, right) => left.missKm - right.missKm)[0];
  const hazardous = asteroids.filter((asteroid) => asteroid.is_potentially_hazardous_asteroid).length;
  const total = response.element_count ?? asteroids.length;

  return {
    id: `neows-${date}`,
    type: "asteroid",
    title: closest?.asteroid.name ?? "Near-Earth object activity",
    subtitle: "NASA NeoWs close-approach feed",
    date,
    href: "https://api.nasa.gov/",
    details: [
      { label: "Objects", value: String(total) },
      { label: "Hazard flags", value: String(hazardous) },
      closest?.approach?.miss_distance?.kilometers
        ? { label: "Closest miss", value: formatDistanceKm(closest.approach.miss_distance.kilometers) ?? "Unavailable" }
        : undefined,
    ].filter((detail): detail is { label: string; value: string } => Boolean(detail)),
  };
}

function createRankedResearchSourceCard(source: RankedSource): CosmosNasaSourceCard {
  return {
    id: source.id,
    type: source.provider === "arXiv" ? "arxiv" : "research",
    title: source.title,
    subtitle: [source.provider, source.source].filter(Boolean).join(" • "),
    date: source.publishedAt ?? (source.year ? String(source.year) : undefined),
    href: source.url,
    authors: source.authors,
    year: source.year,
    abstract: source.abstract?.slice(0, 420),
    citationCount: source.citationCount,
    doi: source.doi,
    journal: source.source,
    provider: source.provider,
    arxivId: source.arxivId,
    relevanceScore: source.score,
    relevanceReason: source.relevanceReason,
    matchLevel: source.matchLevel,
    citationLabel: source.citationLabel,
    sourceClass: source.sourceClass,
    isDirectMatch: source.isDirectMatch,
    matchedTerms: source.matchedTerms,
    benchmarkCategory: source.benchmarkCategory,
    details: [
      source.citationLabel ? { label: "Citation label", value: source.citationLabel } : undefined,
      { label: "Provider", value: source.provider },
      { label: "Relevance", value: source.matchLevel === "direct" ? "Direct match" : source.matchLevel === "context" ? "Scholarly context" : "Broader background" },
      source.year ? { label: "Year", value: String(source.year) } : undefined,
      source.doi ? { label: "DOI", value: source.doi } : undefined,
      source.arxivId ? { label: "arXiv", value: source.arxivId } : undefined,
    ].filter((detail): detail is { label: string; value: string } => Boolean(detail)),
  };
}

async function buildOpenAlexContext(
  prompt: string,
  mode: CosmosChatMode,
  requestId: string,
  intent: CosmosQueryIntent,
): Promise<{
  text: string;
  sources: string[];
  sourceCards: CosmosNasaSourceCard[];
  query?: string;
  paperCount: number;
  contextPassedToGpt: boolean;
}> {
  const researchTriggered = intentNeedsScholarlyRetrieval(intent) || mode === "research";
  logChatRoute("info", "research_detection", {
    requestId,
    researchTriggered,
    mode,
    promptPreview: prompt.slice(0, 160),
  });

  if (!researchTriggered) {
    return { text: "", sources: [], sourceCards: [], paperCount: 0, contextPassedToGpt: false };
  }

  const startedAt = Date.now();
  const query = prompt;

  try {
    logChatRoute("info", "ranked_research_search_start", {
      requestId,
      query,
      originalPromptPreview: prompt.slice(0, 160),
      limit: 4,
    });

    const requestedLimit = intent.requestedSourceCount ?? (intent.mode === "scholarly-sources" ? 3 : 4);
    const result = await retrieveRankedResearchSources(query, requestedLimit, {
      requiresDirectSources: intent.requiresDirectSources || intent.mode === "scholarly-sources",
    });
    const papers = result.sources;
    const directCount = papers.filter((paper) => paper.matchLevel === "direct").length;
    const summary = papers.map((paper) => [
      `Citation label: ${paper.citationLabel}`,
      `Title: ${paper.title}`,
      `Provider: ${paper.provider}`,
      `Authors: ${paper.authors?.join(", ") || "Unavailable"}`,
      `Year: ${paper.year ?? "Unavailable"}`,
      `Journal/source: ${paper.source ?? "Unavailable"}`,
      `Citation count: ${paper.citationCount ?? "Unavailable"}`,
      `DOI: ${paper.doi ?? "Unavailable"}`,
      `arXiv ID: ${paper.arxivId ?? "Unavailable"}`,
      `URL: ${paper.url ?? "Unavailable"}`,
      `Relevance: ${paper.relevanceReason}`,
      `Source hierarchy: ${paper.sourceClass ?? "specialist"}`,
      `Match class: ${paper.matchLevel}`,
      `Abstract: ${paper.abstract ?? "Unavailable"}`,
    ].join("\n")).join("\n\n");

    logChatRoute("info", "ranked_research_context_loaded", {
      requestId,
      query,
      elapsedMs: Date.now() - startedAt,
      relevantPaperCount: papers.length,
      directPaperCount: directCount,
      providers: result.providers,
      providerQueries: result.providerQueries,
      retrievedCount: result.retrievedCount,
      filteredCount: result.filteredCount,
      qualityPassed: result.qualityPassed,
      qualityIssues: result.qualityIssues,
    });

    if (directCount < 2) {
      const limitedMessage = [
        `Research query preserved as: "${result.queryProfile.originalQuery}".`,
        "I found limited highly relevant scholarly results for this query. I can still explain the topic using astronomy context, but I will not name papers that were not retrieved.",
        summary ? `Related scholarly context:\n${summary}` : "No sufficiently relevant paper metadata remained after ranking.",
      ].join("\n");

      return {
        text: limitedMessage,
        sources: result.providers,
        sourceCards: papers.map(createRankedResearchSourceCard),
        query,
        paperCount: papers.length,
        contextPassedToGpt: papers.length > 0,
      };
    }

    return {
      text: [
        "SCHOLARLY_RESEARCH_CONTEXT_ATTACHED.",
        result.providers.includes("OpenAlex") ? "OPENALEX_RESEARCH_CONTEXT_ATTACHED." : undefined,
        `Original research query: "${result.queryProfile.originalQuery}".`,
        `Exact query variants: ${result.queryProfile.exactQueries.join(" | ")}`,
        `Targeted expansions: ${result.queryProfile.expandedQueries.join(" | ") || "None"}`,
        `Source-set quality: ${result.qualityPassed ? "passed" : `limited (${result.qualityIssues.join(", ")})`}.`,
        "Use only the ranked records below when naming papers or citations. Cite claims with the exact supplied bracketed citation labels. Missing metadata is unavailable.",
        "",
        summary,
      ].filter((line): line is string => typeof line === "string").join("\n"),
      sources: result.providers,
      sourceCards: papers.map(createRankedResearchSourceCard),
      query,
      paperCount: papers.length,
      contextPassedToGpt: true,
    };
  } catch (error) {
    logChatRoute("warn", "ranked_research_context_unavailable", {
      requestId,
      query,
      elapsedMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : "Unknown research context error.",
    });

    return {
      text: "Live scholarly context is unavailable for this request. No paper metadata is attached.",
      sources: [],
      sourceCards: [],
      query,
      paperCount: 0,
      contextPassedToGpt: false,
    };
  }
}

function buildAuthoritativeContext(intent: CosmosQueryIntent): NasaContextResult {
  const evidence = getAuthoritativeEvidence(intent);
  if (evidence.length === 0) return { text: "", sources: [], sourceCards: [] };

  return {
    text: [
      "AUTHORITATIVE_FALSE_PREMISE_EVIDENCE_ATTACHED.",
      "Use these official records to correct the premise. Do not claim that NASA confirmed anything beyond their exact evidence summaries.",
      ...evidence.map((source) => [
        `Official citation: [${source.provider}: ${source.title}]`,
        `Title: ${source.title}`,
        `Provider: ${source.provider}`,
        `Date: ${source.date ?? "Unavailable"}`,
        `URL: ${source.url}`,
        `Evidence: ${source.evidence}`,
        `Relevance: ${source.relevanceReason}`,
      ].join("\n")),
    ].join("\n\n"),
    sources: Array.from(new Set(evidence.map((source) => source.provider))),
    sourceCards: evidence.map((source) => ({
      id: source.id,
      type: "nasa-media" as const,
      title: source.title,
      subtitle: source.provider,
      date: source.date,
      href: source.url,
      provider: source.provider,
      relevanceReason: source.relevanceReason,
      details: [
        { label: "Classification", value: "Official NASA source" },
        { label: "Evidence", value: source.evidence },
      ],
    })),
  };
}

async function summarizeDailyBriefingSignals(): Promise<{
  text: string;
  sourceCards: CosmosNasaSourceCard[];
}> {
  const date = todayIso();
  const [asteroids, flares, cmes, storms, apod] = await Promise.allSettled([
    getNeoWsFeed({ startDate: date, endDate: date }),
    getSolarFlares({ startDate: date, endDate: date }),
    getCoronalMassEjections({ startDate: date, endDate: date }),
    getGeomagneticStorms({ startDate: date, endDate: date }),
    getTodaysApod(),
  ]);

  const asteroidSummary =
    asteroids.status === "fulfilled"
      ? summarizeBriefingAsteroids(asteroids.value)
      : "Near-Earth object data is unavailable.";
  const flareCount = flares.status === "fulfilled" ? summarizeCount(flares.value) : 0;
  const cmeCount = cmes.status === "fulfilled" ? summarizeCount(cmes.value) : 0;
  const stormCount = storms.status === "fulfilled" ? summarizeCount(storms.value) : 0;
  const sourceCards: CosmosNasaSourceCard[] = [];

  if (apod.status === "fulfilled") {
    const entry = Array.isArray(apod.value) ? apod.value[0] : apod.value;
    if (entry) sourceCards.push(createApodSourceCard(entry));
  }

  if (asteroids.status === "fulfilled") {
    const neowsCard = createNeoWsSourceCard(asteroids.value, date);
    if (neowsCard) sourceCards.push(neowsCard);
  }

  if (flares.status === "fulfilled" || cmes.status === "fulfilled" || storms.status === "fulfilled") {
    sourceCards.push({
      id: `donki-${date}`,
      type: "space-weather",
      title: "Space weather signals",
      subtitle: "NASA DONKI event window",
      date,
      href: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
      details: [
        { label: "Solar flares", value: String(flareCount) },
        { label: "CMEs", value: String(cmeCount) },
        { label: "Geomagnetic storms", value: String(stormCount) },
      ],
    });
  }

  return {
    text: [
      `Daily briefing date: ${date}`,
      `NeoWs signal: ${asteroidSummary}`,
      `DONKI signal: ${flareCount} solar flares, ${cmeCount} coronal mass ejections, and ${stormCount} geomagnetic storms in the current window.`,
    ].join("\n"),
    sourceCards,
  };
}

async function buildNasaContext(
  prompt: string,
  mode: CosmosChatMode,
  requestContext: CosmosChatContext,
  requestId: string,
): Promise<NasaContextResult> {
  const contextBlocks: string[] = [];
  const sources = new Set<string>();
  const sourceCards: CosmosNasaSourceCard[] = [];
  const startedAt = Date.now();
  const queryProfile = expandRetrievalQuery(prompt);
  const normalizedPrompt = prompt.toLowerCase();

  if (requestContext.title || requestContext.description || requestContext.imageUrl) {
    sources.add("COSMOS page context");
    contextBlocks.push(
      [
        "Current COSMOS page context:",
        requestContext.page ? `Page: ${requestContext.page}` : undefined,
        requestContext.title ? `Title: ${requestContext.title}` : undefined,
        requestContext.description ? `Description: ${requestContext.description}` : undefined,
        requestContext.imageUrl ? `Image URL: ${requestContext.imageUrl}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const wantsApod = mode === "apod" || mode === "briefing" || normalizedPrompt.includes("apod") || normalizedPrompt.includes("picture of the day");
  if (wantsApod) {
    try {
      const apod = await getTodaysApod();
      const entry = Array.isArray(apod) ? apod[0] : apod;
      if (entry) {
        sources.add("NASA APOD");
        sourceCards.push(createApodSourceCard(entry));
        contextBlocks.push(summarizeApod(entry));
      }
      logChatRoute("info", "nasa_context_apod_loaded", { requestId, hasEntry: Boolean(entry) });
    } catch (error) {
      logChatRoute("warn", "nasa_context_apod_unavailable", {
        requestId,
        errorMessage: error instanceof Error ? error.message : "Unknown APOD context error.",
      });
      contextBlocks.push("APOD context is temporarily unavailable. Do not invent APOD details.");
    }
  }

  const wantsNasaMedia =
    mode === "nasa-media" ||
    mode === "mars-image" ||
    mode === "apod" ||
    mode === "planet" ||
    queryProfile.topicType === "image" ||
    normalizedPrompt.includes("nasa image") ||
    normalizedPrompt.includes("nasa media");

  if (wantsNasaMedia) {
    try {
      const query = inferNasaQuery(prompt, mode);
      const imageResults = await searchNasaImages({
        q: query,
        mediaType: ["image"],
        pageSize: 2,
      }) as ImageSearchResponse;

      const summary = summarizeImageResults(imageResults);
      if (summary) {
        sources.add("NASA Image Library");
        const imageSourceCard = createImageSourceCard(query, imageResults);
        if (imageSourceCard) sourceCards.push(imageSourceCard);
        contextBlocks.push(`NASA Image Library context for query "${query}":\n${summary}`);
      }
      logChatRoute("info", "nasa_context_image_library_loaded", {
        requestId,
        query,
        hasSummary: Boolean(summary),
      });
    } catch (error) {
      logChatRoute("warn", "nasa_context_image_library_unavailable", {
        requestId,
        errorMessage: error instanceof Error ? error.message : "Unknown NASA Image Library context error.",
      });
      contextBlocks.push("NASA Image Library context unavailable for this question.");
    }
  }

  if (mode === "asteroids") {
    try {
      const date = todayIso();
      const feed = await getNeoWsFeed({ startDate: date, endDate: date });
      const asteroidSummary = summarizeBriefingAsteroids(feed);
      const asteroidSourceCard = createNeoWsSourceCard(feed, date);
      sources.add("NASA NeoWs");
      if (asteroidSourceCard) sourceCards.push(asteroidSourceCard);
      contextBlocks.push(`NASA NeoWs context for ${date}:\n${asteroidSummary}`);
    } catch (error) {
      logChatRoute("warn", "nasa_context_neows_unavailable", {
        requestId,
        errorMessage: error instanceof Error ? error.message : "Unknown NeoWs context error.",
      });
      contextBlocks.push("Asteroid mode selected. NeoWs context is unavailable; avoid overstating danger.");
    }
  }

  if (shouldLoadDailyBriefing(prompt, mode)) {
    try {
      const briefing = await summarizeDailyBriefingSignals();

      if (briefing.text) {
        sources.add("Daily Cosmic Briefing");
        sourceCards.push(...briefing.sourceCards);
        contextBlocks.push(`COSMOS daily briefing context:\n${briefing.text}`);
      }

      logChatRoute("info", "daily_briefing_context_loaded", {
        requestId,
        hasBriefing: Boolean(briefing.text),
      });
    } catch (error) {
      logChatRoute("warn", "daily_briefing_context_unavailable", {
        requestId,
        errorMessage: error instanceof Error ? error.message : "Unknown daily briefing context error.",
      });
    }
  }

  const nasaContext = contextBlocks.join("\n\n---\n\n");
  logChatRoute("info", "nasa_context_complete", {
    requestId,
    elapsedMs: Date.now() - startedAt,
    blockCount: contextBlocks.length,
    contextLength: nasaContext.length,
    sources: Array.from(sources),
  });

  return {
    text: nasaContext,
    sources: Array.from(sources),
    sourceCards: Array.from(new Map(sourceCards.map((card) => [card.id, card])).values()).slice(0, 6),
  };
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? createRequestId();
  const startedAt = Date.now();
  const rateLimit = checkRateLimit(request);

  if (rateLimit !== null) {
    logChatRoute("warn", "rate_limited", { requestId, retryAfter: rateLimit.retryAfter, scope: rateLimit.scope });
    return streamText(`COSMOS is preparing the response channel. Try again in ${rateLimit.retryAfter} seconds.`, 429, {
      "x-cosmos-ai-source": "fallback",
      "x-cosmos-ai-fallback-reason": `rate_limited_${rateLimit.scope}`,
      "x-cosmos-ai-model": env.openaiModel,
      "x-cosmos-ai-model-status": "rate_limited",
      "x-cosmos-ai-request-id": requestId,
      "retry-after": String(rateLimit.retryAfter),
    });
  }

  let body: ChatRequest;

  try {
    body = await request.json() as ChatRequest;
  } catch (error) {
    logChatRoute("warn", "invalid_json", {
      requestId,
      errorMessage: error instanceof Error ? error.message : "Invalid JSON request body.",
    });
    return streamText("The assistant could not read the request payload.", 400, {
      "x-cosmos-ai-request-id": requestId,
    });
  }

  const messagesOrError = validateMessages(body.messages);

  if (typeof messagesOrError === "string") {
    logChatRoute("warn", "invalid_messages", { requestId, reason: messagesOrError });
    return streamText(messagesOrError, 400, {
      "x-cosmos-ai-request-id": requestId,
    });
  }

  const mode = normalizeMode(body.mode);
  const promptForMode = latestUserMessage(messagesOrError);
  const queryIntent = classifyCosmosQuery(promptForMode);
  const researchTriggered = intentNeedsScholarlyRetrieval(queryIntent) || mode === "research";
  const effectiveMode = mode === "general" && researchTriggered ? "research" : mode;
  const audience = normalizeAudience(body.audience);
  const context = validateContext(body.context);
  const prompt = promptForMode;

  if (!prompt) {
    logChatRoute("warn", "missing_prompt", { requestId, messageCount: messagesOrError.length });
    return streamText("Ask me what you want to explore: an image, a planet, a mission, or today's cosmic signal.", 400, {
      "x-cosmos-ai-request-id": requestId,
    });
  }

  logChatRoute("info", "user_prompt_received", {
    requestId,
    userPrompt: prompt,
    researchTriggered,
    mode,
    effectiveMode,
    queryMode: queryIntent.mode,
  });

  logChatRoute("info", "chat_request_accepted", {
    requestId,
    mode: effectiveMode,
    originalMode: mode,
    researchTriggered,
    audience,
    messageCount: messagesOrError.length,
    latestPromptLength: prompt.length,
    hasGroqKey: Boolean(env.groqApiKey),
    hasOpenAiKey: Boolean(env.openaiApiKey),
    hasPageContext: Boolean(context.page || context.title || context.description || context.imageUrl),
  });

  const authoritativeContext = buildAuthoritativeContext(queryIntent);
  const [nasaContext, openAlexContext, toolContext] = await Promise.all([
    buildNasaContext(prompt, effectiveMode, context, requestId),
    buildOpenAlexContext(prompt, effectiveMode, requestId, queryIntent),
    buildCosmosToolContext(prompt, effectiveMode, { skipResearch: researchTriggered }),
  ]);
  const combinedContext = [authoritativeContext.text, openAlexContext.text, toolContext.text, nasaContext.text]
    .filter(Boolean)
    .join("\n\n---\n\n");
  const combinedSources = Array.from(new Set([
    ...authoritativeContext.sources,
    ...nasaContext.sources,
    ...openAlexContext.sources,
    ...toolContext.sources,
  ]));
  const orderedSourceCards = openAlexContext.sourceCards.length > 0
    ? [...openAlexContext.sourceCards, ...authoritativeContext.sourceCards, ...toolContext.sourceCards, ...nasaContext.sourceCards]
    : [...authoritativeContext.sourceCards, ...toolContext.sourceCards, ...nasaContext.sourceCards];
  const combinedSourceCards = Array.from(
    new Map(orderedSourceCards.map((card) => [card.id, card])).values(),
  ).slice(0, 8);

  logChatRoute("info", "openalex_context_gpt_handoff", {
    requestId,
    researchTriggered,
    queryMode: queryIntent.mode,
    openAlexQueryUsed: openAlexContext.query ?? null,
    openAlexPapersReturned: openAlexContext.paperCount,
    openAlexContextPassedToGpt: openAlexContext.contextPassedToGpt && combinedContext.includes("OPENALEX_RESEARCH_CONTEXT_ATTACHED"),
    combinedContextLength: combinedContext.length,
    researchSourceCards: openAlexContext.sourceCards.filter((card) => card.type === "research").length,
    toolsUsed: toolContext.toolsUsed,
    toolSources: toolContext.sources,
  });
  const userMessageCount = messagesOrError.filter((message) => message.role === "user").length;
  const isCacheEligible = !researchTriggered && userMessageCount <= 1 && prompt.length <= 500;
  if (researchTriggered) {
    logChatRoute("info", "chat_cache_skipped_for_research", {
      requestId,
      reason: "openalex_debug_requires_fresh_context",
    });
  }
  const cacheKey = isCacheEligible
    ? createChatCacheKey({
        messages: messagesOrError,
        mode: effectiveMode,
        audience,
        nasaContext: combinedContext,
      })
    : undefined;

  if (cacheKey) {
    const cached = getCachedChatResponse(cacheKey);
    if (cached) {
      logChatRoute("info", "chat_cache_hit", {
        requestId,
        mode: effectiveMode,
        audience,
        model: cached.model,
        cachedAt: cached.createdAt,
        elapsedMs: Date.now() - startedAt,
      });
      return streamText(cached.text, 200, {
        "x-cosmos-ai-source": "cache",
        "x-cosmos-ai-cache": "hit",
        "x-cosmos-ai-model": cached.model,
        "x-cosmos-ai-model-status": getOpenAiModelStatus(cached.model, "cache"),
        "x-cosmos-ai-request-id": requestId,
        "x-cosmos-ai-context-sources": cached.contextSources.join(","),
        "x-cosmos-ai-source-cards": encodeSourceCardsHeader(cached.sourceCards),
      });
    }

    logChatRoute("info", "chat_cache_miss", { requestId, mode: effectiveMode, audience });
  }

  if (!env.groqApiKey && !env.openaiApiKey) {
    logChatRoute("warn", "ai_provider_missing_fallback", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      mode: effectiveMode,
      audience,
      nasaContextLength: combinedContext.length,
    });
    const fallbackText = fallbackGuideAnswer(prompt, effectiveMode, audience, combinedContext, "missing_openai_key");
    if (cacheKey) {
      setCachedChatResponse(cacheKey, fallbackText, combinedSources, combinedSourceCards, env.groqModel || "fallback-model");
    }
    return streamText(fallbackText, 200, {
      "x-cosmos-ai-source": "fallback",
      "x-cosmos-ai-fallback-reason": "missing_ai_provider",
      "x-cosmos-ai-model": env.groqModel,
      "x-cosmos-ai-model-status": fallbackReasonToModelStatus("missing_openai_key"),
      "x-cosmos-ai-request-id": requestId,
      "x-cosmos-ai-context-sources": combinedSources.join(","),
      "x-cosmos-ai-source-cards": encodeSourceCardsHeader(combinedSourceCards),
    });
  }

  logChatRoute("info", "ai_stream_handoff", {
    requestId,
    elapsedMs: Date.now() - startedAt,
    mode: effectiveMode,
    audience,
    primaryProvider: getPrimaryAiProvider(),
    nasaContextLength: combinedContext.length,
    openAlexSourceCardCount: openAlexContext.sourceCards.length,
    openAlexContextPassedToGpt: openAlexContext.contextPassedToGpt,
    openAlexQueryUsed: openAlexContext.query ?? null,
  });

  return streamAiChatResponse({
    messages: messagesOrError,
    mode: effectiveMode,
    audience,
    nasaContext: combinedContext,
    contextSources: combinedSources,
    sourceCards: combinedSourceCards,
    requestId,
    cacheKey,
  });
}
