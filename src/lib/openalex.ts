import "server-only";
import { env } from "@/lib/env";

const OPENALEX_BASE_URL = "https://api.openalex.org";
const OPENALEX_CACHE_TTL_MS = 30 * 60 * 1000;
const OPENALEX_TIMEOUT_MS = 10_000;
const OPENALEX_MAX_RETRIES = 2;
const OPENALEX_CACHE_MAX_ENTRIES = 160;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const openAlexCache = new Map<string, CacheEntry<unknown>>();

export type OpenAlexSearchType = "papers" | "authors" | "institutions" | "topics" | "all";

export type OpenAlexMeta = {
  count: number;
  page: number;
  perPage: number;
};

export type OpenAlexSearchOptions = {
  query: string;
  limit?: number;
  page?: number;
  fromYear?: number;
  toYear?: number;
  sort?: string;
  searchMode?: "default" | "exact" | "semantic";
  filter?: string;
};

export type OpenAlexAuthor = {
  id: string;
  openAlexId: string;
  displayName: string;
  orcid?: string;
  worksCount: number;
  citationCount: number;
  hIndex?: number;
  lastKnownInstitution?: string;
  openAlexUrl: string;
};

export type OpenAlexInstitution = {
  id: string;
  openAlexId: string;
  displayName: string;
  countryCode?: string;
  ror?: string;
  type?: string;
  worksCount: number;
  citationCount: number;
  homepageUrl?: string;
  openAlexUrl: string;
};

export type OpenAlexTopic = {
  id: string;
  openAlexId: string;
  displayName: string;
  description?: string;
  field?: string;
  subfield?: string;
  domain?: string;
  worksCount: number;
  citationCount: number;
  openAlexUrl: string;
};

export type OpenAlexPaper = {
  id: string;
  openAlexId: string;
  title: string;
  authors: string[];
  institutions: string[];
  publicationYear?: number;
  publicationDate?: string;
  abstract?: string;
  citationCount: number;
  doi?: string;
  openAlexUrl: string;
  primaryUrl?: string;
  journal?: string;
  sourceJournal?: string;
  type?: string;
  venueType?: string;
  concepts: string[];
  topics: string[];
  keywords: string[];
  isRetracted: boolean;
  apaCitation: string;
  mlaCitation: string;
  chicagoCitation: string;
};

export type OpenAlexPaperSearchResult = {
  meta: OpenAlexMeta;
  results: OpenAlexPaper[];
};

export type OpenAlexAuthorSearchResult = {
  meta: OpenAlexMeta;
  results: OpenAlexAuthor[];
};

export type OpenAlexInstitutionSearchResult = {
  meta: OpenAlexMeta;
  results: OpenAlexInstitution[];
};

export type OpenAlexTopicSearchResult = {
  meta: OpenAlexMeta;
  results: OpenAlexTopic[];
};

export type OpenAlexUnifiedSearchResult = {
  papers?: OpenAlexPaperSearchResult;
  authors?: OpenAlexAuthorSearchResult;
  institutions?: OpenAlexInstitutionSearchResult;
  topics?: OpenAlexTopicSearchResult;
};

type OpenAlexListResponse<T> = {
  meta?: {
    count?: number;
    page?: number;
    per_page?: number;
  };
  results?: T[];
};

type OpenAlexWorkRaw = {
  id?: string;
  display_name?: string;
  title?: string;
  doi?: string;
  publication_year?: number;
  publication_date?: string;
  cited_by_count?: number;
  is_retracted?: boolean;
  type?: string;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: Array<{
    author?: {
      id?: string;
      display_name?: string;
    };
    institutions?: Array<{
      id?: string;
      display_name?: string;
    }>;
  }>;
  primary_location?: {
    landing_page_url?: string;
    pdf_url?: string;
    source?: {
      display_name?: string;
      host_organization_name?: string;
      type?: string;
    };
  };
  concepts?: Array<{
    display_name?: string;
  }>;
  topics?: Array<{
    display_name?: string;
  }>;
  keywords?: Array<{
    display_name?: string;
  }>;
};

type OpenAlexAuthorRaw = {
  id?: string;
  display_name?: string;
  orcid?: string;
  works_count?: number;
  cited_by_count?: number;
  summary_stats?: {
    h_index?: number;
  };
  last_known_institution?: {
    display_name?: string;
  };
};

type OpenAlexInstitutionRaw = {
  id?: string;
  display_name?: string;
  country_code?: string;
  ror?: string;
  type?: string;
  works_count?: number;
  cited_by_count?: number;
  homepage_url?: string;
};

type OpenAlexTopicRaw = {
  id?: string;
  display_name?: string;
  description?: string;
  works_count?: number;
  cited_by_count?: number;
  field?: {
    display_name?: string;
  };
  subfield?: {
    display_name?: string;
  };
  domain?: {
    display_name?: string;
  };
};

export class OpenAlexError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OpenAlexError";
  }
}

function logOpenAlexEvent(event: string, details: Record<string, unknown> = {}) {
  console.info({
    scope: "cosmos-openalex-service",
    event,
    ...details,
  });
}

function pruneOpenAlexCache() {
  const now = Date.now();

  for (const [key, entry] of openAlexCache) {
    if (entry.expiresAt <= now) openAlexCache.delete(key);
  }

  while (openAlexCache.size > OPENALEX_CACHE_MAX_ENTRIES) {
    const firstKey = openAlexCache.keys().next().value;
    if (!firstKey) break;
    openAlexCache.delete(firstKey);
  }
}

function cacheKey(path: string, params: URLSearchParams) {
  const safeParams = new URLSearchParams(params);
  safeParams.delete("api_key");
  return `${path}?${safeParams.toString()}`;
}

function normalizeLimit(value?: number) {
  if (!value || !Number.isFinite(value)) return 8;
  return Math.min(25, Math.max(1, Math.floor(value)));
}

function normalizePage(value?: number) {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.min(100, Math.max(1, Math.floor(value)));
}

function normalizeYear(value?: number) {
  if (!value || !Number.isFinite(value)) return undefined;
  const year = Math.floor(value);
  return year >= 1800 && year <= new Date().getFullYear() + 1 ? year : undefined;
}

function shouldRetry(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function waitForRetry(attempt: number) {
  await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
}

async function fetchOpenAlex<T>(path: string, params: URLSearchParams): Promise<T> {
  pruneOpenAlexCache();

  if (env.openAlexApiKey) params.set("api_key", env.openAlexApiKey);
  if (env.openAlexEmail) params.set("mailto", env.openAlexEmail);

  const key = cacheKey(path, params);
  const cached = openAlexCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = `${OPENALEX_BASE_URL}${path}?${params.toString()}`;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= OPENALEX_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENALEX_TIMEOUT_MS);

    try {
      logOpenAlexEvent("openalex_request_start", {
        endpoint: path,
        attempt: attempt + 1,
      });

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      logOpenAlexEvent("openalex_response_status", {
        endpoint: path,
        status: response.status,
        ok: response.ok,
        attempt: attempt + 1,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        if (attempt < OPENALEX_MAX_RETRIES && shouldRetry(response.status)) {
          await waitForRetry(attempt);
          continue;
        }

        throw new OpenAlexError(
          `OpenAlex request failed with ${response.status}: ${message.slice(0, 220) || response.statusText}`,
          response.status,
        );
      }

      const declaredLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > 5_000_000) {
        throw new OpenAlexError("OpenAlex response exceeded the safety limit.", 502);
      }
      const responseText = await response.text();
      if (responseText.length > 5_000_000) {
        throw new OpenAlexError("OpenAlex response exceeded the safety limit.", 502);
      }
      const value = JSON.parse(responseText) as T;
      openAlexCache.set(key, {
        value,
        expiresAt: Date.now() + OPENALEX_CACHE_TTL_MS,
      });
      pruneOpenAlexCache();
      return value;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown OpenAlex request error.");

      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new OpenAlexError("OpenAlex request timed out.", 504);
      }

      if (attempt < OPENALEX_MAX_RETRIES) {
        await waitForRetry(attempt);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new OpenAlexError("OpenAlex request failed.", 502);
}

function createListParams(options: OpenAlexSearchOptions) {
  const params = new URLSearchParams();
  const query = options.query.trim();
  if (query) {
    params.set(
      options.searchMode === "exact"
        ? "search.exact"
        : options.searchMode === "semantic"
          ? "search.semantic"
          : "search",
      query,
    );
  }
  params.set("per-page", String(normalizeLimit(options.limit)));
  params.set("page", String(normalizePage(options.page)));

  if (options.sort) params.set("sort", options.sort);

  const fromYear = normalizeYear(options.fromYear);
  const toYear = normalizeYear(options.toYear);
  const filters = [
    options.filter?.trim(),
    fromYear || toYear
      ? `publication_year:${fromYear ?? 1800}-${toYear ?? new Date().getFullYear() + 1}`
      : undefined,
  ].filter((value): value is string => Boolean(value));
  if (filters.length > 0) params.set("filter", filters.join(","));

  return params;
}

function normalizeMeta<T>(response: OpenAlexListResponse<T>): OpenAlexMeta {
  return {
    count: response.meta?.count ?? 0,
    page: response.meta?.page ?? 1,
    perPage: response.meta?.per_page ?? 0,
  };
}

function compactList(values: Array<string | undefined>, limit = 6) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, limit);
}

function reconstructAbstract(index?: Record<string, number[]>) {
  if (!index) return undefined;

  const words: Array<[string, number]> = [];
  for (const [word, positions] of Object.entries(index)) {
    positions.forEach((position) => words.push([word, position]));
  }

  return words
    .sort((left, right) => left[1] - right[1])
    .map(([word]) => word)
    .join(" ")
    .slice(0, 1_400);
}

function shortId(openAlexId?: string, prefix = "") {
  const id = openAlexId?.split("/").pop() ?? "";
  return id || `${prefix}${Math.random().toString(36).slice(2)}`;
}

function openAlexUrl(openAlexId?: string, fallbackPath = "") {
  if (openAlexId?.startsWith("https://openalex.org/")) return openAlexId;
  return `https://openalex.org/${fallbackPath}`;
}

function createCitationAuthors(authors: string[]) {
  if (authors.length === 0) return "Unknown author";
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}

function stripDoiPrefix(doi?: string) {
  return doi?.replace(/^https?:\/\/doi\.org\//i, "").replace(/^doi:/i, "");
}

function createCitations({
  title,
  authors,
  year,
  journal,
  doi,
}: {
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  doi?: string;
}) {
  const authorText = createCitationAuthors(authors);
  const yearText = year ? String(year) : "n.d.";
  const doiText = stripDoiPrefix(doi);
  const doiSuffix = doiText ? ` https://doi.org/${doiText}` : "";
  const journalText = journal ? ` ${journal}.` : "";

  return {
    apa: `${authorText}. (${yearText}). ${title}.${journalText}${doiSuffix}`.trim(),
    mla: `${authorText}. "${title}."${journalText} ${yearText}.${doiSuffix}`.trim(),
    chicago: `${authorText}. "${title}."${journalText} ${yearText}.${doiSuffix}`.trim(),
  };
}

function normalizePaper(work: OpenAlexWorkRaw): OpenAlexPaper {
  const authors = compactList(work.authorships?.map((authorship) => authorship.author?.display_name) ?? [], 8);
  const institutions = compactList(
    work.authorships?.flatMap((authorship) => authorship.institutions?.map((institution) => institution.display_name) ?? []) ?? [],
    5,
  );
  const journal = work.primary_location?.source?.display_name ?? work.primary_location?.source?.host_organization_name;
  const concepts = compactList(
    [
      ...(work.concepts?.map((concept) => concept.display_name) ?? []),
      ...(work.keywords?.map((keyword) => keyword.display_name) ?? []),
    ],
    8,
  );
  const topics = compactList(work.topics?.map((topic) => topic.display_name) ?? [], 6);
  const keywords = compactList(work.keywords?.map((keyword) => keyword.display_name) ?? [], 10);
  const title = work.title ?? work.display_name ?? "Untitled research work";
  const citations = createCitations({
    title,
    authors,
    year: work.publication_year,
    journal,
    doi: work.doi,
  });

  return {
    id: shortId(work.id, "W"),
    openAlexId: work.id ?? "",
    title,
    authors,
    institutions,
    publicationYear: work.publication_year,
    publicationDate: work.publication_date,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    citationCount: work.cited_by_count ?? 0,
    doi: stripDoiPrefix(work.doi),
    openAlexUrl: openAlexUrl(work.id, shortId(work.id, "W")),
    primaryUrl: work.primary_location?.landing_page_url,
    journal,
    sourceJournal: journal,
    type: work.type,
    venueType: work.primary_location?.source?.type,
    concepts,
    topics,
    keywords,
    isRetracted: Boolean(work.is_retracted),
    apaCitation: citations.apa,
    mlaCitation: citations.mla,
    chicagoCitation: citations.chicago,
  };
}

function normalizeAuthor(author: OpenAlexAuthorRaw): OpenAlexAuthor {
  return {
    id: shortId(author.id, "A"),
    openAlexId: author.id ?? "",
    displayName: author.display_name ?? "Unknown author",
    orcid: author.orcid,
    worksCount: author.works_count ?? 0,
    citationCount: author.cited_by_count ?? 0,
    hIndex: author.summary_stats?.h_index,
    lastKnownInstitution: author.last_known_institution?.display_name,
    openAlexUrl: openAlexUrl(author.id, shortId(author.id, "A")),
  };
}

function normalizeInstitution(institution: OpenAlexInstitutionRaw): OpenAlexInstitution {
  return {
    id: shortId(institution.id, "I"),
    openAlexId: institution.id ?? "",
    displayName: institution.display_name ?? "Unknown institution",
    countryCode: institution.country_code,
    ror: institution.ror,
    type: institution.type,
    worksCount: institution.works_count ?? 0,
    citationCount: institution.cited_by_count ?? 0,
    homepageUrl: institution.homepage_url,
    openAlexUrl: openAlexUrl(institution.id, shortId(institution.id, "I")),
  };
}

function normalizeTopic(topic: OpenAlexTopicRaw): OpenAlexTopic {
  return {
    id: shortId(topic.id, "T"),
    openAlexId: topic.id ?? "",
    displayName: topic.display_name ?? "Unknown topic",
    description: topic.description,
    field: topic.field?.display_name,
    subfield: topic.subfield?.display_name,
    domain: topic.domain?.display_name,
    worksCount: topic.works_count ?? 0,
    citationCount: topic.cited_by_count ?? 0,
    openAlexUrl: openAlexUrl(topic.id, shortId(topic.id, "T")),
  };
}

function singletonParams() {
  return new URLSearchParams();
}

export async function searchOpenAlexPapers(options: OpenAlexSearchOptions): Promise<OpenAlexPaperSearchResult> {
  const response = await fetchOpenAlex<OpenAlexListResponse<OpenAlexWorkRaw>>("/works", createListParams(options));
  return {
    meta: normalizeMeta(response),
    results: (response.results ?? []).map(normalizePaper),
  };
}

export async function searchOpenAlexAuthors(options: OpenAlexSearchOptions): Promise<OpenAlexAuthorSearchResult> {
  const response = await fetchOpenAlex<OpenAlexListResponse<OpenAlexAuthorRaw>>("/authors", createListParams(options));
  return {
    meta: normalizeMeta(response),
    results: (response.results ?? []).map(normalizeAuthor),
  };
}

export async function searchOpenAlexInstitutions(options: OpenAlexSearchOptions): Promise<OpenAlexInstitutionSearchResult> {
  const response = await fetchOpenAlex<OpenAlexListResponse<OpenAlexInstitutionRaw>>("/institutions", createListParams(options));
  return {
    meta: normalizeMeta(response),
    results: (response.results ?? []).map(normalizeInstitution),
  };
}

export async function searchOpenAlexTopics(options: OpenAlexSearchOptions): Promise<OpenAlexTopicSearchResult> {
  const response = await fetchOpenAlex<OpenAlexListResponse<OpenAlexTopicRaw>>("/topics", createListParams(options));
  return {
    meta: normalizeMeta(response),
    results: (response.results ?? []).map(normalizeTopic),
  };
}

export async function searchOpenAlex(options: OpenAlexSearchOptions & { type?: OpenAlexSearchType }): Promise<OpenAlexUnifiedSearchResult> {
  const type = options.type ?? "papers";

  if (type === "papers") return { papers: await searchOpenAlexPapers(options) };
  if (type === "authors") return { authors: await searchOpenAlexAuthors(options) };
  if (type === "institutions") return { institutions: await searchOpenAlexInstitutions(options) };
  if (type === "topics") return { topics: await searchOpenAlexTopics(options) };

  const [papers, authors, institutions, topics] = await Promise.all([
    searchOpenAlexPapers({ ...options, limit: Math.min(normalizeLimit(options.limit), 6) }),
    searchOpenAlexAuthors({ ...options, limit: 4 }),
    searchOpenAlexInstitutions({ ...options, limit: 4 }),
    searchOpenAlexTopics({ ...options, limit: 4 }),
  ]);

  return { papers, authors, institutions, topics };
}

function normalizeSingletonId(id: string) {
  return encodeURIComponent(id.trim());
}

export async function getOpenAlexPaper(id: string): Promise<OpenAlexPaper> {
  return normalizePaper(await fetchOpenAlex<OpenAlexWorkRaw>(`/works/${normalizeSingletonId(id)}`, singletonParams()));
}

export async function getOpenAlexPaperByDoi(doi: string): Promise<OpenAlexPaper> {
  const normalizedDoi = stripDoiPrefix(doi)?.trim();
  if (!normalizedDoi || !/^10\.\d{4,9}\//i.test(normalizedDoi)) {
    throw new OpenAlexError("A valid DOI is required.", 400);
  }
  return getOpenAlexPaper(`doi:${normalizedDoi}`);
}

export async function getOpenAlexAuthor(id: string): Promise<OpenAlexAuthor> {
  return normalizeAuthor(await fetchOpenAlex<OpenAlexAuthorRaw>(`/authors/${normalizeSingletonId(id)}`, singletonParams()));
}

export async function getOpenAlexTopic(id: string): Promise<OpenAlexTopic> {
  return normalizeTopic(await fetchOpenAlex<OpenAlexTopicRaw>(`/topics/${normalizeSingletonId(id)}`, singletonParams()));
}

export function isResearchPrompt(prompt: string, mode?: string) {
  if (mode === "research") return true;

  const normalized = prompt.toLowerCase();
  const triggers = [
    "research",
    "paper",
    "papers",
    "journal",
    "study",
    "studies",
    "citation",
    "citations",
    "author",
    "authors",
    "latest",
    "publication",
    "publications",
    "quantum",
    "black hole",
    "black holes",
    "astronomy research",
    "physics paper",
    "scientific",
    "latest research",
    "new discovery",
    "review article",
  ];

  return triggers.some((trigger) => normalized.includes(trigger));
}
