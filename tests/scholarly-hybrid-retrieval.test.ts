import assert from "node:assert/strict";
import test from "node:test";
import { GOLDEN_RESEARCH_CORPUS } from "./fixtures/golden-research-corpus.ts";
import {
  createInMemoryScholarlyIndex,
  retrieveFromScholarlyIndex,
} from "../src/lib/retrieval/scholarly-index.ts";
import {
  classifyRetrievalOutcome,
  createSafeRetrievalMessage,
  retrieveHybridScholarlySources,
} from "../src/lib/retrieval/hybrid-retrieval.ts";
import {
  normalizeScholarlyLookupQuery,
} from "../src/lib/retrieval/scholarly-query-normalizer.ts";
import {
  checkResearchIntegrity,
} from "../src/lib/retrieval/research-integrity.ts";

const store = createInMemoryScholarlyIndex(GOLDEN_RESEARCH_CORPUS);
const PAGE_ID = "page-information-radiation-1993";

async function topId(query: string) {
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery(query), store, { limit: 5 });
  return result.sources[0]?.paper.id;
}

test("exact title retrieves the stored paper", async () => {
  assert.equal(await topId("Information in Black Hole Radiation"), PAGE_ID);
});

test("title matching is case insensitive", async () => {
  assert.equal(await topId("INFORMATION IN BLACK HOLE RADIATION"), PAGE_ID);
});

test("title matching ignores punctuation", async () => {
  assert.equal(await topId("Information in Black-Hole Radiation!"), PAGE_ID);
});

test("partial title retrieves the paper", async () => {
  assert.equal(await topId("Black Hole Radiation"), PAGE_ID);
});

test("DOI URL form retrieves the paper", async () => {
  assert.equal(await topId("https://doi.org/10.1103/PhysRevLett.71.3743"), PAGE_ID);
});

test("bare DOI retrieves the paper", async () => {
  assert.equal(await topId("10.1103/PhysRevLett.71.3743"), PAGE_ID);
});

test("full author name retrieves the correct paper", async () => {
  assert.equal(await topId("papers by Don N. Page"), PAGE_ID);
});

test("author surname retrieves relevant papers", async () => {
  assert.equal(await topId("Page black hole paper"), PAGE_ID);
});

test("topic query retrieves the stored paper", async () => {
  assert.equal(await topId("black hole information paradox"), PAGE_ID);
});

test("synonym query retrieves the stored paper", async () => {
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery("Hawking information loss"), store);
  assert.ok(result.sources.some((source) =>
    source.paper.id === PAGE_ID || source.paper.id === "hawking-particle-creation-1975"
  ));
});

test("acronym query retrieves the stored paper", async () => {
  assert.equal(await topId("IR social construction of anarchy"), "wendt-anarchy-1992");
});

test("natural-language description retrieves the stored paper", async () => {
  assert.equal(await topId("paper explaining when information returns during black-hole evaporation"), PAGE_ID);
});

test("technical terminology retrieves the stored paper", async () => {
  assert.equal(await topId("Page time radiation entropy unitarity"), PAGE_ID);
});

test("minor spelling variation does not create a false negative", async () => {
  assert.equal(await topId("black hole informtion paradox"), PAGE_ID);
});

test("exact metadata match overrides a weak semantic score", async () => {
  const result = await retrieveHybridScholarlySources("10.1103/PhysRevLett.71.3743", {
    store,
    semanticCandidates: [],
    semanticStatus: "failed",
  });
  assert.equal(result.sources[0]?.paper.id, PAGE_ID);
  assert.ok(result.sources[0]?.paths.includes("doi"));
});

test("a relevant lexical match is not discarded when semantic retrieval is empty", async () => {
  const result = await retrieveHybridScholarlySources("Page curve information recovery", {
    store,
    semanticCandidates: [],
    semanticStatus: "success",
  });
  assert.equal(result.sources[0]?.paper.id, PAGE_ID);
  assert.ok(result.sources[0]?.paths.includes("lexical"));
});

test("missing optional metadata does not exclude a relevant paper", async () => {
  const sparse = createInMemoryScholarlyIndex([
    {
      ...GOLDEN_RESEARCH_CORPUS[1],
      abstract: undefined,
      concepts: undefined,
      keywords: undefined,
    },
  ]);
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery("Information in Black Hole Radiation"), sparse);
  assert.equal(result.sources[0]?.paper.id, PAGE_ID);
});

test("an explicit year filter is hard", async () => {
  const result = await retrieveFromScholarlyIndex(
    normalizeScholarlyLookupQuery("black hole information papers published in 1975"),
    store,
  );
  assert.ok(result.sources.every((source) => source.paper.year === 1975));
});

test("an inferred recency preference is not a hard filter", async () => {
  const result = await retrieveFromScholarlyIndex(
    normalizeScholarlyLookupQuery("important black hole information research"),
    store,
  );
  assert.ok(result.sources.some((source) => source.paper.id === PAGE_ID));
});

test("an irrelevant high-citation paper is rejected", async () => {
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery("black hole information paradox"), store);
  assert.ok(!result.sources.some((source) => source.paper.id === "vaswani-attention-2017"));
});

test("duplicate DOI records are merged", async () => {
  const duplicateStore = createInMemoryScholarlyIndex([
    GOLDEN_RESEARCH_CORPUS[1],
    { ...GOLDEN_RESEARCH_CORPUS[1], id: "page-duplicate", provider: "OpenAlex" },
  ]);
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery("10.1103/PhysRevLett.71.3743"), duplicateStore);
  assert.equal(result.sources.length, 1);
  assert.equal(result.diagnostics.duplicateCount, 1);
});

test("duplicate normalized titles are merged", async () => {
  const duplicateStore = createInMemoryScholarlyIndex([
    GOLDEN_RESEARCH_CORPUS[0],
    {
      ...GOLDEN_RESEARCH_CORPUS[0],
      id: "hawking-title-duplicate",
      doi: undefined,
      title: "Particle creation by black-holes",
      provider: "OpenAlex",
    },
  ]);
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery("Particle Creation by Black Holes"), duplicateStore);
  assert.equal(result.sources.length, 1);
});

test("stale embedding versions are detected when a vector index is configured", () => {
  const report = checkResearchIntegrity(GOLDEN_RESEARCH_CORPUS, {
    chunks: [{ id: "chunk-1", paperId: PAGE_ID }],
    embeddings: [{ id: "embedding-1", chunkId: "chunk-1", dimension: 3, version: "legacy", vector: [1, 0, 0] }],
    expectedEmbeddingDimension: 3,
    expectedEmbeddingVersion: "current",
  });
  assert.ok(report.failures.some((failure) => failure.code === "stale_embedding_version"));
});

test("missing embeddings are detected when vectors are configured", () => {
  const report = checkResearchIntegrity(GOLDEN_RESEARCH_CORPUS, {
    chunks: [{ id: "chunk-1", paperId: PAGE_ID }],
    embeddings: [],
    expectedEmbeddingDimension: 3,
    expectedEmbeddingVersion: "current",
  });
  assert.ok(report.failures.some((failure) => failure.code === "chunk_without_embedding"));
});

test("missing chunks are detected when chunking is configured", () => {
  const report = checkResearchIntegrity(GOLDEN_RESEARCH_CORPUS, {
    chunks: [],
    embeddings: [],
    expectedEmbeddingDimension: 3,
    expectedEmbeddingVersion: "current",
  });
  assert.ok(report.failures.some((failure) => failure.code === "document_without_chunks"));
});

test("orphaned vectors are detected", () => {
  const report = checkResearchIntegrity(GOLDEN_RESEARCH_CORPUS, {
    chunks: [],
    embeddings: [{ id: "embedding-1", chunkId: "missing", dimension: 3, version: "current", vector: [1, 0, 0] }],
    expectedEmbeddingDimension: 3,
    expectedEmbeddingVersion: "current",
  });
  assert.ok(report.failures.some((failure) => failure.code === "orphaned_embedding"));
});

test("a paper retrieved but omitted from context is diagnosable", async () => {
  const result = await retrieveHybridScholarlySources("black hole information paradox", {
    store,
    contextPaperIds: [],
  });
  assert.ok(result.diagnostics.retrievedPaperIds.includes(PAGE_ID));
  assert.ok(result.diagnostics.contextOmissions.includes(PAGE_ID));
});

test("a paper in context but omitted from answer is diagnosable", async () => {
  const result = await retrieveHybridScholarlySources("black hole information paradox", {
    store,
    contextPaperIds: [PAGE_ID],
    citedPaperIds: [],
  });
  assert.ok(result.diagnostics.answerOmissions.includes(PAGE_ID));
});

test("no relevant paper returns a truthful empty result", async () => {
  const result = await retrieveHybridScholarlySources("marine archaeology pottery", { store });
  assert.equal(result.status, "not-found");
  assert.match(createSafeRetrievalMessage(result), /no qualifying stored or provider record/i);
});

test("an existing paper never produces a false unavailable claim", async () => {
  const result = await retrieveHybridScholarlySources("black hole research", { store });
  assert.equal(result.status, "found");
  assert.ok(result.sources.length > 0);
  assert.doesNotMatch(createSafeRetrievalMessage(result), /unavailable|database lacks|do not have papers/i);
});

test("query variants return stable top results", async () => {
  const queries = [
    "research papers on black holes",
    "papers about black-hole physics",
    "studies on event horizons",
    "black hole research",
    "Hawking information loss",
    "Page curve information recovery",
  ];
  const topSets = await Promise.all(queries.map(async (query) => {
    const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery(query), store, { limit: 3 });
    return result.sources.map((source) => source.paper.id);
  }));
  assert.ok(topSets.every((ids) => ids.some((id) => id === PAGE_ID || id === "hawking-particle-creation-1975")));
});

test("a transient semantic-store failure uses lexical fallback", async () => {
  const result = await retrieveHybridScholarlySources("black hole information paradox", {
    store,
    semanticStatus: "failed",
  });
  assert.equal(result.status, "found");
  assert.equal(result.diagnostics.paths.lexical, "success");
});

test("lexical fallback works when vector retrieval fails", async () => {
  const result = await retrieveHybridScholarlySources("radiation entropy information recovery", {
    store,
    semanticStatus: "failed",
  });
  assert.equal(result.sources[0]?.paper.id, PAGE_ID);
});

test("exact lookup works when semantic retrieval fails", async () => {
  const result = await retrieveHybridScholarlySources("Information in Black Hole Radiation", {
    store,
    semanticStatus: "failed",
  });
  assert.equal(result.sources[0]?.paper.id, PAGE_ID);
  assert.ok(result.sources[0]?.paths.includes("exact-title"));
});

test("metadata filters are present in diagnostic mode", async () => {
  const result = await retrieveHybridScholarlySources("Page papers from 1993 in Physical Review Letters", { store });
  assert.equal(result.diagnostics.appliedFilters.year, 1993);
  assert.match(result.diagnostics.appliedFilters.journal ?? "", /physical review letters/i);
});

test("user-visible retrieval messages never expose internal diagnostics", () => {
  const outcome = classifyRetrievalOutcome({
    selectedCount: 0,
    exactStatus: "success",
    lexicalStatus: "failed",
    semanticStatus: "failed",
    providerStatus: "failed",
  });
  const message = createSafeRetrievalMessage({ status: outcome });
  assert.equal(outcome, "incomplete");
  assert.doesNotMatch(message, /score|vector|candidate id|filter|stack|provider_error/i);
});

test("the golden black-hole query matrix retrieves stored papers without irrelevant astronomy", async () => {
  const queries = [
    "research papers on black holes",
    "papers about black-hole physics",
    "studies on event horizons",
    "black hole research",
    "Information in Black Hole Radiation",
    "Don N. Page",
    "10.1103/PhysRevLett.71.3743",
    "paper explaining information recovery during black-hole evaporation",
    "Page time",
  ];

  for (const query of queries) {
    const result = await retrieveHybridScholarlySources(query, { store });
    assert.equal(result.status, "found", query);
    assert.ok(result.sources.some((source) =>
      source.paper.id === PAGE_ID || source.paper.id === "hawking-particle-creation-1975"
    ), query);
    assert.ok(!result.sources.some((source) => source.paper.id === "riess-accelerating-universe-1998"), query);
    assert.doesNotMatch(createSafeRetrievalMessage(result), /research is unavailable|do not have papers/i);
  }
});
