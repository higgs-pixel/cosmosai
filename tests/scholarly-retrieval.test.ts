import assert from "node:assert/strict";
import test from "node:test";
import { parseResearchRequest } from "../src/lib/retrieval/research-request.ts";
import { createScholarlyQueryPlan, selectPrimaryQueryVariants } from "../src/lib/retrieval/scholarly-query-plan.ts";
import { runScholarlyProviders } from "../src/lib/retrieval/scholarly-provider-runner.ts";
import {
  deduplicateScholarlyPapers,
  normalizeScholarlyPaper,
  normalizeScholarlyTitle,
  validateScholarlyPaper,
  type ScholarlyPaper,
} from "../src/lib/retrieval/scholarly-paper.ts";
import {
  rankSources,
  selectScholarlySourceSet,
  validateCitationSourceMapping,
  type SourceCandidate,
} from "../src/lib/retrieval/relevance-score.ts";
import { expandRetrievalQuery } from "../src/lib/retrieval/query-expansion.ts";
import { formatScholarlySelectionResponse } from "../src/lib/retrieval/scholarly-response.ts";

const NOW = new Date("2026-07-19T12:00:00.000Z");

function candidate(overrides: Partial<SourceCandidate> = {}): SourceCandidate {
  const result: SourceCandidate = {
    id: "paper-1",
    title: "Atmospheric biosignatures on temperate exoplanets",
    abstract: "We evaluate atmospheric biosignature gases and false positives for life detection on temperate exoplanets.",
    authors: ["A. Researcher"],
    year: 2025,
    publishedAt: "2025-04-10",
    provider: "OpenAlex",
    source: "Astrophysical Journal",
    url: "https://doi.org/10.1234/cosmos.2025.1",
    doi: "10.1234/cosmos.2025.1",
    paperType: "journal-article",
    isPeerReviewed: true,
    isPreprint: false,
    isRetracted: false,
    citationCount: 24,
    sourceProviders: ["OpenAlex"],
    ...overrides,
  };
  if (overrides.id && !("doi" in overrides)) {
    result.doi = `10.1234/${overrides.id}`;
    result.url = `https://doi.org/10.1234/${overrides.id}`;
  }
  return result;
}

test("parses scholarly intent, exact topic, dates, paper types, and requested count", () => {
  const recent = parseResearchRequest(
    "Give me five recent papers on exoplanet atmospheric biosignatures. For each, explain why it is directly relevant.",
    NOW,
  );
  assert.equal(recent.mode, "recent");
  assert.equal(recent.topic, "exoplanet atmospheric biosignatures");
  assert.equal(recent.startYear, 2023);
  assert.equal(recent.resultCount, 5);
  assert.equal(recent.sortPreference, "balanced");
  assert.ok(recent.requiredConcepts.includes("biosignatures"));

  const foundational = parseResearchRequest("Give me five foundational papers on the black hole information paradox.", NOW);
  assert.equal(foundational.mode, "foundational");
  assert.equal(foundational.topic, "black hole information paradox");
  assert.equal(foundational.startYear, undefined);
  assert.equal(foundational.sortPreference, "citation-impact");

  const constrained = parseResearchRequest(
    "Give me five peer-reviewed papers published after 2023 on dark-matter direct detection. No review papers.",
    NOW,
  );
  assert.equal(constrained.topic, "dark-matter direct detection");
  assert.equal(constrained.startYear, 2024);
  assert.equal(constrained.peerReviewedOnly, true);
  assert.equal(constrained.preprintsAllowed, false);
  assert.ok(!constrained.paperTypes.includes("review"));
  assert.ok(constrained.excludedConcepts.includes("review"));

  const systematic = parseResearchRequest("Give me systematic reviews on astronomy education.", NOW);
  assert.equal(systematic.mode, "systematic-review");
  assert.deepEqual(systematic.paperTypes, ["review"]);

  const doiLookup = parseResearchRequest("10.1103/PhysRevLett.71.3743", NOW);
  assert.equal(doiLookup.topic, "10.1103/PhysRevLett.71.3743");
});

test("creates bounded, purpose-specific query variants without broadening the exact topic", () => {
  const plan = createScholarlyQueryPlan(
    parseResearchRequest("Give me five foundational papers on the black hole information paradox.", NOW),
  );

  assert.equal(plan.variants[0].query, "black hole information paradox");
  assert.equal(plan.variants[0].purpose, "exact-phrase");
  assert.ok(plan.variants.some((variant) => /Information in Black Hole Radiation|Page curve/i.test(variant.query)));
  assert.ok(plan.variants.some((variant) => variant.query === "black hole complementarity"));
  assert.ok(plan.variants.length <= 9);
  assert.ok(!plan.variants.some((variant) => variant.query === "black holes"));
  assert.deepEqual(plan.providers.slice(0, 2), ["arXiv", "OpenAlex"]);

  const reviewPlan = createScholarlyQueryPlan(
    parseResearchRequest("Give me the best review papers on gravitational lensing.", NOW),
  );
  assert.deepEqual(selectPrimaryQueryVariants(reviewPlan).map((variant) => variant.purpose), ["exact-phrase", "review"]);
  const foundationalVariants = selectPrimaryQueryVariants(plan);
  assert.equal(foundationalVariants[0].purpose, "exact-phrase");
  assert.ok(foundationalVariants.length >= 5);
  assert.ok(foundationalVariants.length <= 6);
  assert.ok(foundationalVariants.some((variant) => /Information in Black Hole Radiation|page curve/i.test(variant.query)));
  assert.ok(foundationalVariants.some((variant) => /complementarity|firewall/i.test(variant.query)));
  assert.ok(foundationalVariants.some((variant) => /large n limit|holograph|ads cft/i.test(variant.query)));
  assert.ok(foundationalVariants.some((variant) => /island|wormhole/i.test(variant.query)));
});

test("normalises and verifies provider metadata without inventing identifiers", () => {
  const normalized = normalizeScholarlyPaper({
    title: "  A Test of $\\Lambda$ Cosmology  ",
    authors: ["Ada Astronomer"],
    year: 2024,
    source: "Physical Review D",
    summary: "A directly relevant abstract.",
    doi: "https://doi.org/10.1103/PhysRevD.1.2",
    url: "https://doi.org/10.1103/PhysRevD.1.2",
    provider: "OpenAlex",
    paperType: "journal-article",
    isPeerReviewed: true,
    openAlexId: "W123",
  });

  assert.ok(normalized);
  assert.equal(normalized?.doi, "10.1103/PhysRevD.1.2");
  assert.equal(normalized?.openAlexId, "W123");
  assert.equal(normalized?.arxivId, undefined);
  assert.equal(normalized?.sourceProviders[0], "OpenAlex");
  assert.equal(validateScholarlyPaper(normalized!).valid, true);

  const malformed = normalizeScholarlyPaper({
    title: "Untitled research work",
    authors: [],
    year: 3026,
    doi: "not-a-doi",
    url: "javascript:alert(1)",
    provider: "CORE",
  });
  assert.equal(malformed, null);
});

test("merges journal and preprint versions using DOI, arXiv ID, and fuzzy title evidence", () => {
  const journal: ScholarlyPaper = {
    ...normalizeScholarlyPaper({
      title: "Searching for Biosignatures in Exoplanet Atmospheres",
      authors: ["Jane Doe", "John Roe"],
      year: 2025,
      source: "Nature Astronomy",
      summary: "A journal study of atmospheric biosignatures.",
      doi: "10.1234/bio.1",
      url: "https://doi.org/10.1234/bio.1",
      provider: "OpenAlex",
      paperType: "journal-article",
      isPeerReviewed: true,
      sourceProviders: ["OpenAlex"],
    })!,
    arxivId: "2501.01234",
  };
  const preprint = normalizeScholarlyPaper({
    title: "Searching for biosignatures in exoplanet atmospheres v2",
    authors: ["Jane Doe", "John Roe"],
    year: 2024,
    summary: "The open preprint abstract contains more detail.",
    arxivId: "2501.01234v2",
    url: "https://arxiv.org/abs/2501.01234v2",
    provider: "arXiv",
    paperType: "preprint",
    isPreprint: true,
    isPeerReviewed: false,
  })!;

  const merged = deduplicateScholarlyPapers([journal, preprint]);
  assert.equal(merged.papers.length, 1);
  assert.equal(merged.duplicateCount, 1);
  assert.equal(merged.papers[0].doi, "10.1234/bio.1");
  assert.equal(merged.papers[0].arxivId, "2501.01234");
  assert.deepEqual(merged.papers[0].sourceProviders.sort(), ["OpenAlex", "arXiv"]);
  assert.equal(merged.papers[0].isPeerReviewed, true);

  const authorFormatDuplicate = normalizeScholarlyPaper({
    title: "Searching for Biosignatures in Exoplanet Atmospheres",
    authors: ["Doe, J.", "Roe, J."],
    year: 2025,
    summary: "The repository version of the same work.",
    url: "https://example.org/repository/biosignatures",
    provider: "CORE",
    paperType: "journal-article",
  })!;
  const formattedMerge = deduplicateScholarlyPapers([journal, authorFormatDuplicate]);
  assert.equal(formattedMerge.papers.length, 1);
  assert.equal(formattedMerge.duplicateCount, 1);
});

test("hard relevance rejects keyword-only, tangential, retracted, malformed, and constraint-mismatched papers", () => {
  const profile = expandRetrievalQuery(
    "Give me five peer-reviewed papers published after 2023 on dark-matter direct detection.",
  );
  const ranked = rankSources(profile, [
    candidate({
      id: "direct",
      title: "New constraints from a dark-matter direct-detection experiment",
      abstract: "We report a direct-detection search for WIMP nuclear recoils and detector limits.",
      year: 2025,
      doi: "10.1234/dm.direct",
      url: "https://doi.org/10.1234/dm.direct",
    }),
    candidate({
      id: "tangential",
      title: "Recent machine-learning methods for particle physics",
      abstract: "Dark matter is mentioned once as background; the objective is generic classifier optimisation.",
      year: 2026,
      citationCount: 5000,
    }),
    candidate({
      id: "old",
      title: "Dark-matter direct detection in xenon",
      abstract: "A direct detector search.",
      year: 2021,
    }),
    candidate({
      id: "preprint",
      title: "Dark-matter direct detection with novel sensors",
      abstract: "A direct detector search.",
      year: 2025,
      paperType: "preprint",
      isPreprint: true,
      isPeerReviewed: false,
      doi: undefined,
      arxivId: "2501.00001",
      url: "https://arxiv.org/abs/2501.00001",
    }),
    candidate({
      id: "retracted",
      title: "Dark-matter direct detection result",
      abstract: "A direct detector search.",
      year: 2025,
      isRetracted: true,
    }),
  ]);
  const result = selectScholarlySourceSet(profile, ranked, { limit: 5, requiresDirectSources: true });

  assert.deepEqual(result.sources.map((source) => source.id), ["direct"]);
  assert.ok(result.rejections.some((item) => item.id === "tangential" && item.reasons.includes("below_direct_relevance_threshold")));
  assert.ok(result.rejections.some((item) => item.id === "old" && item.reasons.includes("outside_requested_date_range")));
  assert.ok(result.rejections.some((item) => item.id === "preprint" && item.reasons.includes("peer_review_required")));
  assert.ok(result.rejections.some((item) => item.id === "retracted" && item.reasons.includes("retracted")));
  assert.ok(result.qualityIssues.includes("fewer_sources_met_direct_relevance_threshold"));
});

test("mode-aware ranking favours recency, landmarks, or reviews according to the request", () => {
  const recentProfile = expandRetrievalQuery("Give me five recent papers on Mars biosignatures.");
  const recentRanked = rankSources(recentProfile, [
    candidate({ id: "recent", title: "Mars biosignatures in Jezero crater", abstract: "Mars biosignature preservation is the central objective.", year: 2026, citationCount: 2 }),
    candidate({ id: "older", title: "Mars biosignatures and habitability", abstract: "Mars biosignatures are the central objective.", year: 2023, citationCount: 500 }),
  ]);
  assert.equal(recentRanked[0].id, "recent");

  const foundationalProfile = expandRetrievalQuery("Give me foundational papers on the black hole information paradox.");
  const foundationalRanked = rankSources(foundationalProfile, [
    candidate({ id: "landmark", title: "Information in Black Hole Radiation", abstract: "Unitary evaporation and radiation entropy establish the Page curve.", authors: ["Don N. Page"], year: 1993, foundationalPriority: 1, sourceClass: "foundational", citationCount: 4000 }),
    candidate({ id: "new", title: "Black hole information paradox in a toy model", abstract: "A recent specialist calculation.", year: 2026, citationCount: 1 }),
  ]);
  assert.equal(foundationalRanked[0].id, "landmark");

  const reviewProfile = expandRetrievalQuery("Give me the best review papers on gravitational lensing.");
  const reviewResult = selectScholarlySourceSet(reviewProfile, rankSources(reviewProfile, [
    candidate({ id: "review", title: "Gravitational lensing: a review", abstract: "We review strong and weak gravitational lensing across cosmology.", paperType: "review", year: 2024, citationCount: 300 }),
    candidate({ id: "article", title: "A gravitational lensing measurement", abstract: "We report one lensing measurement.", paperType: "journal-article", year: 2025, citationCount: 600 }),
  ]), { limit: 3, requiresDirectSources: true });
  assert.deepEqual(reviewResult.sources.map((source) => source.id), ["review"]);
});

test("source-set and citation gates never pad weak results or accept invented labels", () => {
  const profile = expandRetrievalQuery("Give me five recent papers on exoplanet atmospheric biosignatures.");
  const ranked = rankSources(profile, [
    candidate({ id: "strong-1" }),
    candidate({ id: "strong-2", title: "Exoplanet atmospheric biosignatures and false positives", doi: "10.1234/cosmos.2025.2", url: "https://doi.org/10.1234/cosmos.2025.2" }),
    candidate({ id: "weak", title: "A telescope calibration catalogue", abstract: "Instrument calibration unrelated to biosignatures.", citationCount: 9000 }),
  ]);
  const result = selectScholarlySourceSet(profile, ranked, { limit: 5, requiresDirectSources: true });

  assert.equal(result.sources.length, 2);
  assert.ok(result.qualityIssues.includes("fewer_sources_met_direct_relevance_threshold"));
  const validText = `${result.sources[0].citationLabel} reports directly relevant evidence.`;
  assert.equal(validateCitationSourceMapping(validText, result.sources).valid, true);
  assert.equal(validateCitationSourceMapping("A result [Invented 2026].", result.sources).valid, false);
});

test("provider orchestration preserves partial results and reports bounded failures", async () => {
  const plan = createScholarlyQueryPlan(parseResearchRequest("Give me recent papers on Mars biosignatures.", NOW));
  const result = await runScholarlyProviders(plan, {
    OpenAlex: async () => [candidate({ id: "openalex-live" })],
    arXiv: async () => {
      throw new Error("upstream details must not escape");
    },
    CORE: async () => [],
  }, 100);

  assert.equal(result.allProvidersFailed, false);
  assert.equal(result.records.length, 1);
  assert.equal(result.statuses.OpenAlex.status, "success");
  assert.equal(result.statuses.arXiv.status, "failed");
  assert.equal(result.statuses.arXiv.reason, "provider_error");
  assert.equal(result.statuses.CORE.status, "empty");

  const allFailed = await runScholarlyProviders(plan, {
    OpenAlex: async () => { throw new Error("no"); },
    arXiv: async () => { throw new Error("no"); },
    CORE: async () => new Promise(() => undefined),
  }, 10);
  assert.equal(allFailed.allProvidersFailed, true);
  assert.equal(allFailed.statuses.CORE.reason, "timeout");
});

test("adversarial metadata and query shapes remain bounded and verifiable", () => {
  const broad = parseResearchRequest("Give me recent papers on astronomy.", NOW);
  const narrow = parseResearchRequest(
    "Give me papers on magnetically arrested accretion disks in M87*.",
    NOW,
  );
  assert.equal(broad.topic, "astronomy");
  assert.equal(narrow.topic, "magnetically arrested accretion disks in M87*");
  assert.equal(createScholarlyQueryPlan(broad).variants.length <= 9, true);
  assert.equal(createScholarlyQueryPlan(narrow).variants[0].query, narrow.topic);

  const unicode = normalizeScholarlyPaper({
    title: "Evolucion de galaxias a alto corrimiento al rojo",
    authors: ["Maria Alvarez"],
    year: 2025,
    abstract: "Estudiamos galaxias distantes con observaciones verificables.",
    url: "https://example.org/papers/galaxias",
    provider: "CORE",
    paperType: "journal-article",
    isPeerReviewed: true,
  });
  assert.ok(unicode);
  assert.equal(normalizeScholarlyTitle("The $\\Lambda$-CDM Model v2"), "lambda cdm model");

  const malformed = normalizeScholarlyPaper({
    title: "Malformed provider result",
    authors: [],
    year: 1500,
    doi: "definitely-not-a-doi",
    url: "file:///private/paper.pdf",
    provider: "CORE",
  });
  assert.equal(malformed, null);
});

test("a relevant-looking title cannot override a contradictory abstract", () => {
  const profile = expandRetrievalQuery(
    "Give me five peer-reviewed papers published after 2023 on dark-matter direct detection.",
  );
  const ranked = rankSources(profile, [
    candidate({
      id: "complete-evidence",
      title: "Dark-matter direct detection with xenon recoils",
      abstract: "We report a dark-matter direct-detection experiment and derive recoil limits.",
    }),
    candidate({
      id: "contradictory-abstract",
      title: "Dark-matter direct detection with machine learning",
      abstract: "We optimise a general image classifier. Astronomy is included only as a demonstration dataset.",
      citationCount: 5_000,
    }),
    candidate({
      id: "missing-abstract",
      title: "Dark-matter direct detection constraints",
      abstract: undefined,
      citationCount: 2_000,
    }),
    candidate({
      id: "abstract-passing-mention",
      title: "A temporal model of dark matter",
      abstract: "We study a temporal dark-matter model. Direct detection is mentioned as one possible implication.",
      citationCount: 3_000,
    }),
  ]);
  const result = selectScholarlySourceSet(profile, ranked, { limit: 5, requiresDirectSources: true });

  assert.equal(result.sources[0].id, "complete-evidence");
  assert.ok(result.rejections.some((item) =>
    item.id === "contradictory-abstract" && item.reasons.includes("below_direct_relevance_threshold"),
  ));
  assert.ok(result.rejections.some((item) =>
    item.id === "abstract-passing-mention" && item.reasons.includes("below_direct_relevance_threshold"),
  ));
  assert.ok(ranked.find((paper) => paper.id === "missing-abstract")!.score < ranked.find((paper) => paper.id === "complete-evidence")!.score);
});

test("controlled scientific synonyms recover direct papers without broadening the topic", () => {
  const profile = expandRetrievalQuery(
    "Give me five recent papers on exoplanet atmospheric biosignatures.",
  );
  const ranked = rankSources(profile, [
    candidate({
      id: "habitable-world-biosignature",
      title: "Biosignature detectability on transiting habitable worlds",
      abstract: `${"Instrument context. ".repeat(50)} We present an atmospheric simulation and detection pipeline for biosignature gases on transiting exoplanets.`,
      paperType: "preprint",
      isPeerReviewed: false,
      isPreprint: true,
      doi: undefined,
      arxivId: "2607.01234",
      url: "https://arxiv.org/abs/2607.01234",
      year: 2026,
    }),
  ]);
  const result = selectScholarlySourceSet(profile, ranked, { limit: 5, requiresDirectSources: true });

  assert.deepEqual(result.sources.map((paper) => paper.id), ["habitable-world-biosignature"]);
  assert.equal(result.sources[0].matchLevel, "direct");
});

test("author reputation and review labels cannot substitute for topic centrality", () => {
  const foundational = expandRetrievalQuery(
    "Give me five foundational papers on the black hole information paradox.",
  );
  const foundationalResult = selectScholarlySourceSet(foundational, rankSources(foundational, [
    candidate({
      id: "author-only",
      title: "A bound on chaos",
      abstract: "We derive a general bound on quantum chaos with applications to thermal systems.",
      authors: ["Juan Maldacena", "Stephen Shenker", "Douglas Stanford"],
      year: 2016,
      citationCount: 8_000,
    }),
  ]), { limit: 5, requiresDirectSources: true });
  assert.equal(foundationalResult.sources.length, 0);

  const mars = expandRetrievalQuery("Give me recent papers on Mars biosignatures.");
  const marsResult = selectScholarlySourceSet(mars, rankSources(mars, [
    candidate({
      id: "unrelated-review",
      title: "Review of cross-medium multi-rotor aerial robots: smart structural perspectives",
      abstract: "This review classifies aerial robot structures and control systems for terrestrial engineering.",
      paperType: "review",
      citationCount: 1_200,
    }),
  ]), { limit: 5, requiresDirectSources: true });
  assert.equal(marsResult.sources.length, 0);
});

test("benchmark vocabulary alone cannot turn a later specialist paper into foundational literature", () => {
  const profile = expandRetrievalQuery(
    "Give me five foundational papers on the black hole information paradox.",
  );
  const result = selectScholarlySourceSet(profile, rankSources(profile, [
    candidate({
      id: "later-specialist",
      title: "Extreme Test of Quantum Theory with Black Holes",
      abstract: "We propose a hidden-variable experiment motivated by black-hole information loss.",
      authors: ["A. Specialist"],
      year: 2004,
      citationCount: 300,
      paperType: "preprint",
      isPreprint: true,
      isPeerReviewed: false,
    }),
    candidate({
      id: "page-foundation",
      title: "Information in Black Hole Radiation",
      abstract: "We calculate the entropy of Hawking radiation under unitary black-hole evaporation.",
      authors: ["Don N. Page"],
      year: 1993,
      citationCount: 4_000,
      paperType: "journal-article",
      isPreprint: false,
      isPeerReviewed: true,
    }),
  ]), { limit: 5, requiresDirectSources: true });

  assert.deepEqual(result.sources.map((paper) => paper.id), ["page-foundation"]);
  assert.match(result.sources[0].relevanceReason, /radiation entropy|unitary evaporation/i);
  assert.ok(result.rejections.some((item) =>
    item.id === "later-specialist" && item.reasons.includes("foundational_authority_required"),
  ));
});

test("a DOI alone does not prove peer review", () => {
  const repositoryRecord = normalizeScholarlyPaper({
    title: "A repository protocol for direct detection",
    authors: ["Protocol Author"],
    year: 2026,
    source: "Zenodo",
    doi: "10.5281/zenodo.1234567",
    url: "https://doi.org/10.5281/zenodo.1234567",
    provider: "OpenAlex",
  });
  assert.ok(repositoryRecord);
  assert.equal(repositoryRecord?.isPeerReviewed, false);
});

test("no-model scholarly fallback enumerates only the approved paper set", () => {
  const profile = expandRetrievalQuery("Give me five foundational papers on the black hole information paradox.");
  const papers = selectScholarlySourceSet(profile, rankSources(profile, [
    candidate({
      id: "page-fallback",
      title: "Information in Black Hole Radiation",
      abstract: "We calculate radiation entropy for unitary black-hole evaporation.",
      authors: ["Don N. Page"],
      year: 1993,
      doi: "10.1103/physrevlett.71.3743",
      url: "https://doi.org/10.1103/physrevlett.71.3743",
      foundationalPriority: 1,
    }),
  ]), { limit: 5, requiresDirectSources: true }).sources;
  const response = formatScholarlySelectionResponse(profile, papers, 5);

  assert.match(response, /Information in Black Hole Radiation/);
  assert.match(response, /10\.1103\/physrevlett\.71\.3743/);
  assert.match(response, /Why selected/);
  assert.match(response, /Only 1 paper met/);
  assert.doesNotMatch(response, /Wikipedia|Research source \d/i);
});
