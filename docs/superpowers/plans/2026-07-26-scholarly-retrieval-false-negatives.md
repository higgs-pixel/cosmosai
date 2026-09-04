# Scholarly Retrieval False-Negative Remediation Plan

## Scope

Fix false-negative discovery of scholarly records without changing the chat UI,
authentication, monetisation, or source providers. The implementation must not
invent records or claim that a paper is absent when the retrieval pipeline did
not reliably search all eligible paths.

## Current Architecture Map

```text
Ask COSMOS
  src/components/assistant/cosmos-assistant.tsx
    -> POST src/app/api/ai/chat/route.ts
      -> classifyCosmosQuery()
         src/lib/ai/query-intent.ts
      -> buildOpenAlexContext()
      -> retrieveRankedResearchSources()
         src/lib/retrieval/research-retrieval.ts
        -> expandRetrievalQuery()
           src/lib/retrieval/query-expansion.ts
        -> parseResearchRequest()
           src/lib/retrieval/research-request.ts
        -> createScholarlyQueryPlan()
           src/lib/retrieval/scholarly-query-plan.ts
        -> runScholarlyProviders()
           src/lib/retrieval/scholarly-provider-runner.ts
          -> OpenAlex: src/lib/data-sources/openalex.ts
             -> src/lib/openalex.ts
          -> arXiv: src/lib/data-sources/arxiv.ts
          -> CORE: src/lib/data-sources/core.ts
        -> normalizeScholarlyPaper()
           src/lib/retrieval/scholarly-paper.ts
        -> deduplicateScholarlyPapers()
        -> rankSources()
           src/lib/retrieval/relevance-score.ts
        -> selectScholarlySourceSet()
      -> context assembly and source-card headers
      -> streamAiChatResponse()
         src/services/openai/chat.service.ts
      -> source cards
         src/components/assistant/research-source-card.tsx
```

### Persistence and indexing

- `supabase/schema.sql` currently contains profiles, preferences, saved
  discoveries, and mission-control layouts.
- No `research_papers`, paper chunks, embeddings, vector index, lexical index,
  ingestion job, or embedding-version table exists in this checkout.
- The production retrieval path is a cached live-provider aggregator over
  OpenAlex, arXiv, and optional CORE.
- `src/lib/retrieval/foundational-literature.ts` is a verified local catalogue
  for black-hole information-paradox literature, but the production retriever
  does not currently include it.
- The existing evaluation injects labelled candidates directly into the ranker,
  so its `8/8` result does not measure candidate-discovery recall.

## Confirmed Failure Mechanisms

1. Exact DOI, internal ID, title, and author queries have no deterministic
   retrieval path before provider text search.
2. The local verified foundational catalogue is omitted from production
   retrieval.
3. arXiv wraps the complete generated query in `all:"..."`, which is too strict
   for many natural-language and synonym queries.
4. OpenAlex uses only broad `search=` requests; its supported DOI singleton and
   author-byline paths are not used.
5. Most provider modes execute only an exact phrase and one alternate query.
6. Exact metadata matches are subjected to the same direct-relevance and
   semantic-style thresholds as topic candidates.
7. Inferred date and paper-type preferences can become hard eligibility filters.
8. A quality-gate empty set is rendered as “no directly verified papers found,”
   even when candidate discovery was incomplete.
9. Diagnostics do not distinguish candidate discovery, ranking, context
   inclusion, and final citation inclusion.

## Target Modules

### New focused modules

- `src/lib/retrieval/scholarly-query-normalizer.ts`
  - DOI, ID, title, author, journal, year, acronym, synonym, and typo-tolerant
    query normalization.
- `src/lib/retrieval/scholarly-index.ts`
  - dependency-injected store contract and deterministic in-process lexical
    index used by the verified local catalogue and tests.
- `src/lib/retrieval/hybrid-retrieval.ts`
  - exact, structured, lexical, provider, merge, scoring, and eligibility
    orchestration.
- `src/lib/retrieval/retrieval-diagnostics.ts`
  - safe stage diagnostics and hashed query observability.
- `src/lib/retrieval/research-integrity.ts`
  - reusable corpus integrity checks. It reports vector/chunk capabilities as
    absent rather than pretending they exist.
- `scripts/eval-research-retrieval.ts`
  - Recall@K, MRR, nDCG, false-negative rate, irrelevant-result rate, and
    query-variation stability.
- `scripts/check-research-integrity.ts`
  - deterministic integrity scan for the configured catalogue/store.
- `tests/fixtures/golden-research-corpus.ts`
  - controlled records across the requested domains.
- `tests/scholarly-hybrid-retrieval.test.ts`
  - the required false-negative regression matrix.

### Existing modules to change

- `src/lib/retrieval/research-retrieval.ts`
  - consume the hybrid orchestrator through dependency injection.
- `src/lib/retrieval/relevance-score.ts`
  - add explicit exact/structured signals and protect them from semantic
    thresholds.
- `src/lib/retrieval/research-request.ts`
  - preserve identifier, title, author, journal, and explicit-filter intent.
- `src/lib/retrieval/scholarly-query-plan.ts`
  - use normalized query variants without broadening precise lookups.
- `src/lib/data-sources/openalex.ts`
  - expose structured DOI and author lookup operations.
- `src/lib/openalex.ts`
  - support singleton DOI and field-specific author searches with bounded calls.
- `src/lib/data-sources/arxiv.ts`
  - use field-aware queries rather than requiring a whole natural-language
    sentence as one phrase.
- `src/app/api/ai/chat/route.ts`
  - keep thin; consume truthful retrieval status and safe user messaging.
- `package.json`
  - include deterministic retrieval evaluation and integrity scripts.

## Interfaces

```ts
type ScholarlyLookupIntent = {
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

interface ScholarlyPaperStore {
  exactLookup(intent: ScholarlyLookupIntent): Promise<StoredMatch[]>;
  lexicalLookup(intent: ScholarlyLookupIntent, limit: number): Promise<StoredMatch[]>;
  semanticLookup?(intent: ScholarlyLookupIntent, limit: number): Promise<StoredMatch[]>;
  integritySnapshot?(): Promise<ScholarlyIntegritySnapshot>;
}

type HybridCandidate = {
  paper: ScholarlyPaper;
  paths: Array<"doi" | "id" | "exact-title" | "partial-title" | "author" |
    "lexical" | "semantic" | "provider">;
  scores: {
    exactTitle: number;
    partialTitle: number;
    doi: number;
    author: number;
    lexical: number;
    semantic: number;
    metadata: number;
    recency: number;
    authority: number;
  };
  rejectionReasons: string[];
};

type HybridRetrievalResult = {
  sources: RankedSource[];
  status: "found" | "not-found" | "incomplete" | "provider-failure";
  diagnostics: RetrievalDiagnostics;
};
```

## Scoring and Eligibility

Candidate score is normalized to `[0, 100]`:

```text
max(
  DOI exact = 100,
  internal ID exact = 100,
  normalized title exact = 98,
  strong partial title = 82,
  exact author + title = 92
)
+ lexical agreement * 28
+ semantic agreement * 22
+ metadata agreement * 14
+ domain authority * 8
+ recency * 4
- contradiction/peripheral penalties
```

Exact DOI, internal ID, and normalized-title matches bypass semantic thresholds,
but not retraction, malformed metadata, explicit user filters, or source-safety
checks. Topic relevance remains more important than citation count or recency.

## Retrieval Lifecycle

1. Classify the request as scholarly when a DOI, OpenAlex/arXiv ID, title,
   author-paper request, or scholarly term is present.
2. Parse identifiers and explicit filters separately from inferred preferences.
3. Run exact local catalogue lookup.
4. Run structured provider lookup for DOI/ID/author when applicable.
5. Run local lexical lookup and bounded provider lexical variants in parallel.
6. If candidate quality is weak, run conservative synonym/acronym expansion.
7. Retry once without inferred soft filters, never without explicit filters.
8. Merge by DOI, arXiv ID, OpenAlex ID, and normalized title/author evidence.
9. Rank with path-aware scores.
10. Apply the hard relevance gate.
11. Assemble only selected records into model context.
12. Track selected context IDs and compare them with rendered citation/source IDs.
13. Return “not found” only after all configured paths completed successfully.
14. Return a retrieval-fault message when search completeness is uncertain.

## Integrity and Embeddings

The current repository has no internal chunks, embeddings, or vectors. The
integrity command will therefore:

- validate document-level catalogue records, normalized titles, authors, DOI
  uniqueness, source links, active state, and duplicate identity;
- report `chunkIndex: not_configured` and `vectorIndex: not_configured`;
- fail only if a configured index advertises those capabilities and then has
  missing/orphaned/wrong-version records;
- avoid introducing or silently mixing an embedding model.

If a persistent vector index is introduced later, it must record
`embeddingModel`, `embeddingDimension`, `embeddingVersion`, and
`ingestionVersion` on every vector record before it can participate.

## Test-First Sequence

1. Add golden corpus and query-variation tests.
2. Run them against the existing retriever/index behavior and record failures.
3. Add DOI/title/author normalization tests.
4. Add exact and lexical store tests.
5. Add hybrid merge, ranking, filter, and fallback tests.
6. Add the dedicated black-hole matrix.
7. Add integrity and observability tests.
8. Implement the smallest module changes that make each group pass.
9. Add route-level tests proving false “unavailable” output is impossible when
   a selected stored record exists.
10. Run baseline and post-fix evaluation and preserve both reports.

## Verification

```text
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run architecture:check
npm run security:check
npm run eval:research
npm run eval:research-retrieval
npm run research:integrity
npm run build
```

No live provider is required by tests. Production provider behavior remains
bounded, cached, server-only, and source-card compatible.
