import type { SourceCandidate } from "./relevance-score.ts";
import type { ScholarlyLookupIntent } from "./scholarly-query-normalizer.ts";
import { normalizeDoi, normalizeScholarlyTitle } from "./scholarly-paper.ts";

export type ScholarlyRetrievalPath =
  | "doi"
  | "id"
  | "exact-title"
  | "partial-title"
  | "author"
  | "lexical"
  | "semantic"
  | "provider";

export type IndexedScholarlyMatch = {
  paper: SourceCandidate;
  score: number;
  paths: ScholarlyRetrievalPath[];
  matchedTerms: string[];
};

export type ScholarlyIndexDiagnostics = {
  candidateCount: number;
  selectedCount: number;
  duplicateCount: number;
  rejectionReasons: Record<string, string[]>;
  appliedFilters: {
    year?: number;
    journal?: string;
    author?: string;
  };
};

export type ScholarlyIndexResult = {
  sources: IndexedScholarlyMatch[];
  diagnostics: ScholarlyIndexDiagnostics;
};

export interface ScholarlyPaperStore {
  readonly papers: SourceCandidate[];
  readonly duplicateCount: number;
}

type IndexedPaper = SourceCandidate & {
  normalizedTitle?: string;
  subjects?: string[];
};

const STOP_WORDS = new Set([
  "a", "an", "and", "about", "article", "articles", "by", "find", "for", "from", "in", "is", "me",
  "of", "on", "paper", "papers", "published", "research", "show", "studies", "study", "the", "to", "what", "with",
]);

function normalize(value?: string) {
  return normalizeScholarlyTitle(value ?? "");
}

function terms(value?: string) {
  return Array.from(new Set(normalize(value).split(" ").filter((term) => term.length > 1 && !STOP_WORDS.has(term))));
}

function surname(value?: string) {
  const name = normalize(value);
  return name.split(" ").at(-1);
}

function editDistance(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 2) return 3;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const saved = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = saved;
    }
  }
  return row[right.length];
}

function fuzzyTermMatch(queryTerm: string, paperTerm: string) {
  if (queryTerm === paperTerm) return true;
  if (queryTerm.length < 5 || paperTerm.length < 5) return false;
  return editDistance(queryTerm, paperTerm) <= 1;
}

function overlapScore(queryTerms: string[], paperTerms: string[]) {
  if (queryTerms.length === 0 || paperTerms.length === 0) return 0;
  const matches = queryTerms.filter((queryTerm) => paperTerms.some((paperTerm) => fuzzyTermMatch(queryTerm, paperTerm)));
  return matches.length / queryTerms.length;
}

function mergeDuplicate(left: IndexedPaper, right: IndexedPaper): IndexedPaper {
  const primary = (left.abstract?.length ?? 0) >= (right.abstract?.length ?? 0) ? left : right;
  const secondary = primary === left ? right : left;
  return {
    ...secondary,
    ...primary,
    authors: Array.from(new Set([...(primary.authors ?? []), ...(secondary.authors ?? [])])),
    concepts: Array.from(new Set([...(primary.concepts ?? []), ...(secondary.concepts ?? [])])),
    keywords: Array.from(new Set([...(primary.keywords ?? []), ...(secondary.keywords ?? [])])),
    sourceProviders: Array.from(new Set([...(primary.sourceProviders ?? [primary.provider]), ...(secondary.sourceProviders ?? [secondary.provider])])),
  };
}

function duplicateKey(paper: IndexedPaper) {
  const doi = normalizeDoi(paper.doi);
  if (doi) return `doi:${doi.toLowerCase()}`;
  const arxiv = paper.arxivId?.toLowerCase();
  if (arxiv) return `arxiv:${arxiv}`;
  return `title:${normalize(paper.title)}`;
}

export function createInMemoryScholarlyIndex(input: SourceCandidate[]): ScholarlyPaperStore {
  const merged = new Map<string, IndexedPaper>();
  const identityOwners = new Map<string, string>();
  let duplicateCount = 0;
  for (const paper of input as IndexedPaper[]) {
    const identities = [
      normalizeDoi(paper.doi) ? `doi:${normalizeDoi(paper.doi)!.toLowerCase()}` : undefined,
      paper.arxivId ? `arxiv:${paper.arxivId.toLowerCase()}` : undefined,
      `title:${normalize(paper.title)}`,
    ].filter((value): value is string => Boolean(value));
    const owner = identities.map((identity) => identityOwners.get(identity)).find(Boolean);
    const key = owner ?? duplicateKey(paper);
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, mergeDuplicate(existing, paper));
      duplicateCount += 1;
    } else {
      merged.set(key, { ...paper });
    }
    for (const identity of identities) identityOwners.set(identity, key);
  }
  return { papers: [...merged.values()], duplicateCount };
}

function exactSignals(intent: ScholarlyLookupIntent, paper: IndexedPaper) {
  const paths: ScholarlyRetrievalPath[] = [];
  let score = 0;
  const paperDoi = normalizeDoi(paper.doi);
  const title = normalize(paper.title);
  const exactTitle = normalize(intent.exactTitle);
  const partialTitle = normalize(intent.partialTitle);
  const normalizedId = normalize(paper.id);

  if (intent.doi && paperDoi?.toLowerCase() === intent.doi.toLowerCase()) {
    paths.push("doi");
    score = 100;
  }
  if (intent.internalPaperId && (paper.id.toLowerCase() === intent.internalPaperId.toLowerCase() || normalizedId === normalize(intent.internalPaperId))) {
    paths.push("id");
    score = 100;
  }
  if (
    title === intent.normalizedQuery ||
    Boolean(exactTitle && title === exactTitle) ||
    Boolean(partialTitle && title === partialTitle)
  ) {
    paths.push("exact-title");
    score = Math.max(score, 98);
  } else if (
    partialTitle.length >= 8 &&
    (title.includes(partialTitle) || partialTitle.includes(title)) &&
    Math.min(terms(title).length, terms(partialTitle).length) >= 2
  ) {
    paths.push("partial-title");
    score = Math.max(score, 84);
  }

  return { paths, score };
}

function authorScore(intent: ScholarlyLookupIntent, paper: IndexedPaper) {
  const query = ` ${intent.normalizedQuery} `;
  const labelledAuthors = intent.authorNames.map(normalize);
  for (const author of paper.authors ?? []) {
    const normalizedAuthor = normalize(author);
    const authorSurname = surname(author);
    if (
      labelledAuthors.some((label) => normalizedAuthor.includes(label) || label.includes(normalizedAuthor)) ||
      normalizedAuthor.length > 4 && query.includes(` ${normalizedAuthor} `) ||
      authorSurname && authorSurname.length > 3 && query.includes(` ${authorSurname} `)
    ) {
      return 1;
    }
  }
  return 0;
}

function lexicalFields(paper: IndexedPaper) {
  return {
    title: terms(paper.title),
    abstract: terms(paper.abstract),
    metadata: terms([
      ...(paper.concepts ?? []),
      ...(paper.keywords ?? []),
      ...(paper.fieldsOfStudy ?? []),
      ...(paper.subjects ?? []),
      paper.source,
    ].filter(Boolean).join(" ")),
  };
}

function journalMatches(requested: string, actual?: string) {
  const left = normalize(requested);
  const right = normalize(actual);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

export async function retrieveFromScholarlyIndex(
  intent: ScholarlyLookupIntent,
  store: ScholarlyPaperStore,
  options: { limit?: number } = {},
): Promise<ScholarlyIndexResult> {
  const limit = Math.min(20, Math.max(1, options.limit ?? 8));
  const rejectionReasons: Record<string, string[]> = {};
  const matches: IndexedScholarlyMatch[] = [];
  const queryVariants = intent.lexicalVariants.map(terms);

  for (const paper of store.papers as IndexedPaper[]) {
    const reasons: string[] = [];
    if (intent.hardFilters.year && paper.year !== intent.hardFilters.year) reasons.push("explicit_year_mismatch");
    if (intent.hardFilters.journal && !journalMatches(intent.hardFilters.journal, paper.source)) reasons.push("explicit_journal_mismatch");
    if (intent.hardFilters.author && authorScore(intent, paper) === 0) reasons.push("explicit_author_mismatch");
    if (paper.isRetracted) reasons.push("retracted");
    if (reasons.length > 0) {
      rejectionReasons[paper.id] = reasons;
      continue;
    }

    const exact = exactSignals(intent, paper);
    const author = authorScore(intent, paper);
    const fields = lexicalFields(paper);
    let lexical = 0;
    let matchedTerms: string[] = [];
    for (const variant of queryVariants) {
      const title = overlapScore(variant, fields.title);
      const abstract = overlapScore(variant, fields.abstract);
      const metadata = overlapScore(variant, fields.metadata);
      const combined = title * 0.58 + abstract * 0.22 + metadata * 0.20;
      if (combined > lexical) {
        lexical = combined;
        matchedTerms = variant.filter((term) =>
          [...fields.title, ...fields.abstract, ...fields.metadata].some((candidate) => fuzzyTermMatch(term, candidate))
        );
      }
    }

    const paths = [...exact.paths];
    if (author > 0) paths.push("author");
    if (lexical >= 0.22) paths.push("lexical");
    const score = Math.max(
      exact.score,
      author * 55 + lexical * 45,
      lexical * 100,
    );
    const strongIdentity = paths.some((path) => path === "doi" || path === "id" || path === "exact-title");
    if (!strongIdentity && score < 32) {
      rejectionReasons[paper.id] = ["below_lexical_relevance_threshold"];
      continue;
    }

    matches.push({
      paper,
      score: Math.round(score * 100) / 100,
      paths: Array.from(new Set(paths)),
      matchedTerms,
    });
  }

  matches.sort((left, right) =>
    right.score - left.score ||
    Number(right.paths.includes("doi")) - Number(left.paths.includes("doi")) ||
    Number(right.paths.includes("exact-title")) - Number(left.paths.includes("exact-title")) ||
    (right.paper.citationCount ?? 0) - (left.paper.citationCount ?? 0)
  );

  return {
    sources: matches.slice(0, limit),
    diagnostics: {
      candidateCount: store.papers.length,
      selectedCount: Math.min(matches.length, limit),
      duplicateCount: store.duplicateCount,
      rejectionReasons,
      appliedFilters: {
        year: intent.hardFilters.year,
        journal: intent.hardFilters.journal,
        author: intent.hardFilters.author,
      },
    },
  };
}
