export type ResearchMode =
  | "recent"
  | "foundational"
  | "landmark"
  | "review"
  | "systematic-review"
  | "highly-cited"
  | "directly-relevant"
  | "latest-developments"
  | "methods"
  | "dataset"
  | "general";

export type ScholarlyPaperType =
  | "journal-article"
  | "preprint"
  | "review"
  | "conference-paper"
  | "dataset";

export type ResearchRequest = {
  mode: ResearchMode;
  topic: string;
  requiredConcepts: string[];
  excludedConcepts: string[];
  startYear?: number;
  endYear?: number;
  paperTypes: ScholarlyPaperType[];
  peerReviewedOnly: boolean;
  preprintsAllowed: boolean;
  resultCount: number;
  sortPreference: "relevance" | "newest" | "citation-impact" | "balanced";
  userRequestedFields: string[];
};

const COUNT_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const TOPIC_STOP_WORDS = new Set([
  "a", "an", "and", "article", "articles", "best", "directly", "find", "for", "give", "highly", "important",
  "journal", "landmark", "latest", "me", "most", "of", "on", "paper", "papers", "peer", "published", "recent",
  "relevant", "research", "review", "reviews", "show", "source", "sources", "studies", "study", "systematic", "the",
]);

const DEFAULT_PAPER_TYPES: ScholarlyPaperType[] = [
  "journal-article",
  "preprint",
  "review",
  "conference-paper",
];

function clean(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalized(value: string) {
  return clean(value).toLowerCase().replace(/[\u2018\u2019]/g, "'");
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function detectMode(query: string): ResearchMode {
  if (/\bsystematic\s+(?:review|reviews)\b/.test(query)) return "systematic-review";
  if (/\b(?:latest|newest)\s+(?:important\s+)?(?:developments?|papers?|research)\b|\blatest developments?\b/.test(query)) {
    return "latest-developments";
  }
  if (/\b(?:foundational|classic|seminal)\b/.test(query)) return "foundational";
  if (/\blandmark\b/.test(query)) return "landmark";
  if (/\b(?:review papers?|review articles?|reviews?)\b/.test(query)) return "review";
  if (/\bhighly[- ]cited\b/.test(query)) return "highly-cited";
  if (/\b(?:recent|latest|newest|last year|past \d+ years?|since \d{4}|after \d{4})\b/.test(query)) return "recent";
  if (/\b(?:directly relevant|most relevant|exact-topic|exact topic)\b/.test(query)) return "directly-relevant";
  if (/\b(?:methods?|methodology|techniques?)\b/.test(query)) return "methods";
  if (/\b(?:datasets?|data set)\b/.test(query)) return "dataset";
  return "general";
}

function extractResultCount(query: string) {
  const numeric = query.match(/\b(\d{1,2})\s+(?:peer[- ]reviewed\s+)?(?:papers?|articles?|reviews?|studies|sources?)\b/);
  if (numeric) return Math.min(10, Math.max(1, Number(numeric[1])));
  const word = query.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b(?=.{0,40}\b(?:papers?|articles?|reviews?|studies|sources?)\b)/);
  return word ? COUNT_WORDS[word[1]] : undefined;
}

function extractTopic(original: string) {
  const doi = original.match(/(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i)?.[1];
  if (doi) return doi;

  const withoutFollowup = original
    .replace(/\bfor each[,\s].*$/i, "")
    .replace(/\b(?:and\s+)?explain why each.*$/i, "")
    .replace(/\bno review papers?.*$/i, "")
    .replace(/[?.!,;:]+$/g, "")
    .trim();
  const explicit = withoutFollowup.match(/\b(?:on|about)\s+(.+)$/i)?.[1]?.trim();
  if (explicit) return explicit.replace(/[?.!,;:]+$/g, "").replace(/^(?:a|an|the)\s+/i, "").trim();

  return withoutFollowup
    .replace(/^(?:please\s+)?(?:give|find|show|list|search)(?:\s+me)?\s+/i, "")
    .replace(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b/i, "")
    .replace(/\b(?:peer[- ]reviewed|foundational|landmark|classic|seminal|recent|latest|newest|highly[- ]cited|systematic|review)\b/gi, "")
    .replace(/\b(?:papers?|articles?|reviews?|studies|sources?|published after \d{4}|since \d{4})\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function conceptsForTopic(topic: string) {
  const value = normalized(topic);
  const known = [
    ["black hole information paradox", ["black hole", "information paradox"]],
    ["exoplanet atmospheric biosignatures", ["exoplanet", "atmospheric", "biosignatures"]],
    ["dark-matter direct detection", ["dark matter", "direct detection"]],
    ["dark matter direct detection", ["dark matter", "direct detection"]],
    ["mars biosignatures", ["mars", "biosignatures"]],
    ["jwst observations of early galaxies", ["jwst", "observations", "early galaxies"]],
    ["astronomy education", ["astronomy", "education"]],
    ["gravitational lensing", ["gravitational lensing"]],
    ["quantum gravity and black-hole entropy", ["quantum gravity", "black hole entropy"]],
    ["quantum gravity and black hole entropy", ["quantum gravity", "black hole entropy"]],
  ] as const;
  const match = known.find(([phrase]) => value.includes(phrase));
  if (match) return [...match[1]];

  return unique(
    value
      .replace(/-/g, " ")
      .split(" ")
      .filter((term) => term.length > 2 && !TOPIC_STOP_WORDS.has(term)),
  ).slice(0, 8);
}

function parseDateRange(query: string, mode: ResearchMode, now: Date) {
  const currentYear = now.getUTCFullYear();
  const range = query.match(/\b(?:between|from)\s+(\d{4})\s+(?:and|to)\s+(\d{4})\b/);
  if (range) return { startYear: Number(range[1]), endYear: Number(range[2]) };
  const exactLatestYear = query.match(/\b(?:latest\s+)?(20\d{2})\s+papers?\b/);
  if (exactLatestYear) return { startYear: Number(exactLatestYear[1]), endYear: Number(exactLatestYear[1]) };
  const after = query.match(/\b(?:published\s+)?after\s+(\d{4})\b/);
  if (after) return { startYear: Number(after[1]) + 1, endYear: currentYear };
  const since = query.match(/\bsince\s+(\d{4})\b/);
  if (since) return { startYear: Number(since[1]), endYear: currentYear };
  const before = query.match(/\bbefore\s+(\d{4})\b/);
  if (before) return { startYear: undefined, endYear: Number(before[1]) - 1 };
  const pastYears = query.match(/\b(?:past|last)\s+(\d{1,2})\s+years?\b/);
  if (pastYears) return { startYear: currentYear - Math.max(0, Number(pastYears[1]) - 1), endYear: currentYear };
  if (/\blast year\b/.test(query)) return { startYear: currentYear - 1, endYear: currentYear - 1 };
  if (mode === "recent" || mode === "latest-developments") return { startYear: currentYear - 3, endYear: currentYear };
  return { startYear: undefined, endYear: undefined };
}

function requestedFields(query: string) {
  const fields = ["title", "authors", "year", "journal", "direct-link"];
  if (/\bdoi\b/.test(query)) fields.push("doi");
  if (/\barxiv\b/.test(query)) fields.push("arxiv-id");
  if (/\bcitations?|highly[- ]cited\b/.test(query)) fields.push("citation-count");
  if (/\b(?:explain why|why each|relevan)\w*\b/.test(query)) fields.push("relevance-explanation");
  if (/\babstract\b/.test(query)) fields.push("abstract");
  return unique(fields);
}

export function parseResearchRequest(value: string, now = new Date()): ResearchRequest {
  const original = clean(value).slice(0, 2_000);
  const query = normalized(original);
  const mode = detectMode(query);
  const peerReviewedOnly = /\bpeer[- ]reviewed\s+only\b|\bpeer[- ]reviewed papers?\b/.test(query) && !/\bpreprints? allowed\b/.test(query);
  const preprintsAllowed = !peerReviewedOnly && !/\b(?:no|exclude|without)\s+preprints?\b/.test(query);
  const excludesReviews = /\b(?:no|exclude|without)\s+(?:review|reviews|review papers?)\b/.test(query);
  const topic = extractTopic(original) || original;
  const dateRange = parseDateRange(query, mode, now);

  let paperTypes: ScholarlyPaperType[] = [...DEFAULT_PAPER_TYPES];
  if (mode === "review" || mode === "systematic-review") paperTypes = ["review"];
  else if (mode === "dataset") paperTypes = ["dataset"];
  else if (peerReviewedOnly) paperTypes = ["journal-article", "review", "conference-paper"];
  if (excludesReviews) paperTypes = paperTypes.filter((type) => type !== "review");
  if (!preprintsAllowed) paperTypes = paperTypes.filter((type) => type !== "preprint");

  const sortPreference = mode === "foundational" || mode === "landmark" || mode === "highly-cited"
    ? "citation-impact"
    : mode === "latest-developments"
      ? "newest"
      : mode === "recent"
        ? "balanced"
        : "relevance";

  return {
    mode,
    topic,
    requiredConcepts: conceptsForTopic(topic),
    excludedConcepts: excludesReviews ? ["review"] : [],
    startYear: dateRange.startYear,
    endYear: dateRange.endYear,
    paperTypes,
    peerReviewedOnly,
    preprintsAllowed,
    resultCount: extractResultCount(query) ?? (mode === "review" ? 3 : 5),
    sortPreference,
    userRequestedFields: requestedFields(query),
  };
}
