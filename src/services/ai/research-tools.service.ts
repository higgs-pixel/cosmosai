import "server-only";

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
import {
  searchOpenAlexAuthors,
  searchOpenAlexInstitutions,
  type OpenAlexAuthor,
  type OpenAlexInstitution,
} from "@/lib/openalex";
import type { CosmosChatMode, CosmosNasaSourceCard } from "@/services/openai";

type ToolName =
  | "nasa-apod"
  | "nasa-mars-rover"
  | "nasa-neows"
  | "nasa-donki"
  | "nasa-image-library"
  | "openalex-authors"
  | "openalex-institutions"
  | "arxiv"
  | "wikipedia"
  | "iss"
  | "space-weather";

type ToolResult = {
  tool: ToolName;
  text: string;
  sources: string[];
  sourceCards: CosmosNasaSourceCard[];
};

export type CosmosToolContext = {
  text: string;
  sources: string[];
  sourceCards: CosmosNasaSourceCard[];
  toolsUsed: ToolName[];
};

type CacheEntry = {
  expiresAt: number;
  value: ToolResult;
};

const TOOL_TIMEOUT_MS = 7_000;
const TOOL_CACHE_TTL_MS = 10 * 60 * 1000;
const toolCache = new Map<string, CacheEntry>();

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function cleanQuery(prompt: string) {
  let cleaned = prompt.trim().toLowerCase();

  // Strip leading greetings
  cleaned = cleaned.replace(/^(?:hi|hello|hey|greetings|dear cosmos|cosmos)(?:[!,.\s]+)/i, "");

  // Strip conversational prefixes to extract the actual topic
  const prefixes = [
    /^can you (?:tell|explain|show|find)(?: me)?(?: a| one)?(?: interesting)? fact about\s+/i,
    /^tell me(?: a| one)?(?: interesting)? fact about\s+/i,
    /^(?:what|who|where) is a\s+/i,
    /^(?:what|who|where) is the\s+/i,
    /^(?:what|who|where) is\s+/i,
    /^explain to me\s+/i,
    /^explain\s+/i,
    /^define\s+/i,
    /^describe\s+/i,
    /^information about\s+/i,
    /^search for\s+/i,
    /^find research about\s+/i,
    /^find papers about\s+/i,
    /^find studies about\s+/i
  ];

  for (const prefix of prefixes) {
    if (prefix.test(cleaned)) {
      cleaned = cleaned.replace(prefix, "");
      break;
    }
  }

  return cleaned
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 12)
    .join(" ");
}

function compactText(value: unknown, maxLength = 1_200) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cacheKey(tool: ToolName, prompt: string) {
  return `${tool}:${cleanQuery(prompt).toLowerCase()}`;
}

async function withCache(tool: ToolName, prompt: string, load: () => Promise<ToolResult>) {
  const key = cacheKey(tool, prompt);
  const cached = toolCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await load();
  toolCache.set(key, {
    value,
    expiresAt: Date.now() + TOOL_CACHE_TTL_MS,
  });

  return value;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        ...init.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function apodUrl(apod: ApodEntry) {
  const compactDate = apod.date?.replaceAll("-", "").slice(2);
  return compactDate && compactDate.length === 6
    ? `https://apod.nasa.gov/apod/ap${compactDate}.html`
    : "https://apod.nasa.gov/apod/astropix.html";
}

function nasaImageSearchUrl(query: string) {
  return `https://images.nasa.gov/search?q=${encodeURIComponent(query)}`;
}

async function loadApodTool(prompt: string): Promise<ToolResult> {
  return withCache("nasa-apod", prompt, async () => {
    const apod = await getTodaysApod();
    const entry = Array.isArray(apod) ? apod[0] : apod;

    return {
      tool: "nasa-apod",
      text: [
        "Source: NASA APOD",
        `Title: ${entry.title}`,
        `Date: ${entry.date}`,
        `Media type: ${entry.media_type}`,
        `Summary: ${compactText(entry.explanation, 1_000)}`,
        `Source: ${apodUrl(entry)}`,
      ].join("\n"),
      sources: ["NASA APOD"],
      sourceCards: [
        {
          id: `tool-apod-${entry.date}`,
          type: "apod",
          title: entry.title,
          subtitle: "Astronomy Picture of the Day",
          date: entry.date,
          href: apodUrl(entry),
          details: [
            { label: "Source", value: "NASA APOD" },
            { label: "Media", value: entry.media_type },
          ],
        },
      ],
    };
  });
}

type ImageSearchResponse = {
  collection?: {
    items?: Array<{
      data?: Array<{
        title?: string;
        description?: string;
        nasa_id?: string;
        date_created?: string;
        media_type?: string;
      }>;
    }>;
  };
};

async function loadNasaImageTool(prompt: string): Promise<ToolResult> {
  return withCache("nasa-image-library", prompt, async () => {
    const query = cleanQuery(prompt) || "astronomy";
    const results = await searchNasaImages({ q: query, mediaType: ["image"], pageSize: 5 }) as ImageSearchResponse;
    const items = (results.collection?.items ?? [])
      .map((item) => item.data?.[0])
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 4);

    return {
      tool: "nasa-image-library",
      text: [
        `Source: NASA Image and Video Library`,
        `Query: ${query}`,
        ...items.map((item, index) =>
          [
            `Result ${index + 1}: ${item.title ?? "Untitled"}`,
            `NASA ID: ${item.nasa_id ?? "unknown"}`,
            `Media type: ${item.media_type ?? "unknown"}`,
            `Date: ${item.date_created?.slice(0, 10) ?? "unknown"}`,
            `Description: ${compactText(item.description, 420) || "No description available."}`,
          ].join("\n"),
        ),
        `Source: ${nasaImageSearchUrl(query)}`,
      ].join("\n\n"),
      sources: ["NASA Image Library"],
      sourceCards: items.slice(0, 2).map((item, index) => ({
        id: `tool-nasa-media-${item.nasa_id ?? index}`,
        type: "nasa-media",
        title: item.title ?? `NASA media result ${index + 1}`,
        subtitle: item.nasa_id ? `NASA ID ${item.nasa_id}` : "NASA Image Library",
        date: item.date_created?.slice(0, 10),
        href: item.nasa_id ? `https://images.nasa.gov/details/${encodeURIComponent(item.nasa_id)}` : nasaImageSearchUrl(query),
        details: [
          { label: "Source", value: "NASA Image Library" },
          { label: "Media", value: item.media_type ?? "image" },
        ],
      })),
    };
  });
}

type NeoWsAsteroid = {
  name?: string;
  is_potentially_hazardous_asteroid?: boolean;
  close_approach_data?: Array<{
    miss_distance?: { kilometers?: string };
    relative_velocity?: { kilometers_per_hour?: string };
  }>;
};

type NeoWsResponse = {
  element_count?: number;
  near_earth_objects?: Record<string, NeoWsAsteroid[]>;
};

async function loadNeoWsTool(prompt: string): Promise<ToolResult> {
  return withCache("nasa-neows", prompt, async () => {
    const date = todayIso();
    const feed = await getNeoWsFeed({ startDate: date, endDate: date }) as NeoWsResponse;
    const asteroids = Object.values(feed.near_earth_objects ?? {}).flat();
    const closest = asteroids
      .map((asteroid) => ({
        asteroid,
        missKm: Number(asteroid.close_approach_data?.[0]?.miss_distance?.kilometers),
        velocityKph: Number(asteroid.close_approach_data?.[0]?.relative_velocity?.kilometers_per_hour),
      }))
      .filter((item) => Number.isFinite(item.missKm))
      .sort((a, b) => a.missKm - b.missKm)[0];
    const hazardous = asteroids.filter((asteroid) => asteroid.is_potentially_hazardous_asteroid).length;

    return {
      tool: "nasa-neows",
      text: [
        "Source: NASA NeoWs",
        `Date: ${date}`,
        `Near-Earth object count: ${feed.element_count ?? asteroids.length}`,
        `Potentially hazardous flags: ${hazardous}`,
        closest ? `Closest object: ${closest.asteroid.name ?? "Unnamed"} at ${Math.round(closest.missKm).toLocaleString("en-US")} km` : undefined,
        closest && Number.isFinite(closest.velocityKph) ? `Closest object velocity: ${Math.round(closest.velocityKph).toLocaleString("en-US")} km/h` : undefined,
        "Source: https://api.nasa.gov/",
      ].filter(Boolean).join("\n"),
      sources: ["NASA NeoWs"],
      sourceCards: [
        {
          id: `tool-neows-${date}`,
          type: "asteroid",
          title: closest?.asteroid.name ?? "Near-Earth object activity",
          subtitle: "NASA NeoWs close-approach feed",
          date,
          href: "https://api.nasa.gov/",
          details: [
            { label: "Objects", value: String(feed.element_count ?? asteroids.length) },
            { label: "Hazard flags", value: String(hazardous) },
          ],
        },
      ],
    };
  });
}

async function loadDonkiTool(prompt: string): Promise<ToolResult> {
  return withCache("nasa-donki", prompt, async () => {
    const date = todayIso();
    const [flares, cmes, storms] = await Promise.all([
      getSolarFlares({ startDate: date, endDate: date }),
      getCoronalMassEjections({ startDate: date, endDate: date }),
      getGeomagneticStorms({ startDate: date, endDate: date }),
    ]);
    const flareCount = Array.isArray(flares) ? flares.length : 0;
    const cmeCount = Array.isArray(cmes) ? cmes.length : 0;
    const stormCount = Array.isArray(storms) ? storms.length : 0;

    return {
      tool: "nasa-donki",
      text: [
        "Source: NASA DONKI",
        `Date: ${date}`,
        `Solar flares: ${flareCount}`,
        `Coronal mass ejections: ${cmeCount}`,
        `Geomagnetic storms: ${stormCount}`,
        "Source: https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
      ].join("\n"),
      sources: ["NASA DONKI"],
      sourceCards: [
        {
          id: `tool-donki-${date}`,
          type: "space-weather",
          title: "Space weather events",
          subtitle: "NASA DONKI event window",
          date,
          href: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
          details: [
            { label: "Solar flares", value: String(flareCount) },
            { label: "CMEs", value: String(cmeCount) },
            { label: "Geomagnetic storms", value: String(stormCount) },
          ],
        },
      ],
    };
  });
}

type MarsManifestResponse = {
  photo_manifest?: {
    max_date?: string;
    max_sol?: number;
    total_photos?: number;
  };
};

type MarsPhotosResponse = {
  photos?: Array<{
    id?: number;
    img_src?: string;
    earth_date?: string;
    sol?: number;
    camera?: { full_name?: string; name?: string };
    rover?: { name?: string; status?: string };
  }>;
};

async function loadMarsRoverTool(prompt: string): Promise<ToolResult> {
  return withCache("nasa-mars-rover", prompt, async () => {
    const manifest = await getMarsRoverManifest({ rover: "perseverance" }) as MarsManifestResponse;
    const latestDate = manifest.photo_manifest?.max_date;
    const photos = latestDate
      ? await getMarsRoverPhotos({ rover: "perseverance", earthDate: latestDate, page: 1 }) as MarsPhotosResponse
      : { photos: [] };
    const firstPhotos = (photos.photos ?? []).slice(0, 3);

    return {
      tool: "nasa-mars-rover",
      text: [
        "Source: NASA Mars Rover Photos",
        "Rover: Perseverance",
        `Latest Earth date: ${latestDate ?? "unavailable"}`,
        `Latest sol: ${manifest.photo_manifest?.max_sol ?? "unavailable"}`,
        `Mission photo count: ${manifest.photo_manifest?.total_photos ?? "unavailable"}`,
        ...firstPhotos.map((photo, index) =>
          `Photo ${index + 1}: sol ${photo.sol ?? "unknown"}, camera ${photo.camera?.full_name ?? photo.camera?.name ?? "unknown"}, image ${photo.img_src ?? "unavailable"}`,
        ),
        "Source: https://mars.nasa.gov/mars2020/",
      ].join("\n"),
      sources: ["NASA Mars Rover"],
      sourceCards: [
        {
          id: `tool-mars-perseverance-${latestDate ?? "latest"}`,
          type: "mars",
          title: "Perseverance rover latest imagery",
          subtitle: "NASA Mars Rover Photos API",
          date: latestDate,
          href: "https://mars.nasa.gov/mars2020/",
          details: [
            { label: "Rover", value: "Perseverance" },
            { label: "Latest sol", value: String(manifest.photo_manifest?.max_sol ?? "Unavailable") },
            { label: "Photos checked", value: String(firstPhotos.length) },
          ],
        },
      ],
    };
  });
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function textBetween(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : undefined;
}

async function loadArxivTool(prompt: string): Promise<ToolResult> {
  return withCache("arxiv", prompt, async () => {
    const query = cleanQuery(prompt) || "astrophysics";
    const arxivQuery = `cat:astro-ph* AND all:${query}`;
    const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(arxivQuery)}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`;
    const xml = await (await fetchWithTimeout(url, { headers: { Accept: "application/atom+xml" } })).text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 5).map((match) => {
      const entry = match[1];
      const authors = [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)]
        .map((author) => decodeXml(author[1].replace(/\s+/g, " ").trim()))
        .slice(0, 5);
      return {
        title: textBetween(entry, "title") ?? "Untitled arXiv paper",
        summary: textBetween(entry, "summary") ?? "",
        published: textBetween(entry, "published")?.slice(0, 10),
        id: textBetween(entry, "id"),
        authors,
      };
    });

    return {
      tool: "arxiv",
      text: [
        "Source: arXiv astronomy/astrophysics search",
        `Query: ${query}`,
        ...entries.map((entry, index) =>
          [
            `arXiv result ${index + 1}: ${entry.title}`,
            `Authors: ${entry.authors.join(", ") || "Unknown"}`,
            `Published: ${entry.published ?? "Unknown"}`,
            `Summary: ${compactText(entry.summary, 620)}`,
            `Link: ${entry.id ?? "Unavailable"}`,
          ].join("\n"),
        ),
      ].join("\n\n"),
      sources: ["arXiv"],
      sourceCards: entries.map((entry, index) => ({
        id: `tool-arxiv-${entry.id ?? index}`,
        type: "arxiv",
        title: entry.title,
        subtitle: entry.authors.join(", ").slice(0, 140) || "arXiv astronomy paper",
        date: entry.published,
        href: entry.id,
        details: [
          { label: "Source", value: "arXiv" },
          { label: "Authors", value: entry.authors.slice(0, 2).join(", ") || "Unknown" },
        ],
      })),
    };
  });
}

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{ title?: string }>;
  };
};

type WikipediaSummaryResponse = {
  title?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

async function loadWikipediaTool(prompt: string): Promise<ToolResult> {
  return withCache("wikipedia", prompt, async () => {
    const query = cleanQuery(prompt) || "astronomy";
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&srsearch=${encodeURIComponent(query)}`;
    const search = await (await fetchWithTimeout(searchUrl)).json() as WikipediaSearchResponse;
    const title = search.query?.search?.[0]?.title ?? query;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summary = await (await fetchWithTimeout(summaryUrl)).json() as WikipediaSummaryResponse;

    return {
      tool: "wikipedia",
      text: [
        "Source: Wikipedia summary",
        `Topic: ${summary.title ?? title}`,
        `Summary: ${compactText(summary.extract, 900) || "No encyclopedia summary available."}`,
        `Source: ${summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`}`,
      ].join("\n"),
      sources: ["Wikipedia"],
      sourceCards: [
        {
          id: `tool-wikipedia-${summary.title ?? title}`,
          type: "wikipedia",
          title: summary.title ?? title,
          subtitle: "Wikipedia summary",
          href: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
          details: [{ label: "Source", value: "Wikipedia" }],
        },
      ],
    };
  });
}

type IssNowResponse = {
  timestamp?: number;
  iss_position?: {
    latitude?: string;
    longitude?: string;
  };
};

type PeopleInSpaceResponse = {
  number?: number;
  people?: Array<{ name?: string; craft?: string }>;
};

async function loadIssTool(prompt: string): Promise<ToolResult> {
  return withCache("iss", prompt, async () => {
    const [iss, people] = await Promise.all([
      (await fetchWithTimeout("http://api.open-notify.org/iss-now.json")).json() as Promise<IssNowResponse>,
      (await fetchWithTimeout("http://api.open-notify.org/astros.json")).json() as Promise<PeopleInSpaceResponse>,
    ]);
    const updated = iss.timestamp ? new Date(iss.timestamp * 1000).toISOString() : undefined;
    const crew = (people.people ?? []).slice(0, 8).map((person) => `${person.name ?? "Unknown"} (${person.craft ?? "unknown craft"})`);

    return {
      tool: "iss",
      text: [
        "Source: ISS / people in space",
        `ISS latitude: ${iss.iss_position?.latitude ?? "unavailable"}`,
        `ISS longitude: ${iss.iss_position?.longitude ?? "unavailable"}`,
        `Last updated: ${updated ?? "unavailable"}`,
        `People currently in space: ${people.number ?? crew.length}`,
        `Crew: ${crew.join("; ") || "Unavailable"}`,
        "Source: Open Notify",
      ].join("\n"),
      sources: ["Open Notify"],
      sourceCards: [
        {
          id: `tool-iss-${updated ?? "latest"}`,
          type: "iss",
          title: "ISS current position",
          subtitle: "Open Notify public API",
          date: updated,
          href: "http://open-notify.org/Open-Notify-API/ISS-Location-Now/",
          details: [
            { label: "Latitude", value: iss.iss_position?.latitude ?? "Unavailable" },
            { label: "Longitude", value: iss.iss_position?.longitude ?? "Unavailable" },
            { label: "People in space", value: String(people.number ?? crew.length) },
          ],
        },
      ],
    };
  });
}

type KpRow = string[];
type XrayRow = {
  time_tag?: string;
  flux?: number;
  energy?: string;
};

async function loadSpaceWeatherTool(prompt: string): Promise<ToolResult> {
  return withCache("space-weather", prompt, async () => {
    const [kpRows, xrays] = await Promise.all([
      (await fetchWithTimeout("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json")).json() as Promise<KpRow[]>,
      (await fetchWithTimeout("https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json")).json() as Promise<XrayRow[]>,
    ]);
    const latestKp = [...kpRows].reverse().find((row) => Array.isArray(row) && Number.isFinite(Number(row[1])));
    const latestXray = [...xrays].reverse().find((row) => typeof row.flux === "number");

    return {
      tool: "space-weather",
      text: [
        "Source: NOAA SWPC space weather",
        `Latest Kp index: ${latestKp?.[1] ?? "unavailable"}`,
        `Kp timestamp: ${latestKp?.[0] ?? "unavailable"}`,
        `Latest GOES X-ray flux: ${latestXray?.flux ?? "unavailable"}`,
        `GOES energy channel: ${latestXray?.energy ?? "unavailable"}`,
        `GOES timestamp: ${latestXray?.time_tag ?? "unavailable"}`,
        "Source: NOAA Space Weather Prediction Center",
      ].join("\n"),
      sources: ["NOAA SWPC"],
      sourceCards: [
        {
          id: `tool-swpc-${latestKp?.[0] ?? "latest"}`,
          type: "space-weather",
          title: "NOAA space weather indicators",
          subtitle: "Kp index and GOES X-ray flux",
          date: latestKp?.[0],
          href: "https://www.swpc.noaa.gov/",
          details: [
            { label: "Kp index", value: latestKp?.[1] ?? "Unavailable" },
            { label: "X-ray flux", value: String(latestXray?.flux ?? "Unavailable") },
          ],
        },
      ],
    };
  });
}

async function loadOpenAlexAuthorsTool(prompt: string): Promise<ToolResult> {
  return withCache("openalex-authors", prompt, async () => {
    const query = cleanQuery(prompt);
    const result = await searchOpenAlexAuthors({ query, limit: 3 });
    const authors = result.results;

    return {
      tool: "openalex-authors",
      text: [
        "Source: OpenAlex authors",
        `Query: ${query}`,
        ...authors.map((author, index) => summarizeAuthor(author, index)),
      ].join("\n\n"),
      sources: ["OpenAlex Authors"],
      sourceCards: authors.map((author) => ({
        id: `tool-openalex-author-${author.id}`,
        type: "research",
        title: author.displayName,
        subtitle: author.lastKnownInstitution ?? "OpenAlex author profile",
        href: author.openAlexUrl,
        details: [
          { label: "Works", value: author.worksCount.toLocaleString("en-US") },
          { label: "Citations", value: author.citationCount.toLocaleString("en-US") },
          author.hIndex ? { label: "h-index", value: String(author.hIndex) } : undefined,
        ].filter((detail): detail is { label: string; value: string } => Boolean(detail)),
      })),
    };
  });
}

function summarizeAuthor(author: OpenAlexAuthor, index: number) {
  return [
    `Author ${index + 1}: ${author.displayName}`,
    `Institution: ${author.lastKnownInstitution ?? "Unavailable"}`,
    `Works: ${author.worksCount}`,
    `Citations: ${author.citationCount}`,
    `h-index: ${author.hIndex ?? "Unavailable"}`,
    `Link: ${author.openAlexUrl}`,
  ].join("\n");
}

async function loadOpenAlexInstitutionsTool(prompt: string): Promise<ToolResult> {
  return withCache("openalex-institutions", prompt, async () => {
    const query = cleanQuery(prompt);
    const result = await searchOpenAlexInstitutions({ query, limit: 3 });
    const institutions = result.results;

    return {
      tool: "openalex-institutions",
      text: [
        "Source: OpenAlex institutions",
        `Query: ${query}`,
        ...institutions.map((institution, index) => summarizeInstitution(institution, index)),
      ].join("\n\n"),
      sources: ["OpenAlex Institutions"],
      sourceCards: institutions.map((institution) => ({
        id: `tool-openalex-institution-${institution.id}`,
        type: "research",
        title: institution.displayName,
        subtitle: institution.countryCode ?? "OpenAlex institution profile",
        href: institution.openAlexUrl,
        details: [
          { label: "Works", value: institution.worksCount.toLocaleString("en-US") },
          { label: "Citations", value: institution.citationCount.toLocaleString("en-US") },
          institution.type ? { label: "Type", value: institution.type } : undefined,
        ].filter((detail): detail is { label: string; value: string } => Boolean(detail)),
      })),
    };
  });
}

function summarizeInstitution(institution: OpenAlexInstitution, index: number) {
  return [
    `Institution ${index + 1}: ${institution.displayName}`,
    `Country: ${institution.countryCode ?? "Unavailable"}`,
    `Type: ${institution.type ?? "Unavailable"}`,
    `Works: ${institution.worksCount}`,
    `Citations: ${institution.citationCount}`,
    `Link: ${institution.openAlexUrl}`,
  ].join("\n");
}

function selectTools(prompt: string, mode: CosmosChatMode): ToolName[] {
  const text = prompt.toLowerCase();
  const tools = new Set<ToolName>();

  if (mode === "apod" || includesAny(text, ["apod", "picture of the day", "image of the day"])) tools.add("nasa-apod");
  if (mode === "mars-image" || includesAny(text, ["mars rover", "perseverance", "curiosity rover", "mars image"])) tools.add("nasa-mars-rover");
  if (mode === "asteroids" || includesAny(text, ["asteroid", "neo", "near-earth", "near earth", "close approach"])) tools.add("nasa-neows");
  if (mode === "briefing" || includesAny(text, ["space weather", "solar flare", "cme", "geomagnetic", "donki", "sun activity"])) {
    tools.add("nasa-donki");
    tools.add("space-weather");
  }
  if (mode === "nasa-media" || includesAny(text, ["nasa image", "nasa images", "photo", "image", "gallery", "nebula", "galaxy"])) tools.add("nasa-image-library");
  if (includesAny(text, ["author", "scientist", "researcher"])) tools.add("openalex-authors");
  if (includesAny(text, ["institution", "university", "observatory", "laboratory"])) tools.add("openalex-institutions");
  if (includesAny(text, ["arxiv", "astrophysics", "astronomy paper", "planetary science", "latest paper", "preprint"])) tools.add("arxiv");
  if (includesAny(text, ["what is", "explain", "define", "black hole", "dark matter", "exoplanet", "james webb", "jwst"])) tools.add("wikipedia");
  if (includesAny(text, ["iss", "international space station", "people in space", "astronauts in space"])) tools.add("iss");

  if (tools.size === 0 && mode === "general") tools.add("wikipedia");

  return Array.from(tools).slice(0, 5);
}

async function runTool(tool: ToolName, prompt: string) {
  switch (tool) {
    case "nasa-apod":
      return loadApodTool(prompt);
    case "nasa-mars-rover":
      return loadMarsRoverTool(prompt);
    case "nasa-neows":
      return loadNeoWsTool(prompt);
    case "nasa-donki":
      return loadDonkiTool(prompt);
    case "nasa-image-library":
      return loadNasaImageTool(prompt);
    case "openalex-authors":
      return loadOpenAlexAuthorsTool(prompt);
    case "openalex-institutions":
      return loadOpenAlexInstitutionsTool(prompt);
    case "arxiv":
      return loadArxivTool(prompt);
    case "wikipedia":
      return loadWikipediaTool(prompt);
    case "iss":
      return loadIssTool(prompt);
    case "space-weather":
      return loadSpaceWeatherTool(prompt);
  }
}

export async function buildCosmosToolContext(
  prompt: string,
  mode: CosmosChatMode,
  options: { skipPaperSearch?: boolean } = {},
): Promise<CosmosToolContext> {
  const selectedTools = selectTools(prompt, mode).filter(
    (tool) => !(options.skipPaperSearch && tool === "arxiv"),
  );
  const settled = await Promise.allSettled(selectedTools.map((tool) => runTool(tool, prompt)));
  const results = settled
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((result): result is ToolResult => Boolean(result));

  return {
    text: results.length > 0
      ? [
          "COSMOS SERVER-SIDE TOOL RESULTS",
          "Use these summarized tool results when relevant. Do not expose raw API responses.",
          ...results.map((result) => `---\n${result.text}`),
        ].join("\n\n")
      : "",
    sources: Array.from(new Set(results.flatMap((result) => result.sources))),
    sourceCards: Array.from(new Map(results.flatMap((result) => result.sourceCards).map((card) => [card.id, card])).values()).slice(0, 8),
    toolsUsed: results.map((result) => result.tool),
  };
}
