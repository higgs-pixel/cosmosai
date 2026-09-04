export type RetrievalTopicType = "research" | "mission" | "image" | "live-data" | "general";

export type RetrievalQueryProfile = {
  originalQuery: string;
  exactQueries: string[];
  expandedQueries: string[];
  topicType: RetrievalTopicType;
  providerPriority: string[];
  researchRequest?: ResearchRequest;
};

function normalized(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function classifyTopic(query: string): RetrievalTopicType {
  if (
    /\b10\.\d{4,9}\/[-._;()/:a-z0-9]+\b/i.test(query) ||
    /\b(?:paper|work|record)[-_ ]?id\s*[:#]/i.test(query) ||
    /\b(?:paper|article|study)\s+(?:titled|called|named)\b/i.test(query) ||
    /\b(?:papers?|articles?|studies|work)\s+by\s+[\p{L}]/iu.test(query)
  ) {
    return "research";
  }

  if (includesAny(query, ["image", "images", "photo", "photos", "picture", "pictures", "media archive"])) {
    return "image";
  }

  if (includesAny(query, ["today", "tonight", "current", "live", "latest apod", "apod", "weather", "air quality", "aqi", "space weather", "asteroid watch"])) {
    return "live-data";
  }

  if (includesAny(query, [
    "research",
    "paper",
    "journal",
    "study",
    "publication",
    "citation",
    "information paradox",
    "information loss",
    "unitarity",
    "hawking radiation",
    "quantum gravity",
  ])) {
    return "research";
  }

  if (includesAny(query, ["mission", "chandrayaan", "mangalyaan", "artemis", "voyager", "cassini", "spacecraft", "rover mission"])) {
    return "mission";
  }

  return "general";
}

function providersFor(query: string, topicType: RetrievalTopicType) {
  if (topicType === "research") return ["arXiv", "OpenAlex", "CORE", "NASA ADS", "NASA"];

  if (topicType === "image") {
    if (includesAny(query, ["mars", "rover", "perseverance", "curiosity"])) {
      return ["NASA Mars Rover", "NASA Image Library", "NASA"];
    }
    return ["NASA Image Library", "NASA APOD", "NASA"];
  }

  if (topicType === "live-data") {
    if (query.includes("apod")) return ["NASA APOD", "NASA"];
    if (includesAny(query, ["stargazing", "weather", "tonight", "seeing", "transparency"])) {
      return ["7Timer", "Open-Meteo", "Weatherstack", "PurpleAir"];
    }
    if (includesAny(query, ["air quality", "aqi", "pollution", "pm2.5"])) {
      return ["PurpleAir", "Open-Meteo", "Weatherstack"];
    }
    if (includesAny(query, ["asteroid", "near-earth", "neo"])) return ["NASA NeoWs", "NASA"];
    return ["NASA", "Open-Meteo", "7Timer"];
  }

  if (topicType === "mission") {
    return includesAny(query, ["isro", "chandrayaan", "mangalyaan"])
      ? ["ISRO", "NASA", "Wikidata"]
      : ["NASA", "Wikidata"];
  }

  return ["NASA", "Wikidata", "OpenAlex", "arXiv"];
}

function targetedExpansions(query: string) {
  if (query.includes("black hole") && includesAny(query, ["information paradox", "information loss", "unitarity"])) {
    return [
      "black hole information paradox",
      "black hole information loss",
      "Hawking radiation information loss",
      "black hole unitarity",
      "Page curve black hole",
      "black hole complementarity",
      "black hole firewall",
      "replica wormholes black hole",
      "island formula black hole",
    ];
  }

  if (query.includes("hawking radiation") && includesAny(query, ["information", "loss", "paradox"])) {
    return [
      "Hawking radiation information loss",
      "black hole information paradox",
      "black hole evaporation unitarity",
      "information recovery quantum gravity",
    ];
  }

  if (includesAny(query, ["jwst", "james webb"]) && includesAny(query, ["galaxy", "galaxies"])) {
    return ["JWST galaxies early universe high redshift", "James Webb cosmic dawn galaxies", "JWST galaxy formation reionization"];
  }

  if (query.includes("dark matter") && includesAny(query, ["direct detection", "detector", "wimp"])) {
    return ["dark matter direct detection", "WIMP nuclear recoil experiments", "dark matter detector limits review"];
  }

  if (query.includes("exoplanet") && includesAny(query, ["biosignature", "atmosphere", "atmospheric"])) {
    return ["exoplanet atmospheric biosignatures", "exoplanet atmosphere life detection", "biosignature false positives exoplanets"];
  }

  if (query.includes("mars") && includesAny(query, ["sample return", "returned samples"])) {
    return ["Mars sample return science", "Martian sample laboratory analysis", "Mars returned sample astrobiology"];
  }

  if (query.includes("quantum gravity") && query.includes("black hole") && query.includes("entropy")) {
    return ["quantum gravity black hole entropy", "Bekenstein Hawking entropy microstates", "holographic black hole entropy"];
  }

  if (query.includes("mars") && query.includes("atmosphere")) {
    return ["Mars atmosphere climate evolution", "Martian atmospheric escape", "Mars atmosphere MAVEN observations"];
  }

  return [];
}

export function expandRetrievalQuery(value: string): RetrievalQueryProfile {
  const originalQuery = value.replace(/\s+/g, " ").trim().slice(0, 500) || "astronomy";
  const normalizedQuery = normalized(originalQuery);
  const topicType = classifyTopic(normalizedQuery);
  const researchRequest = topicType === "research" ? parseResearchRequest(originalQuery) : undefined;
  const scholarlyPlan = researchRequest ? createScholarlyQueryPlan(researchRequest) : undefined;
  const plannedExpansions = scholarlyPlan?.variants
    .filter((variant) => variant.purpose !== "exact-phrase")
    .map((variant) => variant.query) ?? [];

  return {
    originalQuery,
    exactQueries: unique([originalQuery, `"${originalQuery.replace(/^"|"$/g, "")}"`]),
    expandedQueries: unique([...targetedExpansions(normalizedQuery), ...plannedExpansions]).slice(0, 9),
    topicType,
    providerPriority: scholarlyPlan?.providers ?? providersFor(normalizedQuery, topicType),
    researchRequest,
  };
}
import { parseResearchRequest, type ResearchRequest } from "./research-request.ts";
import { createScholarlyQueryPlan } from "./scholarly-query-plan.ts";
