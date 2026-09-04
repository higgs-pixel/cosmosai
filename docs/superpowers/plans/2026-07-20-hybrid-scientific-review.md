# COSMOS AI Hybrid Scientific Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an adaptive, quota-aware scientific review orchestrator that returns reviewed, source-grounded Ask COSMOS answers while preserving existing providers, retrieval, streaming UI, security, and Vercel deployment.

**Architecture:** Keep `/api/ai/chat` as a thin security boundary and compose focused in-process modules through dependency injection. Deterministic policy selects a dynamic review budget, existing providers retrieve evidence in parallel, model tasks draft and review within a request deadline, and Supabase RPCs atomically reserve and commit five successful deep reviews per authenticated user per UTC day.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner, Supabase PostgreSQL/RLS/RPC, existing Groq/OpenAI-compatible providers, existing NASA/OpenAlex/arXiv/CORE services.

## Global Constraints

- Do not add a queue, background worker, new AI provider, payment code, or heavy dependency.
- Guests may use only `direct` or `fast-reviewed` modes.
- Authenticated users receive no more than five successful deep-reviewed answers per UTC day.
- Quota storage failure must downgrade to standard fast review.
- Failed, cancelled, timed-out, released, and duplicate requests must not consume quota.
- Stream only the reviewed final answer.
- Preserve current source cards, authentication, rate limits, provider fallback order, NASA/scholarly integrations, auto-scroll, and mobile UI.
- Use one correction cycle maximum.
- Never expose prompts, chain-of-thought, raw reviewer output, keys, private IP addresses, or database errors.
- Keep the active API route thin; orchestration belongs in focused modules.
- All model and external-service tests must use injected fakes or fixtures and make no paid calls.

---

## File Structure

### Create

- `src/lib/ai/review/types.ts`
- `src/lib/ai/review/query-assessment.ts`
- `src/lib/ai/review/conversation-context.ts`
- `src/lib/ai/review/research-plan.ts`
- `src/lib/ai/review/review-budget.ts`
- `src/lib/ai/review/source-authority.ts`
- `src/lib/ai/review/evidence-matrix.ts`
- `src/lib/ai/review/claim-extractor.ts`
- `src/lib/ai/review/claim-evidence.ts`
- `src/lib/ai/review/confidence.ts`
- `src/lib/ai/review/citation-validator.ts`
- `src/lib/ai/review/scientific-review.ts`
- `src/lib/ai/review/response-critic.ts`
- `src/lib/ai/review/quality-gate.ts`
- `src/lib/ai/review/model-router.ts`
- `src/lib/ai/review/latency-budget.ts`
- `src/lib/ai/review/review-usage.ts`
- `src/lib/ai/review/telemetry.ts`
- `src/lib/ai/review/orchestrator.ts`
- `src/lib/ai/review/reviewed-stream.ts`
- `supabase/migrations/20260720_hybrid_scientific_review.sql`
- `tests/hybrid-query-assessment.test.ts`
- `tests/hybrid-review-budget.test.ts`
- `tests/hybrid-conversation-context.test.ts`
- `tests/hybrid-source-authority.test.ts`
- `tests/hybrid-evidence-review.test.ts`
- `tests/hybrid-review-usage.test.ts`
- `tests/hybrid-orchestrator.test.ts`
- `tests/hybrid-reviewed-stream.test.ts`

### Modify

- `src/app/api/ai/chat/route.ts`
- `src/lib/ai/provider.ts`
- `src/lib/ai/groq.ts`
- `src/services/openai/chat.service.ts`
- `src/utils/supabase/server.ts`
- `src/components/assistant/cosmos-assistant.tsx`
- `supabase/schema.sql`
- `scripts/eval-cosmos.ts`
- `package.json`
- `README.md`
- `PROJECT_STATUS.md`

### Generate During Verification

- `outputs/evals/hybrid-review-results.json`
- `outputs/evals/hybrid-review-report.md`

---

### Task 1: Establish Shared Review Contracts

**Files:**
- Create: `src/lib/ai/review/types.ts`
- Test: `tests/hybrid-query-assessment.test.ts`

**Interfaces:**
- Consumes: existing `CosmosChatMessage`, `CosmosChatMode`, `CosmosAudienceMode`, `CosmosChatContext`, and `CosmosNasaSourceCard` from `src/services/openai/chat.service.ts`
- Produces: all shared types described in the approved specification, especially `QueryAssessment`, `ResearchPlan`, `ReviewBudget`, `ReviewDependencies`, `ReviewedAnswer`, `EvidenceMatrix`, `ExtractedClaim`, `ClaimEvidenceMatch`, `ConfidenceAssessment`, and `CosmosResponseMetadata`

- [ ] **Step 1: Write the contract smoke test**

Add a test that imports the public types and constructs a representative `ReviewBudget`, `QueryAssessment`, and `ReviewedAnswer`. Use `satisfies` so renamed or missing fields fail TypeScript compilation.

```ts
const budget = {
  level: "standard",
  maxLatencyMs: 15_000,
  maxModelCalls: 3,
  maxRetrievalSources: 6,
  maxReviewerPasses: 1,
} satisfies ReviewBudget;

assert.equal(budget.level, "standard");
```

- [ ] **Step 2: Run the focused typecheck and confirm failure**

Run: `npm run typecheck`  
Expected: FAIL because `src/lib/ai/review/types.ts` and its exports do not exist.

- [ ] **Step 3: Add the shared type module**

Define exact string unions and interfaces from the specification. Keep the file declarative: no provider imports, no side effects, no environment access.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-query-assessment.test.ts`  
Expected: PASS.

Run: `npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit the contracts**

```bash
git add src/lib/ai/review/types.ts tests/hybrid-query-assessment.test.ts
git commit -m "test: define hybrid review contracts"
```

---

### Task 2: Implement Query Assessment And Bounded Conversation Context

**Files:**
- Create: `src/lib/ai/review/query-assessment.ts`
- Create: `src/lib/ai/review/conversation-context.ts`
- Modify: `tests/hybrid-query-assessment.test.ts`
- Create: `tests/hybrid-conversation-context.test.ts`

**Interfaces:**
- Consumes: `classifyCosmosQuery()` and `intentNeedsScholarlyRetrieval()` from `src/lib/ai/query-intent.ts`
- Produces:
  - `assessQuery(prompt: string, context: ConversationContext): QueryAssessment`
  - `buildConversationContext(messages: CosmosChatMessage[], options?: ConversationContextOptions): ConversationContext`

- [ ] **Step 1: Add failing assessment tests**

Cover these exact expectations:

```ts
assert.equal(assessQuery("What is a black hole?", emptyContext).recommendedReviewMode, "fast-reviewed");
assert.equal(assessQuery(advancedInformationParadoxPrompt, emptyContext).queryMode, "advanced-scientific");
assert.equal(assessQuery("Give me five peer-reviewed sources on black-hole evaporation", emptyContext).requiresCitations, true);
assert.equal(assessQuery("Why did NASA confirm aliens built cities on Mars?", emptyContext).containsFalsePremise, true);
assert.equal(assessQuery("What is the latest Artemis mission status?", emptyContext).requiresFreshData, true);
```

Also assert all four risk scores remain within `[0, 1]` and `reasons` contains policy labels rather than user content.

- [ ] **Step 2: Add failing context tests**

Create a 20-message fixture and assert:

- no more than 12 messages by default
- latest user prompt is preserved
- no message is sliced mid-content
- active topic resolves “Tell me more about that” to the prior black-hole topic
- prior source IDs are deduplicated and capped
- requested researcher depth is retained

- [ ] **Step 3: Run the two tests and confirm failure**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-query-assessment.test.ts tests/hybrid-conversation-context.test.ts`  
Expected: FAIL because both modules are missing.

- [ ] **Step 4: Implement deterministic assessment**

Adapt existing intent output into the new scored assessment. Use phrase groups, subquestion count, requested depth, false-premise signals, current-data signals, and conversation dependence. Clamp scores with one shared local helper. Do not call a model in this module.

- [ ] **Step 5: Implement bounded context**

Traverse complete messages from newest to oldest until the message and character budgets are reached. Preserve the latest user message even when it alone reaches the budget. Extract active topic/entities using deterministic terms and existing source labels.

- [ ] **Step 6: Run tests and regression intent tests**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-query-assessment.test.ts tests/hybrid-conversation-context.test.ts tests/query-intent.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit assessment and context**

```bash
git add src/lib/ai/review/query-assessment.ts src/lib/ai/review/conversation-context.ts tests/hybrid-query-assessment.test.ts tests/hybrid-conversation-context.test.ts
git commit -m "feat: assess queries and bound conversation context"
```

---

### Task 3: Implement Review Budgets, Deadlines, And Adaptive Routing

**Files:**
- Create: `src/lib/ai/review/review-budget.ts`
- Create: `src/lib/ai/review/latency-budget.ts`
- Test: `tests/hybrid-review-budget.test.ts`

**Interfaces:**
- Consumes: `QueryAssessment`, auth state, quota decision, provider health, and clock
- Produces:
  - `selectReviewBudget(input: ReviewBudgetSelectionInput): ReviewBudgetDecision`
  - `createLatencyController(budget: ReviewBudget, startedAt: number, clock: Clock): LatencyController`

- [ ] **Step 1: Add failing budget-selection tests**

Assert:

- guests never receive `scientific` or `research`
- authenticated basic questions receive `standard`
- eligible authenticated information-paradox requests receive `scientific`
- explicit five-paper requests receive `research`
- quota exhaustion and quota-store failure receive `standard` with distinct downgrade reasons
- unhealthy strong provider lowers research to scientific or standard
- insufficient remaining latency lowers the budget

- [ ] **Step 2: Add failing deadline tests**

Use a fake clock to verify stage starts, elapsed timing, remaining time, model-call caps, source caps, reviewer-pass cap, and ordered degradation reasons.

- [ ] **Step 3: Run the test and confirm failure**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-review-budget.test.ts`  
Expected: FAIL because budget modules are missing.

- [ ] **Step 4: Implement immutable budget presets and selection**

Use the approved maximums: minimal 6 seconds/1 call/2 sources/0 reviewers; standard 15 seconds/3/6/1; scientific 30 seconds/4/10/1; research 40 seconds/5/14/1. Return a decision with review mode, budget, eligibility, and safe downgrade reason.

- [ ] **Step 5: Implement latency controller**

Expose `canStartStage`, `recordStage`, `consumeModelCall`, `limitSources`, `degrade`, and `snapshot`. Use the injected clock rather than `Date.now()` inside policy tests.

- [ ] **Step 6: Run tests**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-review-budget.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit budget policy**

```bash
git add src/lib/ai/review/review-budget.ts src/lib/ai/review/latency-budget.ts tests/hybrid-review-budget.test.ts
git commit -m "feat: route adaptive scientific review budgets"
```

---

### Task 4: Implement Intent Planning And Domain-Aware Source Authority

**Files:**
- Create: `src/lib/ai/review/research-plan.ts`
- Create: `src/lib/ai/review/source-authority.ts`
- Test: `tests/hybrid-source-authority.test.ts`

**Interfaces:**
- Consumes: `QueryAssessment`, `ConversationContext`, existing retrieval query expansion, normalized `RankedSource`
- Produces:
  - `buildDeterministicResearchPlan(input: ResearchPlanInput): ResearchPlan`
  - `parseResearchPlan(text: string, fallback: ResearchPlan): ResearchPlan`
  - `rankSourcesForPlan(plan: ResearchPlan, sources: RankedSource[], now: Date): RankedSource[]`

- [ ] **Step 1: Add failing plan tests**

Assert the information-paradox plan includes Hawking radiation, unitarity, Page time, island calculations, and verification targets without adding unrelated concepts. Assert current Artemis status uses `freshnessRequirement: "live"` and official/mission evidence types.

- [ ] **Step 2: Add failing authority tests**

Fixtures must prove:

- a fresh official Artemis update outranks an older broad paper for current status
- Hawking/Page foundational papers outrank a newer institutional explainer for theoretical history
- a directly relevant peer-reviewed paper outranks an unrelated official page
- stale or metadata-poor sources are penalized
- DOI/arXiv/URL/title duplicates collapse before final ranking

- [ ] **Step 3: Run and confirm failure**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-source-authority.test.ts`  
Expected: FAIL because planning and authority modules are missing.

- [ ] **Step 4: Implement deterministic plan and strict parser**

Build subquestions and evidence types from the assessment and context. Parse optional model JSON by validating every field, cap arrays, and fall back wholesale to the deterministic plan on malformed output.

- [ ] **Step 5: Implement domain-aware ranking**

Calculate a bounded composite from relevance, authority-for-intent, evidence fit, freshness fit, metadata integrity, and duplicate penalties. Keep the scoring profile local to the plan rather than assigning one universal provider rank.

- [ ] **Step 6: Run scholarly regressions**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-source-authority.test.ts tests/scholarly-retrieval.test.ts tests/source-quality.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit planning and authority ranking**

```bash
git add src/lib/ai/review/research-plan.ts src/lib/ai/review/source-authority.ts tests/hybrid-source-authority.test.ts
git commit -m "feat: plan research and rank domain authority"
```

---

### Task 5: Implement Evidence, Claims, Citations, Confidence, And Critic

**Files:**
- Create: `src/lib/ai/review/evidence-matrix.ts`
- Create: `src/lib/ai/review/claim-extractor.ts`
- Create: `src/lib/ai/review/claim-evidence.ts`
- Create: `src/lib/ai/review/citation-validator.ts`
- Create: `src/lib/ai/review/confidence.ts`
- Create: `src/lib/ai/review/scientific-review.ts`
- Create: `src/lib/ai/review/response-critic.ts`
- Create: `src/lib/ai/review/quality-gate.ts`
- Test: `tests/hybrid-evidence-review.test.ts`

**Interfaces:**
- Consumes: `ResearchPlan`, ranked sources, draft text, optional structured model outputs
- Produces:
  - `buildEvidenceMatrix(plan, sources): EvidenceMatrix`
  - `extractClaims(draft, sourceIds): ExtractedClaim[]`
  - `matchClaimsToEvidence(claims, matrix, sources): ClaimEvidenceMatch[]`
  - `validateCitations(draft, claims, matches, sources): CitationValidationResult`
  - `calculateConfidence(inputs): ConfidenceAssessment`
  - `parseScientificReview(text): ScientificReviewResult`
  - `criticizeResponse(input): ResponseCriticResult`
  - `runQualityGate(input): QualityGateResult`

- [ ] **Step 1: Add failing evidence and conflict tests**

Create source fixtures with agreeing and conflicting conclusions. Assert source IDs are preserved, conflicts are explicit, unsupported targets remain unsupported, and aggregate confidence drops under conflict.

- [ ] **Step 2: Add failing claim and citation tests**

Assert:

- sentence-level claims are extracted without headings or pure opinion
- visible labels map only to retrieved source IDs
- invented DOI, author, and citation label are rejected
- a citation attached to an unrelated claim is marked unsupported
- duplicate citations are removed
- no raw provider retrieval ID appears in output

- [ ] **Step 3: Add failing critic and gate tests**

Use an answer missing “Page time” to verify missing-subquestion detection. Use repeated paragraphs, overconfident disputed language, unsupported conclusions, and excessive length fixtures. Assert a high-severity issue fails the gate and a narrow evidence-limited answer passes after unsupported claims are removed.

- [ ] **Step 4: Run and confirm failure**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-evidence-review.test.ts`  
Expected: FAIL because review modules are missing.

- [ ] **Step 5: Implement deterministic evidence and claim fallbacks**

Build matrix items from plan verification targets and source metadata. Extract complete sentences containing externally verifiable assertions or citations. Do not infer support from provider name alone.

- [ ] **Step 6: Implement validation and confidence**

Calculate confidence from source quality, agreement, freshness fit, evidence strength, claim coverage, and contradiction penalty. Clamp the score and return only coarse levels plus wording guidance. Citation validation must remove rather than replace invalid references.

- [ ] **Step 7: Implement structured review parsers and gate**

Validate reviewer categories and correction instructions, cap issue counts, reject new source IDs, and ensure the critic cannot add facts. Gate on completeness, high-severity issues, citation validity, major claim support, uncertainty, repetition, and length.

- [ ] **Step 8: Run review and existing quality tests**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-evidence-review.test.ts tests/response-quality.test.ts tests/scientific-answer-policy.test.ts`  
Expected: PASS.

- [ ] **Step 9: Commit the quality core**

```bash
git add src/lib/ai/review/evidence-matrix.ts src/lib/ai/review/claim-extractor.ts src/lib/ai/review/claim-evidence.ts src/lib/ai/review/citation-validator.ts src/lib/ai/review/confidence.ts src/lib/ai/review/scientific-review.ts src/lib/ai/review/response-critic.ts src/lib/ai/review/quality-gate.ts tests/hybrid-evidence-review.test.ts
git commit -m "feat: verify scientific claims and response quality"
```

---

### Task 6: Add Bounded Internal Model Generation And Task Routing

**Files:**
- Create: `src/lib/ai/review/model-router.ts`
- Modify: `src/lib/ai/provider.ts`
- Modify: `src/lib/ai/groq.ts`
- Modify: `src/services/openai/chat.service.ts`
- Test: `tests/hybrid-orchestrator.test.ts`

**Interfaces:**
- Consumes: existing provider environment and fallback order
- Produces:
  - `generateAiText(input: ModelGenerationInput): Promise<ModelGenerationResult>` from provider abstraction
  - `createModelGateway(providerHealth): ModelGateway`
  - `resolveModelTask(task: ModelTask, budget: ReviewBudget): ModelTaskConfiguration`

- [ ] **Step 1: Add failing provider-contract tests**

Inject fake Groq/OpenAI-compatible fetch responses and assert timeout, abort propagation, output-token cap, low reviewer temperature, safe error classification, and provider fallback. Confirm no API key appears in thrown public errors or telemetry.

- [ ] **Step 2: Run and confirm failure**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-orchestrator.test.ts`  
Expected: FAIL because `generateAiText` and model routing do not exist.

- [ ] **Step 3: Implement provider non-streaming adapters**

Reuse existing request construction and prompts, but request a complete bounded response for internal stages. Preserve `streamAiChatResponse()` unchanged for compatibility. Normalize provider errors into redacted categories.

- [ ] **Step 4: Implement task configurations**

Map classification/planning/extraction/review to economical low-temperature settings and deep draft/final edit to the strongest configured existing provider. Enforce each budget’s call cap before invocation.

- [ ] **Step 5: Run provider and security tests**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-orchestrator.test.ts tests/security.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit model routing**

```bash
git add src/lib/ai/review/model-router.ts src/lib/ai/provider.ts src/lib/ai/groq.ts src/services/openai/chat.service.ts tests/hybrid-orchestrator.test.ts
git commit -m "feat: route bounded review model tasks"
```

---

### Task 7: Add Atomic Supabase Deep-Review Usage

**Files:**
- Create: `supabase/migrations/20260720_hybrid_scientific_review.sql`
- Modify: `supabase/schema.sql`
- Modify: `src/utils/supabase/server.ts`
- Create: `src/lib/ai/review/review-usage.ts`
- Test: `tests/hybrid-review-usage.test.ts`

**Interfaces:**
- Consumes: authenticated Supabase access token and server-trusted session user
- Produces:
  - `createSupabaseReviewUsageStore(accessToken: string): ReviewUsageStore`
  - RPCs `reserve_ai_deep_review`, `complete_ai_deep_review`, and `release_ai_deep_review`

- [ ] **Step 1: Add failing state-machine tests**

Use an in-memory fake with the exact store contract to assert:

- five successful requests are allowed
- sixth request is denied and reports zero remaining
- UTC date change resets availability
- active reservations count against concurrent capacity
- failure, timeout, cancellation, and release do not increment success
- duplicate reserve and complete are idempotent
- expired reservations stop occupying capacity
- storage failure is distinguishable from quota exhaustion

- [ ] **Step 2: Run and confirm failure**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-review-usage.test.ts`  
Expected: FAIL because usage store does not exist.

- [ ] **Step 3: Write migration tables and RLS**

Create `ai_daily_usage` and `ai_review_requests` exactly as specified. Revoke direct mutation from `anon` and `authenticated`; permit only own-row reads if needed. Add non-negative counts, status/budget checks, indexes, and unique `(user_id, request_id)`.

- [ ] **Step 4: Write transactional RPCs**

Each security-definer function must set `search_path = public`, require `auth.uid()`, accept no user ID, derive UTC date in SQL, use a per-user/date advisory lock, expire stale reservations, and return a stable typed JSON row. Grant execute only to `authenticated`.

- [ ] **Step 5: Mirror SQL in canonical schema**

Apply the same idempotent definitions to `supabase/schema.sql` so fresh deployments and migrations agree.

- [ ] **Step 6: Add typed server RPC helpers**

Call `/rest/v1/rpc/<function>` with the current user’s access token. Validate response shape before returning it. Do not add a service-role environment variable.

- [ ] **Step 7: Implement store adapter and fake**

Translate RPC results into `ReviewUsageDecision`. Treat network, shape, and database errors as `storage-unavailable`, allowing the router to fail closed to standard review.

- [ ] **Step 8: Run tests and SQL safety checks**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-review-usage.test.ts tests/security.test.ts`  
Expected: PASS.

Run: `npm run security:check`  
Expected: PASS with no new exposed secret or unsafe SQL grant finding.

- [ ] **Step 9: Commit quota storage**

```bash
git add supabase/migrations/20260720_hybrid_scientific_review.sql supabase/schema.sql src/utils/supabase/server.ts src/lib/ai/review/review-usage.ts tests/hybrid-review-usage.test.ts
git commit -m "feat: enforce atomic deep review allowance"
```

---

### Task 8: Implement Telemetry And The Review Orchestrator

**Files:**
- Create: `src/lib/ai/review/telemetry.ts`
- Create: `src/lib/ai/review/orchestrator.ts`
- Modify: `tests/hybrid-orchestrator.test.ts`

**Interfaces:**
- Consumes: all modules from Tasks 1-7 through `ReviewDependencies`
- Produces:
  - `createReviewOrchestrator(deps: ReviewDependencies): ReviewOrchestrator`
  - `ReviewOrchestrator.run(input: ReviewOrchestratorInput): Promise<ReviewedAnswer>`

- [ ] **Step 1: Add failing direct and fast-path tests**

Assert direct path uses one model call and deterministic checks. Assert standard path retrieves only when required, drafts, performs one compact review, corrects at most once, and returns source cards unchanged.

- [ ] **Step 2: Add failing deep-path tests**

Assert the exact stage order:

```text
assessment -> planning -> reservation -> retrieval -> ranking -> evidence -> draft -> claims -> matching -> scientific review -> critic -> quality gate -> optional final edit
```

Assert independent retrieval starts before either provider settles. Assert deep path is impossible without auth and reservation.

- [ ] **Step 3: Add failure/degradation tests**

Cover provider timeout, one retrieval provider failure, malformed review JSON, insufficient evidence, quota exhaustion, quota-store failure, cancellation, hard deadline, and one-correction maximum. Verify every case records safe degradation metadata.

- [ ] **Step 4: Run and confirm failure**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-orchestrator.test.ts`  
Expected: FAIL because orchestrator is missing.

- [ ] **Step 5: Implement redacted telemetry**

Record request ID, auth class, query mode, budget, stage timings, provider task outcomes, source count, verdicts, confidence level, quota outcome, and failure category. Reject payload fields named `prompt`, `messages`, `answer`, `accessToken`, `apiKey`, or raw IP.

- [ ] **Step 6: Implement orchestrator composition**

Use one request-scoped latency controller. Check call/time budgets before each optional model stage. Pass only bounded plan/evidence packets to models. Combine scientific and critic review when degradation requires it. Return a reservation handle but do not commit inside `run()`.

- [ ] **Step 7: Implement correction and narrow fallback**

Aggregate correction instructions from claim matching, citation validation, scientific review, and critic. Perform one final edit only. Re-run deterministic validation; if it fails, remove unsupported claims and return an explicit evidence-limited answer.

- [ ] **Step 8: Run orchestrator and retrieval regressions**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-orchestrator.test.ts tests/retrieval.test.ts tests/scholarly-retrieval.test.ts`  
Expected: PASS.

- [ ] **Step 9: Commit orchestration**

```bash
git add src/lib/ai/review/telemetry.ts src/lib/ai/review/orchestrator.ts tests/hybrid-orchestrator.test.ts
git commit -m "feat: orchestrate adaptive scientific review"
```

---

### Task 9: Stream Reviewed Answers And Finalize Quota Safely

**Files:**
- Create: `src/lib/ai/review/reviewed-stream.ts`
- Test: `tests/hybrid-reviewed-stream.test.ts`

**Interfaces:**
- Consumes: `ReviewedAnswer`, `ReviewUsageStore`, request abort signal, existing `encodeSourceCardsHeader()` and text chunker
- Produces: `createReviewedResponse(input: ReviewedResponseInput): Response`

- [ ] **Step 1: Add failing stream tests**

Assert:

- only final reviewed text appears in stream chunks
- source-card header decodes to current card shape
- client-safe metadata headers contain no internal scores or reviewer text
- successful full stream commits once
- repeated close does not commit twice
- cancel and abort release once
- stream error releases and redacts error details
- no reservation produces no quota RPC call

- [ ] **Step 2: Run and confirm failure**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-reviewed-stream.test.ts`  
Expected: FAIL because reviewed stream does not exist.

- [ ] **Step 3: Implement final text stream**

Use the existing chunking behavior to preserve visible streaming. Close only after all chunks are enqueued. Keep completion and release guarded by one terminal-state variable and idempotent store operations.

- [ ] **Step 4: Implement cancellation and metadata headers**

Listen to both request abort and stream cancellation. Include request ID, query mode, review mode, budget level, remaining deep reviews, confidence level, degraded flag, model status, and existing source-card headers. Exclude internal confidence score and degradation stack details unsuitable for users.

- [ ] **Step 5: Run stream and response-quality tests**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-reviewed-stream.test.ts tests/response-quality.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit reviewed streaming**

```bash
git add src/lib/ai/review/reviewed-stream.ts tests/hybrid-reviewed-stream.test.ts
git commit -m "feat: stream only reviewed answers"
```

---

### Task 10: Integrate The Thin API Route

**Files:**
- Modify: `src/app/api/ai/chat/route.ts`
- Modify: `src/components/assistant/cosmos-assistant.tsx`
- Modify: `tests/hybrid-orchestrator.test.ts`
- Modify: `tests/hybrid-reviewed-stream.test.ts`

**Interfaces:**
- Consumes: `createReviewOrchestrator()` and `createReviewedResponse()`
- Produces: existing `/api/ai/chat` request and response contract plus client-safe review metadata

- [ ] **Step 1: Add route-boundary integration tests**

Test validated request mapping, authenticated session token forwarding, guest behavior, same-origin rejection, existing rate-limit behavior, source-card headers, abort signal forwarding, and redacted errors. Assert no client-provided user ID or review mode can choose deep review.

- [ ] **Step 2: Run and confirm the new tests fail**

Run: `node --test --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/hybrid-orchestrator.test.ts tests/hybrid-reviewed-stream.test.ts tests/security.test.ts`  
Expected: FAIL because the active route still uses inline generation.

- [ ] **Step 3: Extract route-owned context adapters**

Keep same-origin, body parsing, message/context validation, auth, actor hashing, distributed rate limits, and public error responses in the route. Reuse current NASA/tool-context construction behind the injected retrieval gateway rather than copying it.

- [ ] **Step 4: Replace inline answer generation with one orchestrator call**

Construct dependencies after validation, call `orchestrator.run()` once, and pass the result to `createReviewedResponse()`. Retain existing GET model-status behavior. Remove only route code superseded by focused modules.

- [ ] **Step 5: Update safe progress copy**

While waiting for the first reviewed chunk, rotate existing lightweight loading text through “Understanding your question,” “Searching trusted sources,” “Comparing evidence,” “Reviewing scientific accuracy,” and “Finalising the answer.” Do not display stage internals or redesign the chat.

- [ ] **Step 6: Run AI, security, and UI type regressions**

Run: `npm run test`  
Expected: all tests PASS.

Run: `npm run typecheck`  
Expected: PASS.

- [ ] **Step 7: Commit route integration**

```bash
git add src/app/api/ai/chat/route.ts src/components/assistant/cosmos-assistant.tsx tests/hybrid-orchestrator.test.ts tests/hybrid-reviewed-stream.test.ts
git commit -m "feat: integrate reviewed Ask COSMOS pipeline"
```

---

### Task 11: Expand Offline Evaluation And Regression Coverage

**Files:**
- Modify: `scripts/eval-cosmos.ts`
- Modify: `package.json`
- Create: `outputs/evals/hybrid-review-results.json` by running the evaluation
- Create: `outputs/evals/hybrid-review-report.md` by running the evaluation

**Interfaces:**
- Consumes: classifier, budget router, planner, source ranker, evidence/quality gates, fake quota and model gateways
- Produces: `npm run eval:cosmos` with separate guest-fast, authenticated-fast, authenticated-deep, and quota-exhausted sections

- [ ] **Step 1: Add the eight new test files to `npm test`**

Keep existing test files and append the hybrid suites. Do not replace or skip current security and scholarly tests.

- [ ] **Step 2: Add deterministic evaluation scenarios**

Evaluate at least the seven mandatory prompts under guest and authenticated states, plus the sixth deep request, quota-store failure, provider timeout, retrieval conflict, malformed citation, and conversational follow-up.

- [ ] **Step 3: Add report metrics**

Calculate classification accuracy, deep-routing precision/recall, citation validity, source relevance, unsupported-claim rate, contradiction disclosure, concept coverage, false-premise correction, repetition, deterministic stage latency, model-call estimate, quota outcomes, and degradation outcomes.

- [ ] **Step 4: Run the evaluation**

Run: `npm run eval:cosmos`  
Expected: exit code 0, both hybrid output files created, zero hard failures.

- [ ] **Step 5: Inspect generated reports**

Verify reports contain separate guest fast, authenticated fast, authenticated deep, and quota-exhausted sections; contain no secrets, complete prompts beyond the fixed public benchmark set, or fabricated live latency claims.

- [ ] **Step 6: Commit evaluation changes**

```bash
git add package.json scripts/eval-cosmos.ts outputs/evals/hybrid-review-results.json outputs/evals/hybrid-review-report.md
git commit -m "test: evaluate hybrid scientific review"
```

---

### Task 12: Document Deployment And Migration Requirements

**Files:**
- Modify: `README.md`
- Modify: `PROJECT_STATUS.md`

**Interfaces:**
- Consumes: completed architecture and actual command outputs
- Produces: operational instructions for applying migration and verifying quota/review behavior

- [ ] **Step 1: Update architecture documentation**

Document review modes, budget levels, guest/auth behavior, five-success quota, failure downgrade, reviewed-only streaming, existing provider requirements, and internal confidence behavior.

- [ ] **Step 2: Document migration actions**

State that `supabase/migrations/20260720_hybrid_scientific_review.sql` must be applied before deep review is enabled. Explain that an unapplied or unavailable quota store safely downgrades to standard review.

- [ ] **Step 3: Document environment variables**

List only environment names actually read by the final code. Do not add a service-role key. Preserve existing Groq/OpenAI-compatible, NASA, Supabase, distributed rate-limit, OpenAlex, and CORE documentation.

- [ ] **Step 4: Add production smoke checklist**

Include guest simple/advanced, authenticated simple/advanced, scholarly sources, false premise, current mission, sixth request, failed deep request, duplicate request ID, follow-up, provider timeout, source-card rendering, streaming, and auto-scroll checks.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md PROJECT_STATUS.md
git commit -m "docs: document hybrid scientific review"
```

---

### Task 13: Full Verification And Production Readiness Decision

**Files:**
- Verify all files above
- Update generated evaluation outputs only through their script

**Interfaces:**
- Consumes: complete implementation
- Produces: evidence for the required 35-item final report and one readiness conclusion

- [ ] **Step 1: Run lint**

Run: `npm run lint`  
Expected: exit code 0 with no lint errors.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`  
Expected: exit code 0.

- [ ] **Step 3: Run tests**

Run: `npm run test`  
Expected: exit code 0; all existing and hybrid tests pass.

- [ ] **Step 4: Run security verification**

Run: `npm run security:check`  
Expected: exit code 0; no secret exposure, unsafe route, or SQL grant failure.

- [ ] **Step 5: Run hybrid evaluation**

Run: `npm run eval:cosmos`  
Expected: exit code 0; zero hard failures in `outputs/evals/hybrid-review-report.md`.

- [ ] **Step 6: Run production build**

Run: `npm run build`  
Expected: Next.js production build completes successfully.

- [ ] **Step 7: Review the working tree**

Run: `git status --short` and `git diff --check`  
Expected: no whitespace errors; all changed files are expected. Do not revert unrelated pre-existing changes.

- [ ] **Step 8: Perform local route smoke tests when environment variables are available**

Start the production server and verify `/ask`, `/api/ai/chat`, `/account`, and existing source cards. Exercise one guest fast request and one authenticated deep request only when a safe test account and configured quota migration are available. Do not claim live quota behavior without this evidence.

- [ ] **Step 9: Produce the final report**

Report architecture, exact files, routing, budgets, guest/auth behavior, quota/migration, fast/deep stages, model routing, retrieval parallelism, evidence, claims, confidence, critic, citations, uncertainty, context, latency/degradation, telemetry, tests, evaluation metrics, model-call/cost implications, command results, environment names, migration action, limitations, and one approved readiness conclusion.

Use `CONDITIONALLY READY — COMPLETE LISTED CONFIGURATION FIRST` if the migration or live provider verification could not be completed. Use `READY FOR PRODUCTION TESTING` only when every mandatory command passes and required Supabase configuration is confirmed.

---

## Requirement Coverage Check

- Adaptive classifier: Tasks 2-3
- Intent/research planner: Task 4
- Dynamic `ReviewBudget`: Task 3
- Parallel retrieval and authority ranking: Tasks 4 and 8
- Evidence matrix: Task 5
- Claim extraction and matching: Task 5
- Internal confidence: Task 5
- Scientific/citation review: Task 5
- Final critic and deterministic gate: Task 5
- One correction maximum: Tasks 5 and 8
- Atomic five-success quota: Task 7
- Reviewed-only streaming and cancellation: Task 9
- Thin route integration: Task 10
- Progress states without hidden reasoning: Task 10
- Telemetry and safe caching behavior: Tasks 8 and 10; existing caches remain in place
- Full regression/evaluation: Tasks 11 and 13
- Documentation and migration guidance: Task 12

## Plan Self-Review

- **Spec coverage:** Every approved architecture stage and all mandatory acceptance criteria map to at least one task.
- **Placeholder scan:** The plan contains no deferred placeholders; optional live smoke testing is explicitly conditioned on available credentials and migration state.
- **Type consistency:** `ReviewBudget`, `ReviewDependencies`, `ReviewUsageStore`, `ReviewOrchestratorInput`, `ReviewedAnswer`, and response metadata names match the design specification.
- **Scope:** The plan is one cohesive request pipeline. It excludes billing, workers, UI redesign, new providers, and unrelated API changes.

