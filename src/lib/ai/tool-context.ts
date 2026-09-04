import "server-only";

import { searchArxivPapers } from "@/lib/data-sources/arxiv";
import { searchCorePapers } from "@/lib/data-sources/core";
import { getOpenMeteoForecast } from "@/lib/data-sources/open-meteo";
import { searchOpenAlexResearch } from "@/lib/data-sources/openalex";
import { getSevenTimerAstroWeather } from "@/lib/data-sources/seven-timer";
import { getPurpleAirQuality } from "@/lib/data-sources/purpleair";
import { searchArcsecondAstronomy } from "@/lib/data-sources/arcsecond";
import { getIsroSummary } from "@/lib/data-sources/isro";
import { getRecentEarthquakes } from "@/lib/data-sources/usgs-earthquake";
import { getSunriseSunset } from "@/lib/data-sources/sunrise-sunset";
import { getWorldIndicators } from "@/lib/data-sources/world-bank";
import { searchWikidataFacts } from "@/lib/data-sources/wikidata";
import { getWeatherstackCurrent } from "@/lib/data-sources/weatherstack";
import { buildCosmosToolContext as buildLegacyToolContext, type CosmosToolContext } from "@/services/ai/research-tools.service";
import type { CosmosChatMode, CosmosNasaSourceCard } from "@/services/openai";

type ExternalTool =
  | "research"
  | "weather"
  | "observing"
  | "air-quality"
  | "isro"
  | "earthquakes"
  | "sunrise"
  | "astronomy"
  | "world-bank"
  | "wikidata";

type ExternalToolResult = {
  text: string;
  sources: string[];
  sourceCards: CosmosNasaSourceCard[];
};

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

  return cleaned.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 12).join(" ") || "astronomy";
}

function selectExternalTools(prompt: string, mode: CosmosChatMode): ExternalTool[] {
  const text = prompt.toLowerCase();
  const tools = new Set<ExternalTool>();

  if (mode === "research" || includesAny(text, ["research", "paper", "journal", "study", "publication", "citation", "latest paper", "scientific"])) {
    tools.add("research");
  }
  if (includesAny(text, ["weather", "temperature", "wind", "cloud", "humidity"])) tools.add("weather");
  if (includesAny(text, ["stargazing", "observe", "observing", "sky tonight", "telescope", "seeing", "transparency"])) {
    tools.add("observing");
    tools.add("air-quality");
  }
  if (includesAny(text, ["air quality", "aqi", "pm2.5", "pollution"])) tools.add("air-quality");
  if (includesAny(text, ["isro", "indian space", "india mission", "chandrayaan", "mangalyaan"])) tools.add("isro");
  if (includesAny(text, ["earthquake", "earthquakes", "seismic"])) tools.add("earthquakes");
  if (includesAny(text, ["sunrise", "sunset", "day length", "twilight"])) tools.add("sunrise");
  if (includesAny(text, ["catalog", "observatory", "astronomy object"])) tools.add("astronomy");
  if (includesAny(text, ["world bank", "co2", "population", "education", "r&d", "climate indicator"])) tools.add("world-bank");
  if (includesAny(text, ["what is", "who is", "wikidata", "fact about"])) tools.add("wikidata");

  return Array.from(tools).slice(0, 5);
}

function sourceCard(card: CosmosNasaSourceCard) {
  return card;
}

function researchCards(items: Awaited<ReturnType<typeof searchOpenAlexResearch>>, prefix: string): CosmosNasaSourceCard[] {
  return items.slice(0, 4).map((paper, index) => sourceCard({
    id: `${prefix}-${index}-${paper.title.slice(0, 24)}`,
    type: paper.provider === "arXiv" ? "arxiv" : "research",
    title: paper.title,
    subtitle: [paper.provider, paper.source].filter(Boolean).join(" • "),
    date: paper.publishedAt ?? (paper.year ? String(paper.year) : undefined),
    href: paper.url,
    authors: paper.authors,
    year: paper.year,
    abstract: paper.summary?.slice(0, 320),
    citationCount: paper.citationCount,
    doi: paper.doi,
    journal: paper.source,
    details: [
      { label: "Provider", value: paper.provider },
      paper.year ? { label: "Year", value: String(paper.year) } : undefined,
      paper.doi ? { label: "DOI", value: paper.doi } : undefined,
    ].filter((detail): detail is { label: string; value: string } => Boolean(detail)),
  }));
}

async function buildResearchContext(query: string): Promise<ExternalToolResult> {
  const [openAlex, core, arxiv] = await Promise.allSettled([
    searchOpenAlexResearch(query, 5),
    searchCorePapers(query, 5),
    searchArxivPapers(query, 5),
  ]);
  const openAlexItems = openAlex.status === "fulfilled" ? openAlex.value : [];
  const coreItems = core.status === "fulfilled" ? core.value : [];
  const arxivItems = arxiv.status === "fulfilled" ? arxiv.value : [];
  const items = [...openAlexItems, ...coreItems, ...arxivItems].slice(0, 10);

  return {
    text: [
      `Research query: ${query}`,
      ...items.map((paper, index) => [
        `Research result ${index + 1}: ${paper.title}`,
        `Provider: ${paper.provider}`,
        `Authors: ${paper.authors.join(", ") || "Unavailable"}`,
        `Year: ${paper.year ?? "Unavailable"}`,
        `Source: ${paper.source ?? "Unavailable"}`,
        `DOI: ${paper.doi ?? "Unavailable"}`,
        `Citation count: ${paper.citationCount ?? "Unavailable"}`,
        `Open access: ${paper.openAccess === undefined ? "Unavailable" : paper.openAccess ? "yes" : "unknown/no"}`,
        `URL: ${paper.url ?? "Unavailable"}`,
        `Summary: ${paper.summary ?? "Unavailable"}`,
      ].join("\n")),
    ].join("\n\n"),
    sources: Array.from(new Set(items.map((item) => item.provider))),
    sourceCards: [
      ...researchCards(openAlexItems, "openalex"),
      ...researchCards(coreItems, "core"),
      ...researchCards(arxivItems, "arxiv"),
    ].slice(0, 8),
  };
}

async function runExternalTool(tool: ExternalTool, prompt: string): Promise<ExternalToolResult> {
  const query = cleanQuery(prompt);
  const latitude = 26.2183;
  const longitude = 78.1828;

  switch (tool) {
    case "research":
      return buildResearchContext(query);
    case "weather": {
      const [weatherstack, openMeteo] = await Promise.allSettled([
        getWeatherstackCurrent(query),
        getOpenMeteoForecast(latitude, longitude),
      ]);
      const weather = weatherstack.status === "fulfilled" ? weatherstack.value : null;
      const meteo = openMeteo.status === "fulfilled" ? openMeteo.value : null;
      return {
        text: [
          "Weather context",
          weather ? `Weatherstack: ${weather.location}, ${weather.temperatureC ?? "?"} C, ${weather.condition ?? "condition unavailable"}, humidity ${weather.humidityPct ?? "?"}%, wind ${weather.windKph ?? "?"} km/h.` : "Weatherstack unavailable or not configured.",
          meteo ? `Open-Meteo default observing point: ${meteo.temperatureC ?? "?"} C, cloud cover ${meteo.cloudCoverPct ?? "?"}%, humidity ${meteo.humidityPct ?? "?"}%, wind ${meteo.windKph ?? "?"} km/h.` : "Open-Meteo unavailable.",
        ].join("\n"),
        sources: ["Weatherstack", "Open-Meteo"].filter((source, index) => (index === 0 ? Boolean(weather) : Boolean(meteo))),
        sourceCards: [],
      };
    }
    case "observing": {
      const [astro, meteo, sun] = await Promise.allSettled([
        getSevenTimerAstroWeather(latitude, longitude),
        getOpenMeteoForecast(latitude, longitude),
        getSunriseSunset(latitude, longitude),
      ]);
      return {
        text: [
          "Stargazing context for default COSMOS observing point near Gwalior, India.",
          astro.status === "fulfilled" ? `7Timer: cloud cover ${astro.value.cloudCover ?? "?"}, seeing ${astro.value.seeing ?? "?"}, transparency ${astro.value.transparency ?? "?"}, best window ${astro.value.bestObservationWindow ?? "unavailable"}.` : "7Timer unavailable.",
          meteo.status === "fulfilled" ? `Open-Meteo: cloud cover ${meteo.value.cloudCoverPct ?? "?"}%, visibility ${meteo.value.visibilityMeters ?? "?"} m.` : "Open-Meteo unavailable.",
          sun.status === "fulfilled" ? `Sunrise/Sunset: sunset ${sun.value.sunset ?? "unavailable"}, sunrise ${sun.value.sunrise ?? "unavailable"}.` : "Sunrise/Sunset unavailable.",
        ].join("\n"),
        sources: ["7Timer", "Open-Meteo", "Sunrise-Sunset"],
        sourceCards: [],
      };
    }
    case "air-quality": {
      const air = await getPurpleAirQuality(latitude, longitude);
      return {
        text: air
          ? `Air quality context from PurpleAir: PM2.5 ${air.pm25 ?? "unavailable"}, AQI estimate ${air.aqiEstimate ?? "unavailable"}, nearest sensor ${air.nearestSensor ?? "unavailable"}, sensor count ${air.sensorCount}.`
          : "PurpleAir air-quality context is unavailable or not configured.",
        sources: air ? ["PurpleAir"] : [],
        sourceCards: [],
      };
    }
    case "isro": {
      const isro = await getIsroSummary();
      return {
        text: [
          "ISRO context",
          `Spacecraft: ${isro.spacecrafts.join(", ") || "Unavailable"}`,
          `Launchers: ${isro.launchers.join(", ") || "Unavailable"}`,
          `Centres: ${isro.centres.join(", ") || "Unavailable"}`,
          `Customer satellites: ${isro.customerSatellites.join(", ") || "Unavailable"}`,
        ].join("\n"),
        sources: ["ISRO API"],
        sourceCards: [],
      };
    }
    case "earthquakes": {
      const earthquakes = await getRecentEarthquakes(6);
      return {
        text: [
          "Recent Earth event context from USGS",
          ...earthquakes.map((quake, index) => `${index + 1}. M${quake.magnitude ?? "?"} ${quake.place ?? "unknown place"} at ${quake.time ?? "unknown time"} (${quake.url ?? "no link"})`),
        ].join("\n"),
        sources: ["USGS"],
        sourceCards: [],
      };
    }
    case "sunrise": {
      const sun = await getSunriseSunset(latitude, longitude);
      return {
        text: `Sunrise/Sunset context: sunrise ${sun.sunrise ?? "unavailable"}, sunset ${sun.sunset ?? "unavailable"}, day length ${sun.dayLength ?? "unavailable"}, solar noon ${sun.solarNoon ?? "unavailable"}.`,
        sources: ["Sunrise-Sunset"],
        sourceCards: [],
      };
    }
    case "astronomy": {
      const records = await searchArcsecondAstronomy(query);
      return {
        text: records.length > 0
          ? ["Arcsecond astronomy context", ...records.map((record) => `${record.label}: ${record.type ?? "record"} ${record.url ?? ""}`)].join("\n")
          : "Arcsecond astronomy endpoint is available as a wrapper, but no clear matching catalog records were retrieved.",
        sources: records.length > 0 ? ["Arcsecond"] : [],
        sourceCards: [],
      };
    }
    case "world-bank": {
      const indicators = await getWorldIndicators();
      return {
        text: ["World Bank context", ...indicators.map((item) => `${item.indicator}: ${item.value ?? "unavailable"} (${item.country}, ${item.year})`)].join("\n"),
        sources: ["World Bank"],
        sourceCards: [],
      };
    }
    case "wikidata": {
      const facts = await searchWikidataFacts(query, 5);
      return {
        text: ["Wikidata context", ...facts.map((fact) => `${fact.label} (${fact.id}): ${fact.description ?? "No description"} ${fact.url}`)].join("\n"),
        sources: ["Wikidata"],
        sourceCards: facts.slice(0, 3).map((fact) => ({
          id: `wikidata-${fact.id}`,
          type: "wikipedia" as const,
          title: fact.label,
          subtitle: fact.description,
          href: fact.url,
          details: [{ label: "Source", value: "Wikidata" }],
        })),
      };
    }
  }
}

export async function buildCosmosToolContext(
  prompt: string,
  mode: CosmosChatMode,
  options: { skipResearch?: boolean } = {},
): Promise<CosmosToolContext> {
  const selectedTools = selectExternalTools(prompt, mode).filter(
    (tool) => !(options.skipResearch && tool === "research"),
  );
  const [legacy, externalSettled] = await Promise.all([
    buildLegacyToolContext(prompt, mode, { skipPaperSearch: options.skipResearch }),
    Promise.allSettled(selectedTools.map((tool) => runExternalTool(tool, prompt))),
  ]);
  const external = externalSettled
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((result): result is ExternalToolResult => Boolean(result));

  return {
    text: [legacy.text, external.length > 0 ? ["COSMOS EXTERNAL INTELLIGENCE SOURCES", ...external.map((result) => `---\n${result.text}`)].join("\n\n") : ""]
      .filter(Boolean)
      .join("\n\n"),
    sources: Array.from(new Set([...legacy.sources, ...external.flatMap((result) => result.sources)])),
    sourceCards: Array.from(new Map([...legacy.sourceCards, ...external.flatMap((result) => result.sourceCards)].map((card) => [card.id, card])).values()).slice(0, 8),
    toolsUsed: legacy.toolsUsed,
  };
}
