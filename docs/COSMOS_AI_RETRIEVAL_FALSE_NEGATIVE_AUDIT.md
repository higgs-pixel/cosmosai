# COSMOS AI Scholarly Retrieval False-Negative Audit

## Executive Finding

The confirmed false-negative was caused by candidate discovery, not answer
wording.

Before this correction, Ask COSMOS queried live OpenAlex, arXiv, and optional
CORE search endpoints, then applied a strict relevance gate. It did not perform
deterministic DOI, internal-ID, normalized-title, or author lookup. It also did
not include the verified local foundational-literature catalogue in the
production retriever. A paper could therefore be known to COSMOS source code,
or directly address the query, yet never become a candidate.

The previous offline evaluation reported `8/8` passing because it injected the
correct papers directly into the ranker. It measured ranking precision after
discovery, not discovery recall.

## Concrete Retrieval Path

| Stage | Active implementation |
| --- | --- |
| Chat request | `src/app/api/ai/chat/route.ts` |
| Query classification | `src/lib/ai/query-intent.ts` |
| Research context orchestration | `buildOpenAlexContext()` in the chat route |
| Request parsing | `src/lib/retrieval/research-request.ts` |
| Query expansion | `src/lib/retrieval/query-expansion.ts` |
| Query planning | `src/lib/retrieval/scholarly-query-plan.ts` |
| Structured normalization | `src/lib/retrieval/scholarly-query-normalizer.ts` |
| Verified local catalogue | `src/lib/retrieval/foundational-literature.ts` |
| Deterministic local index | `src/lib/retrieval/scholarly-index.ts` |
| Hybrid orchestration | `src/lib/retrieval/hybrid-retrieval.ts` |
| Provider orchestration | `src/lib/retrieval/scholarly-provider-runner.ts` |
| OpenAlex provider | `src/lib/data-sources/openalex.ts`, `src/lib/openalex.ts` |
| arXiv provider | `src/lib/data-sources/arxiv.ts` |
| CORE provider | `src/lib/data-sources/core.ts` |
| Record normalization | `src/lib/retrieval/scholarly-paper.ts` |
| Deduplication | `deduplicateScholarlyPapers()` |
| Ranking and eligibility | `src/lib/retrieval/relevance-score.ts` |
| Context assembly | `buildOpenAlexContext()` |
| Model streaming | `src/services/openai/chat.service.ts` |
| Citation/source rendering | `src/components/assistant/research-source-card.tsx` |

## Database and Index Reality

`supabase/schema.sql` currently defines:

- `profiles`
- `user_preferences`
- `saved_discoveries`
- `mission_control_layouts`

It does not define research documents, chunks, embeddings, or vectors. There is
no ingestion job, embedding model, embedding dimension, vector table, or
full-text research index in this checkout. The “research database” is currently
the provider-backed OpenAlex/arXiv/CORE catalogue plus the verified
foundational-literature catalogue.

Accordingly, this change does not invent a vector store or pretend that an
embedding migration occurred. The integrity checker reports chunk and vector
capabilities as `not-configured`. If those capabilities are configured later,
the checker detects missing chunks, missing embeddings, orphaned embeddings,
wrong dimensions, stale versions, and zero vectors.

## Corrected Retrieval Order

1. Normalize DOI, internal ID, title, punctuation, Unicode, author, journal, and
   explicit year.
2. Search exact DOI and internal ID.
3. Search normalized exact title.
4. Search high-confidence partial title and author.
5. Search the verified local catalogue lexically with controlled acronym,
   synonym, hyphenation, and minor-spelling support.
6. Run structured OpenAlex DOI, exact-search, and author-byline operations.
7. Run bounded OpenAlex, arXiv, and CORE lexical variants.
8. Merge candidates by DOI, arXiv ID, and normalized title.
9. Rank with exact/structured signals protected from semantic thresholds.
10. Apply explicit filters as hard constraints and leave inferred preferences
    soft.
11. Return fewer papers rather than adding irrelevant candidates.
12. Classify the outcome as `found`, `not-found`, `incomplete`, or
    `provider-failure`.

## Eligibility and Ranking

Strong identity signals dominate:

- DOI exact: `100`
- internal paper ID exact: `100`
- normalized title exact: `98`
- exact author and title evidence: up to `92`
- high-confidence partial title: `84`

Lexical, metadata, authority, and recency signals refine topic results.
Citation count and recency cannot rescue an unrelated candidate. Exact
identity matches bypass semantic thresholds, but do not bypass retraction,
unsafe metadata, or explicit user filters.

## False “Unavailable” Correction

The route no longer equates a provider failure or quality-gate miss with proof
that no paper exists.

- `found`: attach the selected papers even if a live provider failed.
- `not-found`: only after configured exact, local lexical, and provider paths
  complete without a qualifying result.
- `incomplete` or `provider-failure`: state that the research search could not
  be completed reliably and do not claim database absence.

## Evaluation

The deterministic candidate-discovery evaluation uses controlled provider/store
fixtures and does not call live APIs or paid models.

| Metric | Legacy discovery baseline | Corrected hybrid index |
| --- | ---: | ---: |
| Recall@1 | 14.3% | 100% |
| Recall@5 | 14.3% | 100% |
| False-negative rate | 85.7% | 0% |

The output at `outputs/evals/research-discovery-results.json` also contains:

- Recall@1, @3, @5, and @10
- Mean Reciprocal Rank
- nDCG@10
- irrelevant-result rate
- success by query type
- query-variation stability
- exact-only, lexical-only, semantic, hybrid, and reranked-hybrid stages

Semantic/vector retrieval is explicitly marked `not_configured`, not silently
reported as passing.

## Integrity and Reindexing

Run:

```bash
npm run research:integrity
```

The current catalogue is code-backed and rebuilt deterministically on process
start, so there is no destructive persistent reindex operation to run. A future
persistent store must add a versioned, resumable migration before exposing
`--paper-id`, stale-embedding, or full-reindex commands. Adding fake reindex
commands now would misrepresent the deployed architecture.

## Safe Observability

Server diagnostics record:

- a truncated SHA-256 query hash
- retrieval path status
- candidate and selected counts
- rejection categories
- selected context IDs
- provider status
- stage latency

They do not record API keys, cookies, tokens, complete private queries, or paper
full text. User-visible responses do not expose scores, internal IDs, filters,
or provider errors.

## Remaining Risks

- The verified local catalogue currently covers the black-hole
  information-paradox foundation set. Other domains still depend on
  OpenAlex/arXiv/CORE availability.
- No persistent document/chunk/vector database exists in this repository.
- Live-provider recall must be monitored separately from the deterministic
  mocked evaluation.
- OpenAlex exact and author retrieval behavior should be monitored for API
  contract changes and quota limits.
