import "server-only";

import { createHash } from "node:crypto";
import { searchArxivPapers } from "@/lib/data-sources/arxiv";
import { searchCorePapers } from "@/lib/data-sources/core";
import {
  lookupOpenAlexResearchByDoi,
  searchOpenAlexResearch,
  searchOpenAlexResearchByAuthor,
  searchOpenAlexResearchExactTitle,
} from "@/lib/data-sources/openalex";
import type { ResearchItem } from "@/lib/data-sources/shared";
import { expandRetrievalQuery } from "@/lib/retrieval/query-expansion";
import { getVerifiedResearchCatalogue } from "@/lib/retrieval/foundational-literature";
import { retrieveHybridScholarlySources, type HybridRetrievalStatus } from "@/lib/retrieval/hybrid-retrieval";
import { createInMemoryScholarlyIndex, type ScholarlyPaperStore } from "@/lib/retrieval/scholarly-index";
import { normalizeScholarlyLookupQuery } from "@/lib/retrieval/scholarly-query-normalizer";
import { parseResearchRequest } from "@/lib/retrieval/research-request";
import {
  runScholarlyProviders,
  type ProviderRunStatus,
  type ScholarlyProviderAdapters,
} from "@/lib/retrieval/scholarly-provider-runner";
import {
  deduplicateScholarlyPapers,
  normalizeScholarlyPaper,
  type ProviderPaperRecord,
  type ScholarlyPaper,
} from "@/lib/retrieval/scholarly-paper";
import {
  createScholarlyQueryPlan,
  selectPrimaryQueryVariants,
  type ScholarlyProvider,
} from "@/lib/retrieval/scholarly-query-plan";
import {
  rankSources,
  selectScholarlySourceSet,
  type RankedSource,
  type SourceCandidate,
  type SourceRejection,
} from "@/lib/retrieval/relevance-score";

export type RankedResearchResult = {
  queryProfile: ReturnType<typeof expandRetrievalQuery>;
  providerQueries: Record<ScholarlyProvider, string>;
  providerStatuses: Record<ScholarlyProvider, ProviderRunStatus>;
  sources: RankedSource[];
  providers: string[];
  retrievedCount: number;
  normalizedCount: number;
  deduplicatedCount: number;
  duplicateCount: number;
  filteredCount: number;
  rejections: SourceRejection[];
  qualityPassed: boolean;
  qualityIssues: string[];
  allProvidersFailed: boolean;
  retrievalStatus: HybridRetrievalStatus;
  localMatchCount: number;
  latencyMs: number;
  cacheStatus: "hit" | "miss";
};

type CacheEntry = {
  expiresAt: number;
  value: Omit<RankedResearchResult, "cacheStatus">;
};

const researchCache = new Map<string, CacheEntry>();
const RESEARCH_CACHE_MAX_ENTRIES = 80;
const verifiedCatalogueStore = createInMemoryScholarlyIndex(getVerifiedResearchCatalogue());

function cacheTtl(mode?: string) {
  if (mode === "recent" || mode === "latest-developments") return 10 * 60 * 1_000;
  if (mode === "foundational" || mode === "landmark" || mode === "review" || mode === "systematic-review") return 6 * 60 * 60 * 1_000;
  return 30 * 60 * 1_000;
}

function cacheKey(profile: ReturnType<typeof expandRetrievalQuery>, limit: number, direct: boolean) {
  const request = profile.researchRequest;
  return JSON.stringify({
    version: 3,
    topic: request?.topic.toLowerCase() ?? profile.originalQuery.toLowerCase(),
    mode: request?.mode,
    startYear: request?.startYear,
    endYear: request?.endYear,
    paperTypes: request?.paperTypes,
    peerReviewedOnly: request?.peerReviewedOnly,
    preprintsAllowed: request?.preprintsAllowed,
    limit,
    direct,
  });
}

function pruneCache(now = Date.now()) {
  for (const [key, entry] of researchCache) {
    if (entry.expiresAt <= now) researchCache.delete(key);
  }
  while (researchCache.size > RESEARCH_CACHE_MAX_ENTRIES) {
    const first = researchCache.keys().next().value;
    if (!first) break;
    researchCache.delete(first);
  }
}

function toProviderRecord(item: ResearchItem) {
  return {
    ...item,
    abstract: item.summary,
    publicationDate: item.publishedAt,
    journal: item.source,
  };
}

function toCandidate(paper: ScholarlyPaper): SourceCandidate {
  return {
    id: paper.canonicalId,
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors.map((author) => author.name),
    year: paper.year,
    provider: paper.sourceProviders.includes("OpenAlex") ? "OpenAlex" : paper.sourceProviders[0] ?? "Scholarly source",
    source: paper.journal,
    url: paper.urls.publisher ?? paper.urls.canonical ?? paper.urls.preprint,
    doi: paper.doi,
    arxivId: paper.arxivId,
    openAlexId: paper.openAlexId,
    adsBibcode: paper.adsBibcode,
    citationCount: paper.citationCount,
    influentialCitationCount: paper.influentialCitationCount,
    publishedAt: paper.publicationDate,
    concepts: paper.concepts,
    keywords: paper.keywords,
    fieldsOfStudy: paper.fieldsOfStudy,
    paperType: paper.paperType,
    isRetracted: paper.isRetracted,
    isPreprint: paper.isPreprint,
    isPeerReviewed: paper.isPeerReviewed,
    sourceProviders: paper.sourceProviders,
    rawProviderIds: paper.rawProviderIds,
  };
}

async function successfulVariants(
  variants: string[],
  fetcher: (query: string) => Promise<ResearchItem[]>,
) {
  const settled = await Promise.allSettled(variants.map(fetcher));
  const fulfilled = settled.filter((result): result is PromiseFulfilledResult<ResearchItem[]> => result.status === "fulfilled");
  if (fulfilled.length === 0) throw new Error("Provider variants failed.");
  return fulfilled.flatMap((result) => result.value).map(toProviderRecord);
}

async function openAlexRecords(
  profile: ReturnType<typeof expandRetrievalQuery>,
  variants: string[],
  perVariantLimit: number,
  sort: string | undefined,
) {
  const request = profile.researchRequest!;
  const intent = normalizeScholarlyLookupQuery(profile.originalQuery);
  const operations: Array<Promise<ProviderPaperRecord[]>> = [
    successfulVariants(variants, (query) => searchOpenAlexResearch(query, perVariantLimit, {
      fromYear: request.startYear,
      toYear: request.endYear,
      sort,
    })),
  ];
  if (intent.doi) operations.push(lookupOpenAlexResearchByDoi(intent.doi).then((items) => items.map(toProviderRecord)));
  if (intent.authorNames[0]) {
    operations.push(searchOpenAlexResearchByAuthor(intent.authorNames[0], 10, {
      fromYear: request.startYear,
      toYear: request.endYear,
    }).then((items) => items.map(toProviderRecord)));
  }
  const likelyTitle = intent.exactTitle ?? (
    intent.partialTitle && intent.partialTitle.split(/\s+/).length >= 3
      ? intent.partialTitle
      : undefined
  );
  if (likelyTitle && !intent.doi) {
    operations.push(searchOpenAlexResearchExactTitle(likelyTitle, 6, {
      fromYear: request.startYear,
      toYear: request.endYear,
    }).then((items) => items.map(toProviderRecord)));
  }

  const settled = await Promise.allSettled(operations);
  const fulfilled = settled.filter((result): result is PromiseFulfilledResult<ProviderPaperRecord[]> => result.status === "fulfilled");
  if (fulfilled.length === 0) throw new Error("OpenAlex retrieval paths failed.");
  return fulfilled.flatMap((result) => result.value);
}

async function arxivRecords(
  profile: ReturnType<typeof expandRetrievalQuery>,
  variants: string[],
  perVariantLimit: number,
  sortBy: "submittedDate" | "relevance",
  revalidate: number,
) {
  const intent = normalizeScholarlyLookupQuery(profile.originalQuery);
  const operations: Array<Promise<ProviderPaperRecord[]>> = [
    successfulVariants(
      variants,
      (query) => searchArxivPapers(query, perVariantLimit, { sortBy, revalidate }),
    ),
  ];
  if (intent.authorNames[0]) {
    operations.push(
      searchArxivPapers(intent.authorNames[0], 10, {
        sortBy: "relevance",
        revalidate,
        searchField: "author",
      }).then((items) => items.map(toProviderRecord)),
    );
  }
  const likelyTitle = intent.exactTitle ?? (
    intent.partialTitle && intent.partialTitle.split(/\s+/).length >= 3
      ? intent.partialTitle
      : undefined
  );
  if (likelyTitle && !intent.doi) {
    operations.push(
      searchArxivPapers(likelyTitle, 6, {
        sortBy: "relevance",
        revalidate,
        searchField: "title",
      }).then((items) => items.map(toProviderRecord)),
    );
  }
  const settled = await Promise.allSettled(operations);
  const fulfilled = settled.filter((result): result is PromiseFulfilledResult<ProviderPaperRecord[]> => result.status === "fulfilled");
  if (fulfilled.length === 0) throw new Error("arXiv retrieval paths failed.");
  return fulfilled.flatMap((result) => result.value);
}

function providerAdapters(profile: ReturnType<typeof expandRetrievalQuery>): ScholarlyProviderAdapters {
  const request = profile.researchRequest!;
  const plan = createScholarlyQueryPlan(request);
  const variants = selectPrimaryQueryVariants(plan).map((variant) => variant.query).slice(0, 6);
  const perVariantLimit = Math.max(3, Math.ceil(plan.candidateLimitPerProvider / variants.length));
  const openAlexSort = request.sortPreference === "citation-impact"
    ? "cited_by_count:desc"
    : request.sortPreference === "newest" || request.mode === "recent"
      ? "publication_date:desc"
      : undefined;
  const arxivSort = request.mode === "foundational" || request.mode === "landmark" || request.mode === "review" ? "relevance" as const : "submittedDate" as const;
  const revalidate = request.mode === "recent" || request.mode === "latest-developments" ? 900 : 21_600;

  return {
    OpenAlex: async () => openAlexRecords(profile, variants, perVariantLimit, openAlexSort),
    arXiv: async () => arxivRecords(profile, variants, perVariantLimit, arxivSort, revalidate),
    CORE: async () => successfulVariants(variants.slice(0, 1), (query) => searchCorePapers(query, plan.candidateLimitPerProvider)),
  };
}

function logRetrieval(event: string, details: Record<string, unknown>) {
  console.info(JSON.stringify({ scope: "scholarly-retrieval", event, ...details }));
}

function queryHash(value: string) {
  return createHash("sha256").update(value.normalize("NFKC").toLowerCase()).digest("hex").slice(0, 16);
}

export async function retrieveRankedResearchSources(
  query: string,
  limit = 8,
  options: {
    requiresDirectSources?: boolean;
    localStore?: ScholarlyPaperStore;
    providerAdapters?: ScholarlyProviderAdapters;
  } = {},
): Promise<RankedResearchResult> {
  const startedAt = performance.now();
  const expandedProfile = expandRetrievalQuery(query);
  const forcedRequest = expandedProfile.researchRequest ?? parseResearchRequest(query);
  const forcedPlan = createScholarlyQueryPlan(forcedRequest);
  const queryProfile: ReturnType<typeof expandRetrievalQuery> = expandedProfile.researchRequest
    ? expandedProfile
    : {
        ...expandedProfile,
        topicType: "research",
        researchRequest: forcedRequest,
        providerPriority: forcedPlan.providers,
        expandedQueries: forcedPlan.variants.slice(1).map((variant) => variant.query),
      };
  const request = queryProfile.researchRequest!;
  const plan = createScholarlyQueryPlan(request);
  const selectedQueries = selectPrimaryQueryVariants(plan).map((variant) => variant.query).slice(0, 6);
  const boundedLimit = Math.min(Math.max(limit || request.resultCount, 1), 10);
  const requiresDirectSources = options.requiresDirectSources ?? true;
  const key = cacheKey(queryProfile, boundedLimit, requiresDirectSources);
  pruneCache();
  const cached = researchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.value, cacheStatus: "hit" };

  logRetrieval("plan_created", {
    queryHash: queryHash(query),
    mode: request.mode,
    topic: process.env.NODE_ENV === "development" ? request.topic : undefined,
    topicLength: request.topic.length,
    startYear: request.startYear,
    endYear: request.endYear,
    variantCount: plan.variants.length,
    variants: process.env.NODE_ENV === "development" ? plan.variants.map((variant) => variant.query) : undefined,
    providers: plan.providers,
  });

  const providerResult = await runScholarlyProviders(
    plan,
    options.providerAdapters ?? providerAdapters(queryProfile),
    9_500,
  );
  const normalized = providerResult.records
    .map((record) => normalizeScholarlyPaper(record))
    .filter((paper): paper is ScholarlyPaper => Boolean(paper));
  const deduplicated = deduplicateScholarlyPapers(normalized);
  const providerCandidates = deduplicated.papers.map(toCandidate);
  const hybrid = await retrieveHybridScholarlySources(query, {
    store: options.localStore ?? verifiedCatalogueStore,
    providerCandidates,
    providerStatus: providerResult.allProvidersFailed
      ? "failed"
      : providerResult.records.length > 0
        ? "success"
        : "empty",
    limit: Math.max(boundedLimit * 2, 10),
  });
  const hybridCandidates = hybrid.sources.map((match) => ({
    ...match.paper,
    retrievalPaths: match.paths,
    structuredMatchScore: match.score,
  }));
  const ranked = rankSources(queryProfile, hybridCandidates);
  const sourceSet = selectScholarlySourceSet(queryProfile, ranked, {
    limit: boundedLimit,
    requiresDirectSources,
  });
  const qualityIssues = Array.from(new Set([
    ...sourceSet.qualityIssues,
    providerResult.allProvidersFailed && sourceSet.sources.length === 0 ? "all_scholarly_providers_failed" : undefined,
    hybrid.status === "incomplete" || hybrid.status === "provider-failure" ? "retrieval_incomplete" : undefined,
    normalized.length < providerResult.records.length ? "malformed_or_unverifiable_metadata_rejected" : undefined,
  ].filter((value): value is string => Boolean(value))));
  const providerQueries = {
    OpenAlex: selectedQueries.join(" | "),
    arXiv: selectedQueries.join(" | "),
    CORE: plan.variants[0]?.query ?? request.topic,
  };
  const value: Omit<RankedResearchResult, "cacheStatus"> = {
    queryProfile,
    providerQueries,
    providerStatuses: providerResult.statuses,
    sources: sourceSet.sources,
    providers: Array.from(new Set([
      ...(Object.entries(providerResult.statuses) as Array<[ScholarlyProvider, ProviderRunStatus]>)
      .filter(([, status]) => status.status === "success")
      .map(([provider]) => provider),
      ...sourceSet.sources.flatMap((source) => source.sourceProviders ?? [source.provider]),
    ])),
    retrievedCount: providerResult.records.length + hybrid.diagnostics.retrievedPaperIds
      .filter((id) => !providerCandidates.some((paper) => paper.id === id)).length,
    normalizedCount: normalized.length,
    deduplicatedCount: hybrid.sources.length,
    duplicateCount: deduplicated.duplicateCount + hybrid.diagnostics.duplicateCount,
    filteredCount: Math.max(0, providerResult.records.length + hybrid.diagnostics.retrievedPaperIds.length - sourceSet.sources.length),
    rejections: [
      ...sourceSet.rejections,
      ...Object.entries(hybrid.diagnostics.paths)
        .filter(([, status]) => status === "failed")
        .map(([path]) => ({ id: `retrieval:${path}`, title: `${path} retrieval`, reasons: ["retrieval_path_failed"] })),
    ],
    qualityPassed: qualityIssues.length === 0,
    qualityIssues,
    allProvidersFailed: providerResult.allProvidersFailed && sourceSet.sources.length === 0,
    retrievalStatus: sourceSet.sources.length > 0 ? "found" : hybrid.status,
    localMatchCount: hybrid.sources.filter((source) => !source.paths.includes("provider")).length,
    latencyMs: Math.round(performance.now() - startedAt),
  };

  researchCache.set(key, { expiresAt: Date.now() + cacheTtl(request.mode), value });
  pruneCache();
  logRetrieval("quality_gate_complete", {
    queryHash: queryHash(query),
    mode: request.mode,
    providerStatuses: providerResult.statuses,
    candidateCount: providerResult.records.length,
    normalizedCount: normalized.length,
    duplicateCount: deduplicated.duplicateCount,
    rejectedCount: sourceSet.rejections.length,
    rejectionReasons: Array.from(new Set(sourceSet.rejections.flatMap((item) => item.reasons))),
    topScores: ranked.slice(0, 10).map((source) => ({
      id: source.id,
      title: process.env.NODE_ENV === "development" ? source.title : undefined,
      score: source.score,
      matchLevel: source.matchLevel,
      titleCoverage: source.relevanceFeatures.requiredConceptCoverageInTitle,
      abstractCoverage: source.relevanceFeatures.requiredConceptCoverageInAbstract,
      topicCentrality: source.relevanceFeatures.topicCentrality,
      peripheralPenalty: source.relevanceFeatures.peripheralPenalty,
    })),
    selectedIds: sourceSet.sources.map((source) => source.id),
    contextSelectedIds: sourceSet.sources.map((source) => source.id),
    retrievalStatus: value.retrievalStatus,
    retrievalPaths: hybrid.diagnostics.paths,
    localMatchCount: value.localMatchCount,
    qualityPassed: value.qualityPassed,
    qualityIssues,
    latencyMs: value.latencyMs,
  });
  return { ...value, cacheStatus: "miss" };
}
