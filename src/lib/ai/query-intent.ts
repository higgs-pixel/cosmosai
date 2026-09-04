export type CosmosQueryMode =
  | "general-explanation"
  | "advanced-scientific"
  | "scholarly-sources"
  | "false-premise"
  | "current-mission"
  | "live-data"
  | "image-search"
  | "comparison"
  | "educational"
  | "uncertain-science";

export type CosmosQueryIntent = {
  mode: CosmosQueryMode;
  originalQuery: string;
  normalizedQuery: string;
  requestedSourceCount?: number;
  requiresDirectSources: boolean;
  isTimeSensitive: boolean;
  scholarlySignals: string[];
  falsePremiseSignals: string[];
};

const NUMBER_WORDS: Record<string, number> = {
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

function normalize(value: string) {
  return value.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
}

function matchedTerms(value: string, terms: string[]) {
  return terms.filter((term) => value.includes(term));
}

function requestedSourceCount(query: string) {
  const numeric = query.match(/\b(\d{1,2})\s+(?:peer[- ]reviewed\s+|preprint\s+)?(?:papers?|sources?|studies|articles?)\b/);
  if (numeric) return Math.min(20, Math.max(1, Number(numeric[1])));

  const word = query.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b(?=.{0,48}\b(?:papers?|sources?|studies|articles?)\b)/);
  return word ? NUMBER_WORDS[word[1]] : undefined;
}

export function classifyCosmosQuery(value: string): CosmosQueryIntent {
  const originalQuery = value.replace(/\s+/g, " ").trim().slice(0, 2_000);
  const query = normalize(originalQuery);
  const scholarlySignals = matchedTerms(query, [
    "peer-reviewed", "peer reviewed", "preprint", "paper", "papers", "journal", "sources",
    "bibliography", "citation", "citations", "doi", "arxiv", "literature review",
  ]);
  const hasScholarlyIdentifier =
    /\b10\.\d{4,9}\/[-._;()/:a-z0-9]+\b/i.test(query) ||
    /\b(?:paper|work|record)[-_ ]?id\s*[:#]/i.test(query) ||
    /\b(?:paper|article|study)\s+(?:titled|called|named)\b/i.test(query);
  const falsePremiseSignals = matchedTerms(query, [
    "nasa confirm", "nasa confirmed", "nasa hide", "nasa hid", "jwst prove", "jwst proved",
    "aliens built", "alien structures", "big bang was wrong", "big bang is wrong",
  ]);
  const directSignals = matchedTerms(query, [
    "specifically about", "directly relevant", "most relevant", "core papers", "foundational sources",
    "foundational papers", "peer-reviewed", "peer reviewed", "preprint",
  ]);
  const count = requestedSourceCount(query);
  const isTimeSensitive = /\b(today|tonight|now|current|currently|latest|live|upcoming|next)\b/.test(query);

  let mode: CosmosQueryMode;
  if (
    falsePremiseSignals.length > 0 ||
    /\bwhy (?:did|does|is|has)\b.*\b(?:confirm|confirmed|prove|proved|hide|hidden)\b/.test(query) &&
      /\b(?:nasa|jwst|scientists?|astronomers?)\b/.test(query)
  ) {
    mode = "false-premise";
  } else if (
    hasScholarlyIdentifier ||
    scholarlySignals.length > 0 && (count !== undefined || /\b(?:find|give|show|list|cite|sources?|papers?|literature)\b/.test(query))
  ) {
    mode = "scholarly-sources";
  } else if (/\b(?:image|images|photo|photos|picture|pictures|media)\b/.test(query) && /\b(?:find|search|show|browse|nasa)\b/.test(query)) {
    mode = "image-search";
  } else if (isTimeSensitive && /\b(?:artemis|mission|launch|programme|program|spacecraft|rover)\b/.test(query)) {
    mode = "current-mission";
  } else if (isTimeSensitive && /\b(?:observe|visible|sky|weather|asteroid|iss|space station|space activity|space weather)\b/.test(query)) {
    mode = "live-data";
  } else if (/\b(?:compare|versus|vs\.?|difference between)\b/.test(query)) {
    mode = "comparison";
  } else if (/\b(?:what existed before the big bang|before the big bang|unknown|uncertain|could have existed)\b/.test(query)) {
    mode = "uncertain-science";
  } else if (
    /\b(?:information paradox|hawking radiation|unitarity|quantum gravity|page curve|event horizon|cosmological constant|general relativity)\b/.test(query) ||
    /\b(?:derive|mechanism|major proposed resolutions|physical setup)\b/.test(query)
  ) {
    mode = "advanced-scientific";
  } else if (/\b(?:explain simply|for a student|like i'm|beginner|teach me)\b/.test(query)) {
    mode = "educational";
  } else {
    mode = "general-explanation";
  }

  return {
    mode,
    originalQuery,
    normalizedQuery: query,
    requestedSourceCount: count,
    requiresDirectSources: directSignals.length > 0,
    isTimeSensitive,
    scholarlySignals,
    falsePremiseSignals,
  };
}

export function intentNeedsScholarlyRetrieval(intent: CosmosQueryIntent) {
  return intent.mode === "advanced-scientific" || intent.mode === "scholarly-sources";
}
