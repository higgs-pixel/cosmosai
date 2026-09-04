import { safeExternalUrl } from "../security/safe-url.ts";
import type { ScholarlyPaperType } from "./research-request.ts";

export type ScholarlyAuthor = {
  name: string;
  orcid?: string;
};

export type ScholarlyPaper = {
  canonicalId: string;
  title: string;
  abstract?: string;
  authors: ScholarlyAuthor[];
  year?: number;
  publicationDate?: string;
  journal?: string;
  venueType?: string;
  doi?: string;
  arxivId?: string;
  pmid?: string;
  openAlexId?: string;
  adsBibcode?: string;
  urls: {
    canonical?: string;
    publisher?: string;
    preprint?: string;
    pdf?: string;
  };
  citationCount?: number;
  influentialCitationCount?: number;
  referencedWorksCount?: number;
  concepts?: string[];
  keywords?: string[];
  fieldsOfStudy?: string[];
  paperType?: ScholarlyPaperType;
  isRetracted?: boolean;
  isPreprint?: boolean;
  isPeerReviewed?: boolean;
  sourceProviders: string[];
  rawProviderIds: Record<string, string>;
};

export type ProviderPaperRecord = {
  title: string;
  authors?: Array<string | { name: string; orcid?: string }>;
  year?: number;
  publishedAt?: string;
  publicationDate?: string;
  source?: string;
  journal?: string;
  venueType?: string;
  summary?: string;
  abstract?: string;
  doi?: string;
  arxivId?: string;
  pmid?: string;
  openAlexId?: string;
  adsBibcode?: string;
  url?: string;
  publisherUrl?: string;
  pdfUrl?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  referencedWorksCount?: number;
  concepts?: string[];
  keywords?: string[];
  fieldsOfStudy?: string[];
  paperType?: ScholarlyPaperType | string;
  isRetracted?: boolean;
  isPreprint?: boolean;
  isPeerReviewed?: boolean;
  provider: string;
  sourceProviders?: string[];
  rawProviderIds?: Record<string, string>;
};

const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
const ARXIV_PATTERN = /^(?:\d{4}\.\d{4,5}|[a-z-]+\/\d{7})$/i;

function compact(value?: string, max = 4_000) {
  const text = value?.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : undefined;
}

export function normalizeDoi(value?: string) {
  const doi = compact(value, 240)?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
  return doi && DOI_PATTERN.test(doi) ? doi : undefined;
}

export function normalizeArxivId(value?: string) {
  const id = compact(value, 100)
    ?.replace(/^arxiv:\s*/i, "")
    .replace(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\//i, "")
    .replace(/\.pdf$/i, "")
    .replace(/v\d+$/i, "");
  return id && ARXIV_PATTERN.test(id) ? id : undefined;
}

export function normalizeScholarlyTitle(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\[a-z]+\{([^}]*)\}/g, "$1")
    .replace(/[$\\{}]/g, " ")
    .replace(/\bv\d+\s*$/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:a|an|the)\s+/, "");
}

function paperType(value?: string, isPreprint?: boolean): ScholarlyPaperType | undefined {
  const type = value?.toLowerCase().replace(/_/g, "-");
  if (isPreprint || type === "preprint" || type === "posted-content") return "preprint";
  if (type?.includes("review")) return "review";
  if (type?.includes("conference") || type === "proceedings-article") return "conference-paper";
  if (type?.includes("dataset")) return "dataset";
  if (type === "article" || type === "journal-article") return "journal-article";
  return undefined;
}

function safeUrl(value?: string) {
  return value ? safeExternalUrl(value) ?? undefined : undefined;
}

function normalizeAuthors(authors?: ProviderPaperRecord["authors"]) {
  const seen = new Set<string>();
  return (authors ?? []).flatMap((author) => {
    const name = compact(typeof author === "string" ? author : author.name, 160);
    if (!name || seen.has(name.toLowerCase())) return [];
    seen.add(name.toLowerCase());
    return [{ name, orcid: typeof author === "string" ? undefined : safeUrl(author.orcid) }];
  }).slice(0, 30);
}

function canonicalId(record: ProviderPaperRecord, title: string, authors: ScholarlyAuthor[], doi?: string, arxivId?: string) {
  if (doi) return `doi:${doi.toLowerCase()}`;
  if (arxivId) return `arxiv:${arxivId.toLowerCase()}`;
  if (record.openAlexId) return `openalex:${record.openAlexId.toLowerCase()}`;
  if (record.adsBibcode) return `ads:${record.adsBibcode.toLowerCase()}`;
  return `title:${normalizeScholarlyTitle(title)}:${authors[0]?.name.toLowerCase() ?? "unknown"}`;
}

export function validateScholarlyPaper(paper: ScholarlyPaper) {
  const reasons: string[] = [];
  const currentYear = new Date().getUTCFullYear();
  if (!paper.title || paper.title.length < 8 || /^(?:untitled|unknown)(?:\s|$)/i.test(paper.title) || /(?:\.\.\.|…)\s*$/.test(paper.title)) reasons.push("invalid_title");
  if (paper.authors.length === 0) reasons.push("missing_authors");
  if (paper.year !== undefined && (paper.year < 1600 || paper.year > currentYear + 1)) reasons.push("implausible_year");
  if (paper.doi && !DOI_PATTERN.test(paper.doi)) reasons.push("malformed_doi");
  if (paper.arxivId && !ARXIV_PATTERN.test(paper.arxivId)) reasons.push("malformed_arxiv_id");
  if (!paper.urls.canonical && !paper.urls.publisher && !paper.urls.preprint && !paper.doi && !paper.arxivId) reasons.push("missing_verifiable_link");
  if (paper.isRetracted) reasons.push("retracted");
  if (paper.sourceProviders.length === 0) reasons.push("missing_provider");
  return { valid: reasons.length === 0, reasons };
}

export function normalizeScholarlyPaper(record: ProviderPaperRecord): ScholarlyPaper | null {
  const title = compact(record.title, 500);
  if (!title) return null;
  const authors = normalizeAuthors(record.authors);
  const doi = normalizeDoi(record.doi);
  const arxivId = normalizeArxivId(record.arxivId ?? record.url);
  const inferredType = paperType(record.paperType, record.isPreprint ?? record.provider.toLowerCase() === "arxiv");
  const canonical = safeUrl(record.url) ?? (doi ? `https://doi.org/${doi}` : arxivId ? `https://arxiv.org/abs/${arxivId}` : undefined);
  const sourceProviders = Array.from(new Set([record.provider, ...(record.sourceProviders ?? [])].filter(Boolean)));
  const isPreprint = record.isPreprint ?? inferredType === "preprint";
  const isPeerReviewed = record.isPeerReviewed ?? Boolean(
    !isPreprint &&
    (inferredType === "journal-article" || inferredType === "review" || inferredType === "conference-paper") &&
    (record.journal || record.source),
  );
  const paper: ScholarlyPaper = {
    canonicalId: canonicalId(record, title, authors, doi, arxivId),
    title,
    abstract: compact(record.abstract ?? record.summary),
    authors,
    year: record.year,
    publicationDate: compact(record.publicationDate ?? record.publishedAt, 40),
    journal: compact(record.journal ?? record.source, 240),
    venueType: compact(record.venueType, 80),
    doi,
    arxivId,
    pmid: compact(record.pmid, 80),
    openAlexId: compact(record.openAlexId, 120),
    adsBibcode: compact(record.adsBibcode, 80),
    urls: {
      canonical,
      publisher: safeUrl(record.publisherUrl) ?? (doi ? `https://doi.org/${doi}` : undefined),
      preprint: arxivId ? `https://arxiv.org/abs/${arxivId}` : undefined,
      pdf: safeUrl(record.pdfUrl),
    },
    citationCount: record.citationCount,
    influentialCitationCount: record.influentialCitationCount,
    referencedWorksCount: record.referencedWorksCount,
    concepts: Array.from(new Set((record.concepts ?? []).map((value) => compact(value, 120)).filter((value): value is string => Boolean(value)))).slice(0, 20),
    keywords: Array.from(new Set((record.keywords ?? []).map((value) => compact(value, 120)).filter((value): value is string => Boolean(value)))).slice(0, 20),
    fieldsOfStudy: Array.from(new Set((record.fieldsOfStudy ?? []).map((value) => compact(value, 120)).filter((value): value is string => Boolean(value)))).slice(0, 12),
    paperType: inferredType,
    isRetracted: Boolean(record.isRetracted),
    isPreprint,
    isPeerReviewed,
    sourceProviders,
    rawProviderIds: { ...(record.rawProviderIds ?? {}) },
  };

  if (record.openAlexId) paper.rawProviderIds.OpenAlex = record.openAlexId;
  if (arxivId) paper.rawProviderIds.arXiv = arxivId;
  if (record.adsBibcode) paper.rawProviderIds["NASA ADS"] = record.adsBibcode;
  return validateScholarlyPaper(paper).valid ? paper : null;
}

function titleTokens(title: string) {
  return new Set(normalizeScholarlyTitle(title).split(" ").filter((term) => term.length > 2));
}

function titleSimilarity(left: string, right: string) {
  const a = titleTokens(left);
  const b = titleTokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((term) => b.has(term)).length;
  return intersection / Math.max(a.size, b.size);
}

function authorSurname(value?: string) {
  const normalized = value?.normalize("NFKC").toLowerCase().replace(/[^\p{L}\s,.-]/gu, "").trim();
  if (!normalized) return undefined;
  const surname = normalized.includes(",") ? normalized.split(",")[0] : normalized.split(/\s+/).at(-1);
  return surname?.replace(/[^\p{L}]/gu, "") || undefined;
}

function duplicateKeys(paper: ScholarlyPaper) {
  return [
    paper.doi ? `doi:${paper.doi.toLowerCase()}` : undefined,
    paper.arxivId ? `arxiv:${paper.arxivId.toLowerCase()}` : undefined,
    paper.openAlexId ? `openalex:${paper.openAlexId.toLowerCase()}` : undefined,
    paper.adsBibcode ? `ads:${paper.adsBibcode.toLowerCase()}` : undefined,
  ].filter((value): value is string => Boolean(value));
}

function mergePaper(left: ScholarlyPaper, right: ScholarlyPaper): ScholarlyPaper {
  const primary = left.isPeerReviewed && !right.isPeerReviewed ? left : right.isPeerReviewed && !left.isPeerReviewed ? right : left;
  const secondary = primary === left ? right : left;
  return {
    ...secondary,
    ...primary,
    canonicalId: primary.doi ? `doi:${primary.doi.toLowerCase()}` : primary.canonicalId,
    abstract: primary.abstract && primary.abstract.length >= (secondary.abstract?.length ?? 0) ? primary.abstract : secondary.abstract,
    authors: primary.authors.length >= secondary.authors.length ? primary.authors : secondary.authors,
    doi: primary.doi ?? secondary.doi,
    arxivId: primary.arxivId ?? secondary.arxivId,
    openAlexId: primary.openAlexId ?? secondary.openAlexId,
    urls: { ...secondary.urls, ...Object.fromEntries(Object.entries(primary.urls).filter(([, value]) => Boolean(value))) },
    citationCount: Math.max(primary.citationCount ?? 0, secondary.citationCount ?? 0) || undefined,
    concepts: Array.from(new Set([...(primary.concepts ?? []), ...(secondary.concepts ?? [])])).slice(0, 20),
    keywords: Array.from(new Set([...(primary.keywords ?? []), ...(secondary.keywords ?? [])])).slice(0, 20),
    sourceProviders: Array.from(new Set([...primary.sourceProviders, ...secondary.sourceProviders])),
    rawProviderIds: { ...secondary.rawProviderIds, ...primary.rawProviderIds },
    isPeerReviewed: Boolean(primary.isPeerReviewed || secondary.isPeerReviewed),
    isPreprint: Boolean(primary.isPreprint && secondary.isPreprint),
    isRetracted: Boolean(primary.isRetracted || secondary.isRetracted),
  };
}

export function deduplicateScholarlyPapers(input: ScholarlyPaper[]) {
  const papers: ScholarlyPaper[] = [];
  let duplicateCount = 0;
  for (const paper of input) {
    const keys = duplicateKeys(paper);
    const firstAuthor = authorSurname(paper.authors[0]?.name);
    const index = papers.findIndex((existing) => {
      if (duplicateKeys(existing).some((key) => keys.includes(key))) return true;
      const similarity = titleSimilarity(existing.title, paper.title);
      const existingFirstAuthor = authorSurname(existing.authors[0]?.name);
      const sameYear = Boolean(existing.year && paper.year && Math.abs(existing.year - paper.year) <= 1);
      return similarity >= 0.9 && Boolean(
        firstAuthor && existingFirstAuthor === firstAuthor ||
        similarity >= 0.98 && sameYear,
      );
    });
    if (index < 0) papers.push(paper);
    else {
      papers[index] = mergePaper(papers[index], paper);
      duplicateCount += 1;
    }
  }
  return { papers, duplicateCount };
}
