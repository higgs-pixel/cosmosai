# COSMOS AI Hybrid Scientific Review Design

**Status:** Approved architecture, ready for implementation planning  
**Date:** 2026-07-20  
**Architecture choice:** Modular in-process review orchestrator  
**Deployment model:** Existing Next.js App Router application on Vercel

## 1. Objective

Upgrade Ask COSMOS from a single-pass answer pipeline into an adaptive scientific review system that improves factual accuracy, evidence alignment, citation integrity, uncertainty calibration, and multi-turn relevance without making ordinary questions unnecessarily slow or expensive.

The implementation preserves the existing API route, providers, streamed answer UI, Supabase authentication, rate limits, NASA and scholarly integrations, source cards, chat auto-scroll, and security controls. It adds no queue, worker, payment flow, or public telemetry endpoint.

## 2. Governing Decisions

1. The active `/api/ai/chat` route remains the security boundary and becomes thin after validation, authentication, and rate limiting.
2. A modular in-process orchestrator owns planning, budget selection, retrieval, drafting, review, quality gates, and completion metadata.
3. Guests never receive `scientific` or `research` budgets and cannot reserve deep-review quota.
4. Authenticated users receive up to five successfully completed deep-reviewed answers per UTC day.
5. Quota storage failure fails closed to the standard fast-reviewed path. It never grants an untracked deep review.
6. Failed, timed-out, cancelled, released, and duplicate requests do not consume the successful deep-review allowance.
7. The system streams only the final reviewed answer. It does not stream an unverified draft.
8. One correction cycle is the maximum. A second quality-gate failure produces a narrower, explicitly limited answer.
9. Confidence is primarily internal and calibrates wording. No percentage is shown to users by default.
10. Source priority is domain- and intent-aware. Relevance and freshness can outweigh a static authority hierarchy.

## 3. Architecture

```text
Route security boundary
  -> authentication and rate limiting
  -> bounded request and conversation context
  -> query classification
  -> intent/research planning
  -> review budget selection
  -> optional deep-review reservation
  -> parallel retrieval
  -> source deduplication and domain-aware authority ranking
  -> pre-draft evidence matrix
  -> draft generation
  -> claim extraction
  -> claim-to-evidence verification
  -> scientific and citation review
  -> internal confidence scoring
  -> final response critic
  -> deterministic quality gate
  -> at most one correction cycle
  -> reviewed final streaming response
  -> quota commit or release
  -> private telemetry
```

The orchestrator is request-scoped and stateless except for cache access and the Supabase quota ledger. Its dependencies are injected so policy, provider failures, timeouts, and quota behavior can be tested without live model or API calls.

## 4. Review Modes And Dynamic Budgets

Public review modes remain:

```ts
type ReviewMode = "direct" | "fast-reviewed" | "deep-reviewed";
```

Execution is governed by a dynamic budget:

```ts
type ReviewBudget = {
  level: "minimal" | "standard" | "scientific" | "research";
  maxLatencyMs: number;
  maxModelCalls: number;
  maxRetrievalSources: number;
  maxReviewerPasses: number;
};
```

Default ceilings:

| Level | User eligibility | Review mode | Latency ceiling | Model calls | Sources | Reviewer passes |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `minimal` | Guest or authenticated | `direct` | 6,000 ms | 1 | 0-2 | 0 |
| `standard` | Guest or authenticated | `fast-reviewed` | 15,000 ms | 3 | 6 | 1 |
| `scientific` | Authenticated and quota eligible | `deep-reviewed` | 30,000 ms | 4 | 10 | 1 |
| `research` | Authenticated and quota eligible | `deep-reviewed` | 40,000 ms | 5 | 14 | 1 |

These are maximums, not targets. The router selects and can reduce a budget using:

- authentication state
- scientific complexity
- evidence and controversy risk
- citation request
- freshness requirement
- current provider health
- quota availability
- elapsed and remaining request time
- conversation context dependence

Guests may receive retrieval and citations under `standard`; they are not deliberately given a lower-quality answer. They simply do not receive the multi-stage deep path.

## 5. Query Assessment

The deterministic-first classifier returns:

```ts
type CosmosQueryMode =
  | "simple-definition"
  | "general-explanation"
  | "advanced-scientific"
  | "scholarly-sources"
  | "false-premise"
  | "controversial-claim"
  | "current-mission"
  | "current-discovery"
  | "live-data"
  | "comparison"
  | "calculation"
  | "educational"
  | "conversational-followup"
  | "uncertain-science";

type QueryAssessment = {
  queryMode: CosmosQueryMode;
  requestedDepth: "brief" | "standard" | "technical" | "research";
  requiresRetrieval: boolean;
  requiresFreshData: boolean;
  requiresCitations: boolean;
  containsFalsePremise: boolean;
  controversyRisk: number;
  scientificComplexity: number;
  evidenceRisk: number;
  contextDependence: number;
  recommendedReviewMode: ReviewMode;
  reasons: string[];
};
```

Scores are clamped to `[0, 1]`. The existing `classifyCosmosQuery()` and scholarly intent logic are adapted rather than duplicated. Deterministic signals decide normal cases. Optional lightweight model classification is allowed only for genuinely ambiguous cases and must fit the selected budget.

## 6. Conversation Context

The client-provided message array remains validated by the route. A server-side context builder converts it into:

```ts
type ConversationContext = {
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  summary?: string;
  activeTopic?: string;
  referencedEntities: string[];
  priorSourceIds: string[];
  userRequestedDepth?: "brief" | "standard" | "technical" | "research";
};
```

Rules:

- retain at most 12 recent messages by default and never more than 16
- enforce a strict character/token approximation budget
- preserve complete message boundaries
- keep the latest user prompt intact
- retain prior source IDs only when still present in validated conversation metadata
- resolve short follow-ups against the active topic and recent entities
- do not persist or cache private conversation content globally

## 7. Intent And Research Planning

Planning occurs before retrieval and produces:

```ts
type ResearchPlan = {
  normalizedQuestion: string;
  userIntent: string;
  subquestions: string[];
  requiredEvidenceTypes: Array<
    | "official-source"
    | "peer-reviewed"
    | "preprint"
    | "mission-data"
    | "historical-source"
    | "live-data"
    | "general-reference"
  >;
  freshnessRequirement: "stable" | "recent" | "live";
  keyConcepts: string[];
  disputedClaims: string[];
  verificationTargets: string[];
};
```

The planner resolves conversational references, preserves the original request, identifies each subquestion, and states what evidence is needed. It must not add requirements or treat unsupported premises as facts. Simple requests use deterministic planning; advanced requests may use one bounded structured model call.

## 8. Retrieval And Source Authority

Existing NASA, OpenAlex, arXiv, CORE, foundational-literature, and tool-context integrations remain the retrieval foundation. Independent providers run concurrently with `Promise.allSettled`, request cancellation, provider-specific timeouts, and result caps.

All results normalize to a shared source record containing stable identity, provider, source type, title, authors, date, URL, DOI/arXiv ID, abstract or evidence excerpt, freshness, and source-card fields.

Deduplication precedence:

1. DOI
2. arXiv identifier
3. canonical URL
4. normalized title and first-author/year tuple

Authority ranking is intent-aware. The normal astronomy hierarchy is:

1. relevant official mission or agency source
2. primary peer-reviewed research
3. authoritative scientific database
4. scholarly review
5. relevant preprint
6. reputable institutional explanation
7. general secondary source

The hierarchy is not a global hardcoded ordering. The scoring profile changes by plan:

- Current mission status heavily weights official authority and freshness.
- Theoretical history heavily weights foundational primary work and direct relevance.
- Live observations weight timestamp, official feed provenance, and freshness.
- Broad education can include institutional explanations after primary evidence is secured.

The ranker combines direct relevance, authority-for-intent, evidence-type fit, freshness fit, metadata integrity, and duplication penalties. No low-relevance source can win solely through authority.

## 9. Evidence Matrix

Before drafting, retrieved sources are converted into an evidence matrix:

```ts
type EvidenceItem = {
  claimId: string;
  claim: string;
  sourceIds: string[];
  support: "strong" | "moderate" | "weak" | "conflicting" | "unsupported";
  evidenceType:
    | "observation"
    | "experiment"
    | "theory"
    | "simulation"
    | "review"
    | "official-statement"
    | "historical";
  confidence: number;
  notes?: string;
};

type EvidenceMatrix = {
  items: EvidenceItem[];
  conflicts: Array<{
    claim: string;
    supportingSourceIds: string[];
    opposingSourceIds: string[];
    explanation: string;
  }>;
  unsupportedClaims: string[];
  overallEvidenceConfidence: number;
};
```

The initial matrix is built from verification targets and source metadata. The answer model receives the plan, ranked source packet, and evidence matrix rather than raw provider payloads.

## 10. Draft, Claim Extraction, And Evidence Matching

The draft generator must answer every major subquestion, follow the requested depth, use only validated source labels, and distinguish observation, consensus, interpretation, and speculation.

After drafting, a claim extractor returns compact externally verifiable claims:

```ts
type ExtractedClaim = {
  id: string;
  text: string;
  sentenceIndex: number;
  importance: "major" | "supporting";
  claimType: "factual" | "causal" | "quantitative" | "interpretive" | "uncertainty";
  citedSourceIds: string[];
};
```

The matcher evaluates each claim against the ranked source packet and evidence matrix:

```ts
type ClaimEvidenceMatch = {
  claimId: string;
  sourceIds: string[];
  status: "supported" | "partially-supported" | "conflicting" | "unsupported";
  strength: number;
  correction?: string;
};
```

Model-assisted extraction uses low temperature and strict JSON. A deterministic sentence/citation parser is the fallback. Missing or malformed model output cannot bypass deterministic citation checks.

## 11. Scientific And Citation Review

The scientific reviewer checks conceptual accuracy, terminology, internal consistency, causality, consensus, uncertainty, missing evidence, contradictions, and completeness. It returns correction instructions, not hidden reasoning or a rewritten answer.

The citation validator deterministically verifies:

- every visible citation maps to a retrieved source
- displayed URLs and identifiers match source metadata
- duplicate and malformed citations are removed
- cited claims have a supporting claim-evidence match
- no raw retrieval IDs appear
- no invented author, title, date, journal, DOI, arXiv ID, or URL appears

Invalid citations are removed. They are never replaced with invented metadata.

## 12. Internal Confidence

Confidence is calculated from:

```ts
type ConfidenceInputs = {
  sourceQuality: number;
  sourceAgreement: number;
  freshnessFit: number;
  evidenceStrength: number;
  claimCoverage: number;
  contradictionPenalty: number;
};

type ConfidenceAssessment = {
  score: number;
  level: "high" | "moderate" | "low";
  wordingGuidance: string[];
};
```

The score remains internal. It calibrates wording such as “measurements show,” “evidence strongly supports,” “several models propose,” or “current observations cannot determine.” A high authority score cannot compensate for poor claim coverage or contradictory evidence.

## 13. Final Response Critic And Quality Gate

The critic checks:

- complete answer to the main question
- missing subquestions
- factual or conceptual errors
- unsupported claims
- claim-citation alignment
- uncertainty calibration
- repetition
- requested depth
- clarity and unnecessary length
- whether conclusions follow from evidence

It returns a verdict and bounded correction instructions. It does not expose internal reasoning.

The deterministic quality gate requires:

- all major subquestions addressed or explicitly limited
- no unresolved high-severity review issue
- no invalid visible citation
- no unsupported major claim stated as fact
- contradictions disclosed
- answer length within budget
- no anonymous “research source 1” language
- source cards compatible with the current client

If the first gate fails, one final editor applies the combined correction instructions. The gate runs once more. If it still fails, the system returns a narrower answer that states the evidence limitation.

## 14. Model Task Routing

```ts
type ModelTask =
  | "classification"
  | "planning"
  | "fast-draft"
  | "deep-draft"
  | "claim-extraction"
  | "fast-review"
  | "scientific-review"
  | "final-edit";
```

Each task resolves through the existing provider fallback order to a configuration containing provider, model, timeout, output-token cap, temperature, and retry policy. Classification, extraction, and review use low temperature. The strongest available configured model is reserved for deep synthesis and correction. No new provider or paid dependency is introduced.

Internal model calls use a non-streaming text-generation adapter. The final validated text is streamed through the existing response format so the client and source cards remain compatible.

## 15. Request Lifecycle

1. Route creates or validates a request ID.
2. Route enforces same-origin, body-size, message, context, and mode validation.
3. Route resolves the Supabase session and server-trusted user ID.
4. Route enforces existing distributed rate limits.
5. Route builds bounded conversation context.
6. Orchestrator assesses the query and creates a research plan.
7. Budget router selects an initial `ReviewBudget` from assessment, auth, provider health, and request deadline.
8. If scientific/research is selected, the usage store attempts an atomic reservation.
9. Reservation denial or storage failure downgrades to `standard` and records the reason.
10. Retrieval runs only as required and within the budget.
11. Sources are deduplicated, authority-ranked, and converted to evidence.
12. The model gateway generates a draft.
13. Claims are extracted and matched to evidence.
14. Reviewers and critic produce correction instructions.
15. The deterministic gate passes the draft or allows one correction cycle.
16. A final reviewed answer, source cards, and client-safe metadata are returned to a stream builder.
17. Successful stream completion commits the reservation exactly once.
18. Cancellation, timeout, or stream failure releases the reservation.
19. Structured private telemetry records the outcome and stage timings.

## 16. Supabase Migration Design

### 16.1 Tables

`public.ai_daily_usage`

- `user_id uuid not null references auth.users(id) on delete cascade`
- `usage_date date not null`
- `deep_review_success_count integer not null default 0`
- `fast_review_count integer not null default 0`
- `updated_at timestamptz not null default now()`
- primary key `(user_id, usage_date)`
- checks keep counts non-negative

`public.ai_review_requests`

- `id uuid primary key default gen_random_uuid()`
- `request_id text not null`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `usage_date date not null`
- `status text not null` constrained to `reserved`, `succeeded`, `released`, `failed`, `expired`
- `budget_level text not null`
- `query_mode text not null`
- `reserved_at timestamptz not null default now()`
- `expires_at timestamptz not null`
- `completed_at timestamptz`
- `telemetry jsonb not null default '{}'::jsonb`
- unique `(user_id, request_id)`
- indexes on `(user_id, usage_date, status)` and `expires_at`

No full prompt, answer text, raw IP address, API key, or hidden reviewer output is stored.

### 16.2 RLS And Grants

- RLS enabled on both tables.
- Authenticated users may select only their own daily usage and request records if those records are exposed later.
- Direct insert, update, and delete are revoked from `anon` and `authenticated`.
- Counter mutation occurs only through security-definer RPCs with a fixed `search_path` and `auth.uid()` checks.
- RPCs accept no user ID and cannot act for another account.

### 16.3 RPCs

`reserve_ai_deep_review(p_request_id text, p_budget_level text, p_query_mode text)`

- rejects missing auth and malformed request IDs
- derives UTC date in PostgreSQL
- obtains a per-user/per-date transactional advisory lock
- expires stale reservations
- returns an existing request idempotently
- counts succeeded plus non-expired reservations
- reserves only when the count is below five
- returns used, remaining, reservation state, and reset time

`complete_ai_deep_review(p_request_id text, p_telemetry jsonb)`

- obtains the same lock
- changes only `reserved` to `succeeded`
- increments `ai_daily_usage` once
- repeated completion is idempotent

`release_ai_deep_review(p_request_id text, p_outcome text, p_telemetry jsonb)`

- maps cancellation, failure, and timeout to an allowed terminal status
- never increments success count
- cannot change `succeeded` back to another status
- repeated release is idempotent

## 17. Quota Reservation State Machine

```text
none -> reserved -> succeeded
                  -> released
                  -> failed
                  -> expired
```

- `succeeded` consumes one daily deep review.
- `reserved` temporarily occupies capacity to prevent concurrent over-allocation.
- Reservations expire after the deep request hard timeout plus a safety margin.
- Duplicate retries with the same user/request ID return the existing state.
- A succeeded duplicate does not increment again.
- The sixth concurrent or completed request receives `standard` review.
- A new UTC date creates a new usage key and automatically resets availability.

## 18. Streaming And Cancellation

The reviewed response is generated before visible answer chunks begin. The existing UI continues showing safe loading states during planning and review. The stream builder:

- emits the final answer using the existing text stream contract
- retains source-card headers and current status headers
- adds client-safe review metadata headers
- commits quota only after all final chunks are successfully produced
- releases on request abort, stream cancellation, or stream error
- makes commit and release idempotent

No provisional draft, reviewer prompt, evidence matrix, chain-of-thought, or raw model JSON reaches the client.

## 19. Latency And Graceful Degradation

Each request owns a monotonic deadline and stage ledger. Before starting a stage, the orchestrator checks remaining time and call/source budgets.

Target stage allocation:

| Stage | Standard | Scientific/Research |
| --- | ---: | ---: |
| Classification/context | 1,000 ms | 1,500 ms |
| Planning | 500 ms deterministic or 1,500 ms model | 2,500 ms |
| Parallel retrieval | 4,000 ms | 7,000 ms |
| Draft | 5,000 ms | 8,000 ms |
| Review/critic | 3,000 ms | 7,000 ms |
| Finalization | 1,500 ms | 4,000 ms |

Degradation order:

1. skip lower-priority secondary providers
2. reduce per-provider and total source caps
3. use deterministic planning instead of model planning
4. combine scientific review and response critic into one structured call
5. skip low-value style review while retaining citation and claim validation
6. downgrade to standard review with a client-safe notice
7. return a narrower evidence-limited answer

The system never returns fabricated content merely to hit a latency target. A failed provider does not fail the request when sufficient evidence remains.

## 20. Caching

Safe caches retain existing behavior and may add:

- normalized context-independent classifications: short TTL
- stable scholarly searches and metadata: 24 hours to 7 days
- NASA mission reference pages: 24 hours
- current mission updates: 5 to 30 minutes
- live observational feeds: source-specific short TTL

Private conversation content, personalized answers, quota decisions, and live data beyond its freshness window are never globally cached. Cache keys include normalized plan and source freshness class. Duplicate internal retrieval within one request is coalesced.

## 21. Telemetry

Private structured telemetry records:

- request ID
- guest/authenticated classification
- query mode and selected budget
- downgrade reason
- stage timings
- source count and provider set
- provider/model task outcomes
- review verdict
- citation validation status
- confidence level
- quota reservation and completion outcome
- degradation reasons
- redacted failure category

Complete prompts, answer bodies, private IP addresses, secrets, access tokens, and hidden reviewer output are excluded. Existing server logging conventions are reused.

## 22. Module And File Map

### New runtime modules

| File | Responsibility |
| --- | --- |
| `src/lib/ai/review/types.ts` | Shared review, budget, plan, evidence, claim, confidence, metadata, and dependency interfaces |
| `src/lib/ai/review/query-assessment.ts` | Adapt existing intent classification into scored `QueryAssessment` |
| `src/lib/ai/review/conversation-context.ts` | Build bounded context and resolve follow-up signals |
| `src/lib/ai/review/research-plan.ts` | Deterministic and model-assisted intent/research planning |
| `src/lib/ai/review/review-budget.ts` | Select and degrade dynamic `ReviewBudget` |
| `src/lib/ai/review/source-authority.ts` | Intent-aware authority and freshness ranking |
| `src/lib/ai/review/evidence-matrix.ts` | Build pre-draft evidence matrix and conflict set |
| `src/lib/ai/review/claim-extractor.ts` | Extract verifiable draft claims with deterministic fallback |
| `src/lib/ai/review/claim-evidence.ts` | Match claims to sources and evidence items |
| `src/lib/ai/review/confidence.ts` | Calculate internal confidence and wording guidance |
| `src/lib/ai/review/citation-validator.ts` | Deterministic citation and metadata validation |
| `src/lib/ai/review/scientific-review.ts` | Structured scientific review and correction instructions |
| `src/lib/ai/review/response-critic.ts` | Final completeness, clarity, depth, and evidence critic |
| `src/lib/ai/review/quality-gate.ts` | Deterministic pass/fail and narrow-answer fallback rules |
| `src/lib/ai/review/model-router.ts` | Map `ModelTask` to existing providers and bounded settings |
| `src/lib/ai/review/latency-budget.ts` | Deadline, stage timing, call/source budget, and degradation ledger |
| `src/lib/ai/review/review-usage.ts` | Supabase-backed quota reservation/commit/release adapter |
| `src/lib/ai/review/telemetry.ts` | Redacted structured review telemetry |
| `src/lib/ai/review/orchestrator.ts` | Compose modules through injected dependencies |
| `src/lib/ai/review/reviewed-stream.ts` | Stream reviewed text and coordinate quota completion/cancellation |

### Existing runtime files modified

| File | Change |
| --- | --- |
| `src/app/api/ai/chat/route.ts` | Retain security boundary; replace inline answer orchestration with one orchestrator call |
| `src/lib/ai/provider.ts` | Add internal non-streaming generation abstraction while preserving streaming provider order |
| `src/lib/ai/groq.ts` | Implement bounded non-streaming generation adapter for Groq |
| `src/services/openai/chat.service.ts` | Implement bounded non-streaming OpenAI-compatible adapter and preserve existing exports |
| `src/utils/supabase/server.ts` | Add typed RPC helpers using the authenticated session token |
| `src/components/assistant/cosmos-assistant.tsx` | Preserve UI; rotate safe review progress states and read client-safe metadata |
| `supabase/schema.sql` | Mirror usage tables, policies, grants, and RPCs |
| `package.json` | Include new test files in the existing test command |
| `scripts/eval-cosmos.ts` | Evaluate hybrid routing, quota, quality, latency, and degradation |
| `README.md` and `PROJECT_STATUS.md` | Document architecture, migration, behavior, and production configuration |

### Migration

- `supabase/migrations/20260720_hybrid_scientific_review.sql`

### Tests

- `tests/hybrid-query-assessment.test.ts`
- `tests/hybrid-review-budget.test.ts`
- `tests/hybrid-conversation-context.test.ts`
- `tests/hybrid-source-authority.test.ts`
- `tests/hybrid-evidence-review.test.ts`
- `tests/hybrid-review-usage.test.ts`
- `tests/hybrid-orchestrator.test.ts`
- `tests/hybrid-reviewed-stream.test.ts`

### Generated evaluation outputs

- `outputs/evals/hybrid-review-results.json`
- `outputs/evals/hybrid-review-report.md`

## 23. Module Interfaces

```ts
type ReviewOrchestratorInput = {
  requestId: string;
  authenticatedUserId?: string;
  accessToken?: string;
  messages: CosmosChatMessage[];
  mode: CosmosChatMode;
  audience: CosmosAudienceMode;
  pageContext: CosmosChatContext;
  signal: AbortSignal;
  startedAt: number;
};

type ReviewedAnswer = {
  text: string;
  sourceCards: CosmosNasaSourceCard[];
  metadata: CosmosResponseMetadata;
  reservation?: ReviewReservation;
};

type ReviewDependencies = {
  clock: Clock;
  modelGateway: ModelGateway;
  retrievalGateway: RetrievalGateway;
  usageStore: ReviewUsageStore;
  telemetry: ReviewTelemetry;
  providerHealth: ProviderHealthReader;
};

type ModelGateway = {
  generate(input: ModelGenerationInput): Promise<ModelGenerationResult>;
};

type RetrievalGateway = {
  retrieve(input: RetrievalRequest): Promise<RetrievalResult>;
};

type ReviewUsageStore = {
  reserve(input: ReserveReviewInput): Promise<ReviewUsageDecision>;
  complete(input: CompleteReviewInput): Promise<void>;
  release(input: ReleaseReviewInput): Promise<void>;
};

type ReviewTelemetry = {
  record(event: ReviewTelemetryEvent): void | Promise<void>;
};
```

The orchestrator accepts only these abstractions. Tests replace them with deterministic fakes.

## 24. Client-Safe Metadata

```ts
type CosmosResponseMetadata = {
  requestId: string;
  queryMode: CosmosQueryMode;
  reviewMode: ReviewMode;
  budgetLevel: ReviewBudget["level"];
  authenticated: boolean;
  deepReviewEligible: boolean;
  deepReviewsRemaining?: number;
  retrievalUsed: boolean;
  sourceCount: number;
  confidence: "high" | "moderate" | "low";
  latencyMs: number;
  degraded: boolean;
  degradationReasons: string[];
};
```

It excludes prompts, raw scores, hidden reasoning, reviewer details, private identifiers, and provider secrets.

## 25. Error Handling

- Validation and origin errors retain current public messages and statuses.
- Rate-limit failures retain current protection behavior.
- Usage-store failure downgrades deep requests to `standard` and records `quota_store_unavailable`.
- Planner failure uses deterministic planning.
- Individual retrieval failure is isolated; insufficient aggregate evidence narrows the answer.
- Model-task timeout follows budget degradation; no task retries indefinitely.
- Malformed reviewer JSON becomes a review failure and triggers deterministic safeguards.
- Cancellation aborts provider and retrieval calls and releases any reservation.
- Public errors never contain provider payloads, database messages, stack traces, prompts, or keys.

## 26. Test Matrix

| Requirement | Primary test |
| --- | --- |
| Simple definition uses fast path | `hybrid-query-assessment.test.ts` |
| Advanced science selects deep when eligible | `hybrid-review-budget.test.ts` |
| Guest cannot select deep | `hybrid-review-budget.test.ts` |
| Citation and source request selects research budget | `hybrid-review-budget.test.ts` |
| False premise and current information detected | `hybrid-query-assessment.test.ts` |
| Follow-up resolves previous topic | `hybrid-conversation-context.test.ts` |
| Context is bounded without partial messages | `hybrid-conversation-context.test.ts` |
| Current mission prioritizes fresh official source | `hybrid-source-authority.test.ts` |
| Theory history prioritizes foundational paper | `hybrid-source-authority.test.ts` |
| Providers run concurrently and tolerate failure | `hybrid-orchestrator.test.ts` |
| DOI/title duplicates collapse | existing scholarly tests plus `hybrid-source-authority.test.ts` |
| Evidence conflicts are preserved | `hybrid-evidence-review.test.ts` |
| Claims map only to retrieved sources | `hybrid-evidence-review.test.ts` |
| Fabricated citation is rejected | `hybrid-evidence-review.test.ts` |
| Unsupported major claim fails gate | `hybrid-evidence-review.test.ts` |
| Confidence falls with conflict/staleness | `hybrid-evidence-review.test.ts` |
| Critic detects missing subquestion and repetition | `hybrid-evidence-review.test.ts` |
| Only one correction cycle | `hybrid-orchestrator.test.ts` |
| Five successful deep reviews allowed | `hybrid-review-usage.test.ts` |
| Sixth request downgrades | `hybrid-review-usage.test.ts` and orchestrator test |
| UTC date resets allowance | `hybrid-review-usage.test.ts` |
| Failure/cancel/timeout does not consume | `hybrid-review-usage.test.ts` |
| Duplicate request is idempotent | `hybrid-review-usage.test.ts` |
| Quota store failure fails closed to standard | `hybrid-orchestrator.test.ts` |
| Deadline degrades lower-value stages | `hybrid-review-budget.test.ts` |
| Reviewed answer only is streamed | `hybrid-reviewed-stream.test.ts` |
| Stream completion commits once | `hybrid-reviewed-stream.test.ts` |
| Stream cancellation releases | `hybrid-reviewed-stream.test.ts` |
| Source-card encoding remains compatible | `hybrid-reviewed-stream.test.ts` |
| Production errors are redacted | existing security tests plus orchestrator tests |

Regression prompts include the seven mandatory prompts from the request and model-independent fixtures for their expected routing and evidence requirements.

## 27. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Review latency exceeds Vercel request duration | Hard 40-second research budget, stage deadlines, parallel retrieval, one correction maximum |
| Concurrent requests exceed daily quota | Transactional advisory lock plus active reservation counting and idempotency key |
| Client disconnect after generation | Commit on stream completion; release on cancellation/abort; reservation TTL handles abandoned work |
| Provider lacks structured output reliability | Strict JSON parsing, bounded repair-free fallback, deterministic validators |
| Reviewer introduces unsupported corrections | Reviewer emits instructions only; final facts must map to existing evidence |
| Authority ranking suppresses relevant new evidence | Domain-aware profile combines relevance, freshness, and authority instead of static ordering |
| Confidence appears falsely precise | Keep numeric score internal; expose only calibrated language and coarse metadata |
| Existing source cards break | Preserve `CosmosNasaSourceCard` and existing encoded header contract |
| Existing route remains too large | Move only orchestration into focused modules; retain route-owned security and request parsing |
| Migration not applied in production | Fail closed to standard review and report configuration requirement clearly |
| Model cost expands unexpectedly | Dynamic call caps, no deep path for guests, five successful reviews/day, safe caching, telemetry |
| Tests make paid calls | Dependency injection and fixtures; evaluation defaults to deterministic/offline mode |

## 28. Acceptance Criteria

Implementation is complete only when:

- guests cannot trigger deep review
- authenticated users are adaptively routed
- five successful deep reviews per UTC day are enforced atomically
- failure, timeout, cancellation, release, and duplicate retry do not consume allowance
- quota exhaustion or storage failure returns standard review
- ordinary questions stay within fast-path architecture
- advanced questions receive planning, evidence, claim verification, review, critic, and quality gate
- source authority is domain-aware
- confidence calibrates language without displaying a percentage
- retrieval providers run concurrently where independent
- visible citations map to retrieved sources
- unsupported claims are removed or qualified
- contradictions and uncertainty are disclosed
- context is bounded and follow-ups resolve correctly
- only reviewed final text is streamed
- no more than one correction cycle runs
- existing authentication, rate limiting, source cards, auto-scroll, providers, and integrations remain functional
- required lint, typecheck, test, build, and evaluation commands pass

## 29. Out Of Scope

- subscriptions, payments, checkout, or upgrade prompts
- background workers, queues, or durable job runners
- new AI providers or paid data sources
- public telemetry dashboards
- persistent full conversation storage
- chat interface redesign
- changing authentication or Google OAuth behavior
- changing NASA or scholarly provider APIs beyond adapter reuse

