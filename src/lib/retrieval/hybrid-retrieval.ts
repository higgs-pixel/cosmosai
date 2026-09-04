import type { SourceCandidate } from "./relevance-score.ts";
import {
  retrieveFromScholarlyIndex,
  type IndexedScholarlyMatch,
  type ScholarlyPaperStore,
  type ScholarlyRetrievalPath,
} from "./scholarly-index.ts";
import { normalizeScholarlyLookupQuery } from "./scholarly-query-normalizer.ts";
import { createInMemoryScholarlyIndex } from "./scholarly-index.ts";

export type RetrievalStageStatus = "success" | "empty" | "failed" | "not-configured";
export type HybridRetrievalStatus = "found" | "not-found" | "incomplete" | "provider-failure";

export type HybridRetrievalDiagnostics = {
  paths: {
    exact: RetrievalStageStatus;
    lexical: RetrievalStageStatus;
    semantic: RetrievalStageStatus;
    provider: RetrievalStageStatus;
  };
  appliedFilters: {
    year?: number;
    journal?: string;
    author?: string;
  };
  retrievedPaperIds: string[];
  selectedContextIds: string[];
  citedPaperIds: string[];
  contextOmissions: string[];
  answerOmissions: string[];
  duplicateCount: number;
};

export type HybridRetrievalResult = {
  sources?: IndexedScholarlyMatch[];
  status: HybridRetrievalStatus;
  diagnostics?: HybridRetrievalDiagnostics;
};

type HybridDependencies = {
  store: ScholarlyPaperStore;
  semanticCandidates?: SourceCandidate[];
  providerCandidates?: SourceCandidate[];
  semanticStatus?: RetrievalStageStatus;
  providerStatus?: RetrievalStageStatus;
  contextPaperIds?: string[];
  citedPaperIds?: string[];
  limit?: number;
};

function mergeMatches(groups: IndexedScholarlyMatch[][], limit: number) {
  const merged = new Map<string, IndexedScholarlyMatch>();
  for (const group of groups) {
    for (const match of group) {
      const key = match.paper.doi?.toLowerCase() ?? match.paper.arxivId?.toLowerCase() ?? match.paper.id;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...match, paths: [...match.paths] });
        continue;
      }
      existing.score = Math.max(existing.score, match.score);
      existing.paths = Array.from(new Set([...existing.paths, ...match.paths]));
      existing.matchedTerms = Array.from(new Set([...existing.matchedTerms, ...match.matchedTerms]));
    }
  }
  return [...merged.values()]
    .sort((left, right) => right.score - left.score || (right.paper.citationCount ?? 0) - (left.paper.citationCount ?? 0))
    .slice(0, limit);
}

function withPath(matches: IndexedScholarlyMatch[], path: ScholarlyRetrievalPath) {
  return matches.map((match) => ({ ...match, paths: Array.from(new Set([...match.paths, path])) }));
}

export function classifyRetrievalOutcome(input: {
  selectedCount: number;
  exactStatus: RetrievalStageStatus;
  lexicalStatus: RetrievalStageStatus;
  semanticStatus: RetrievalStageStatus;
  providerStatus: RetrievalStageStatus;
}): HybridRetrievalStatus {
  if (input.selectedCount > 0) return "found";
  const configured = [input.exactStatus, input.lexicalStatus, input.semanticStatus, input.providerStatus]
    .filter((status) => status !== "not-configured");
  if (configured.length > 0 && configured.every((status) => status === "failed")) return "provider-failure";
  if (configured.some((status) => status === "failed")) return "incomplete";
  return "not-found";
}

export async function retrieveHybridScholarlySources(
  query: string,
  dependencies: HybridDependencies,
): Promise<Required<HybridRetrievalResult>> {
  const intent = normalizeScholarlyLookupQuery(query);
  const limit = Math.min(20, Math.max(1, dependencies.limit ?? 8));
  const local = await retrieveFromScholarlyIndex(intent, dependencies.store, { limit });
  const semanticStore = createInMemoryScholarlyIndex(dependencies.semanticCandidates ?? []);
  const providerStore = createInMemoryScholarlyIndex(dependencies.providerCandidates ?? []);
  const semantic = dependencies.semanticCandidates
    ? await retrieveFromScholarlyIndex(intent, semanticStore, { limit })
    : { sources: [], diagnostics: { duplicateCount: 0 } };
  const provider = dependencies.providerCandidates
    ? await retrieveFromScholarlyIndex(intent, providerStore, { limit })
    : { sources: [], diagnostics: { duplicateCount: 0 } };

  const localExact = local.sources.filter((source) =>
    source.paths.some((path) => path === "doi" || path === "id" || path === "exact-title" || path === "partial-title" || path === "author")
  );
  const localLexical = local.sources.filter((source) => source.paths.includes("lexical"));
  const sources = mergeMatches([
    localExact,
    localLexical,
    withPath(semantic.sources, "semantic"),
    withPath(provider.sources, "provider"),
  ], limit);
  const exactStatus: RetrievalStageStatus = localExact.length > 0 ? "success" : "empty";
  const lexicalStatus: RetrievalStageStatus = localLexical.length > 0 ? "success" : "empty";
  const semanticStatus = dependencies.semanticStatus ?? (dependencies.semanticCandidates ? (semantic.sources.length ? "success" : "empty") : "not-configured");
  const providerStatus = dependencies.providerStatus ?? (dependencies.providerCandidates ? (provider.sources.length ? "success" : "empty") : "not-configured");
  const status = classifyRetrievalOutcome({
    selectedCount: sources.length,
    exactStatus,
    lexicalStatus,
    semanticStatus,
    providerStatus,
  });
  const retrievedPaperIds = sources.map((source) => source.paper.id);
  const selectedContextIds = dependencies.contextPaperIds ?? retrievedPaperIds;
  const citedPaperIds = dependencies.citedPaperIds ?? selectedContextIds;

  return {
    sources,
    status,
    diagnostics: {
      paths: {
        exact: exactStatus,
        lexical: lexicalStatus,
        semantic: semanticStatus,
        provider: providerStatus,
      },
      appliedFilters: local.diagnostics.appliedFilters,
      retrievedPaperIds,
      selectedContextIds,
      citedPaperIds,
      contextOmissions: retrievedPaperIds.filter((id) => !selectedContextIds.includes(id)),
      answerOmissions: selectedContextIds.filter((id) => !citedPaperIds.includes(id)),
      duplicateCount: local.diagnostics.duplicateCount + semantic.diagnostics.duplicateCount + provider.diagnostics.duplicateCount,
    },
  };
}

export function createSafeRetrievalMessage(result: Pick<HybridRetrievalResult, "status">) {
  if (result.status === "found") return "Relevant scholarly records were found and attached to this answer.";
  if (result.status === "not-found") return "No qualifying stored or provider record was found after the available research searches completed.";
  return "I could not complete the research search reliably. Please try again while the search index is being checked.";
}
