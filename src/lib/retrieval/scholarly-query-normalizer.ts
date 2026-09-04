import { normalizeDoi, normalizeScholarlyTitle } from "./scholarly-paper.ts";

export type ScholarlyFilters = {
  year?: number;
  journal?: string;
  author?: string;
};

export type ScholarlyLookupIntent = {
  originalQuery: string;
  normalizedQuery: string;
  doi?: string;
  internalPaperId?: string;
  exactTitle?: string;
  partialTitle?: string;
  authorNames: string[];
  journal?: string;
  explicitYear?: number;
  hardFilters: ScholarlyFilters;
  softPreferences: ScholarlyFilters;
  lexicalVariants: string[];
  semanticVariants: string[];
};

const QUERY_PREFIXES = [
  /^(?:please\s+)?(?:find|show|give|list|search(?:\s+for)?|cite)\s+(?:me\s+)?/i,
  /^(?:research\s+)?(?:papers?|articles?|studies|publications?)\s+(?:about|on)\s+/i,
];

const TERM_EXPANSIONS: Array<[RegExp, string[]]> = [
  [/\b(?:ai|artificial intelligence)\b/i, ["artificial intelligence", "AI"]],
  [/\b(?:ir|international relations)\b/i, ["international relations", "IR"]],
  [/\b(?:jwst|james webb space telescope)\b/i, ["JWST", "James Webb Space Telescope"]],
  [/\b(?:llm|large language model)\b/i, ["LLM", "large language model", "transformer"]],
  [/\b(?:ar6|sixth assessment report)\b/i, ["AR6", "sixth assessment report", "IPCC"]],
  [/\bblack[- ]?hole information (?:loss|paradox)\b/i, [
    "black hole information paradox",
    "Hawking information loss",
    "Page curve",
    "information recovery",
    "unitarity",
  ]],
  [/\bevent horizons?\b/i, ["event horizon", "black hole", "Hawking radiation"]],
  [/\bpage time\b/i, ["Page time", "Page curve", "information recovery", "radiation entropy"]],
  [/\bwhen information returns?\b/i, ["information recovery", "Page time", "Page curve"]],
  [/\bhawking radiation\b/i, ["Hawking radiation", "thermal radiation", "black hole evaporation"]],
  [/\bcosmic acceleration\b/i, ["accelerating universe", "dark energy", "cosmological constant"]],
  [/\bglobal warming\b/i, ["global warming", "climate change"]],
];

function compact(value: string, max = 2_000) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

function extractDoi(query: string) {
  const match = query.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i);
  return normalizeDoi(match?.[1]);
}

function extractInternalId(query: string) {
  return query.match(/\b(?:paper|work|record)[-_ ]?id\s*[:#]?\s*([a-z0-9][a-z0-9._:-]{2,120})\b/i)?.[1];
}

function extractExactTitle(query: string) {
  const labelled = query.match(/\b(?:paper|article|study)\s+(?:titled|called|named)\s+["“]?([^"”]+)["”]?/i)?.[1];
  if (labelled) return labelled.replace(/[?.!,;:]+$/g, "").trim();
  const quoted = [...query.matchAll(/["“]([^"”]{8,500})["”]/g)].map((match) => match[1]);
  return quoted[0]?.trim();
}

function extractAuthorNames(query: string) {
  const labelled = query.match(/\b(?:papers?|articles?|studies|work)\s+by\s+([\p{L}.' -]{2,100}?)(?=\s+(?:on|about|from|in|published)\b|[?!,;:]|$)/iu)?.[1];
  return unique([labelled]);
}

function extractExplicitYear(query: string) {
  const match = query.match(/\b(?:published\s+in|from|year|during)\s+(18|19|20)\d{2}\b/i);
  return match ? Number(match[0].match(/\d{4}/)?.[0]) : undefined;
}

function extractJournal(query: string) {
  const value = query.match(/\bin\s+([\p{L}\d&.' -]{3,120})$/iu)?.[1]?.trim();
  if (!value || !/\b(?:journal|review|letters|science|nature|organization|administration|proceedings)\b/i.test(value)) {
    return undefined;
  }
  return value;
}

function partialTitle(query: string) {
  let result = query;
  for (const prefix of QUERY_PREFIXES) result = result.replace(prefix, "");
  result = result
    .replace(/\b(?:research\s+)?(?:papers?|articles?|studies|publications?)\b/gi, " ")
    .replace(/\b(?:published\s+in|from|year|during)\s+\d{4}\b/gi, " ")
    .replace(/\bby\s+[\p{L}.' -]+$/iu, " ")
    .replace(/[?!,;:]+$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result.length >= 4 ? result : undefined;
}

function expandedVariants(query: string) {
  const variants = [query];
  for (const [pattern, expansions] of TERM_EXPANSIONS) {
    if (pattern.test(query)) variants.push(...expansions);
  }
  return unique(variants).slice(0, 12);
}

export function normalizeScholarlyLookupQuery(value: string): ScholarlyLookupIntent {
  const originalQuery = compact(value) || "research";
  const normalizedQuery = normalizeScholarlyTitle(originalQuery);
  const doi = extractDoi(originalQuery);
  const internalPaperId = extractInternalId(originalQuery);
  const exactTitle = extractExactTitle(originalQuery);
  const authorNames = extractAuthorNames(originalQuery);
  const explicitYear = extractExplicitYear(originalQuery);
  const journal = extractJournal(originalQuery);
  const partial = partialTitle(originalQuery);
  const variants = expandedVariants(partial ?? originalQuery);

  return {
    originalQuery,
    normalizedQuery,
    doi,
    internalPaperId,
    exactTitle,
    partialTitle: partial,
    authorNames,
    journal,
    explicitYear,
    hardFilters: {
      year: explicitYear,
      journal,
      author: authorNames[0],
    },
    softPreferences: {},
    lexicalVariants: variants,
    semanticVariants: variants.slice(0, 5),
  };
}

export function scholarlyAliasVariants(value: string) {
  return expandedVariants(compact(value));
}
