import assert from "node:assert/strict";
import test from "node:test";
import { getFoundationalResearchSources } from "../src/lib/retrieval/foundational-literature.ts";
import { expandRetrievalQuery } from "../src/lib/retrieval/query-expansion.ts";
import {
  rankSources,
  selectScholarlySourceSet,
  validateCitationSourceMapping,
  type SourceCandidate,
} from "../src/lib/retrieval/relevance-score.ts";

const SOURCE_PROMPT =
  "Give me five peer-reviewed or preprint sources specifically about the black hole information paradox. For each, explain why it is relevant.";

test("information-paradox expansion preserves exact phrasing and covers major resolution families", () => {
  const profile = expandRetrievalQuery(SOURCE_PROMPT);

  assert.equal(profile.originalQuery, SOURCE_PROMPT);
  for (const variant of [
    "black hole information paradox",
    "Page curve black hole",
    "black hole complementarity",
    "black hole firewall",
    "replica wormholes black hole",
    "island formula black hole",
  ]) {
    assert.ok(profile.expandedQueries.includes(variant), `Missing query variant: ${variant}`);
  }
});

test("quality gate produces a balanced, directly relevant black-hole source set", () => {
  const profile = expandRetrievalQuery(SOURCE_PROMPT);
  const peripheral: SourceCandidate = {
    id: "nonlinear-electrodynamics",
    title: "Nonperturbative Isentropic Processes in AdS Black Holes with Nonlinear Electrodynamics",
    abstract: "A thermodynamic study whose primary subject is nonlinear electrodynamics.",
    provider: "OpenAlex",
    year: 2026,
    url: "https://example.test/peripheral",
  };
  const result = selectScholarlySourceSet(
    profile,
    rankSources(profile, [...getFoundationalResearchSources(SOURCE_PROMPT), peripheral]),
    { limit: 5, requiresDirectSources: true },
  );

  assert.equal(result.sources.length, 5);
  assert.ok(result.sources.filter((source) => ["foundational", "landmark-development"].includes(source.sourceClass ?? "")).length >= 2);
  assert.ok(result.sources.some((source) => source.sourceClass === "modern-resolution"));
  assert.ok(result.sources.every((source) => source.sourceClass !== "peripheral-context"));
  assert.ok(result.sources.every((source) => source.isDirectMatch));
  assert.doesNotMatch(result.sources.map((source) => source.title).join(" "), /Nonperturbative Isentropic/i);
  assert.ok(result.sources.some((source) => source.benchmarkCategory === "page-curve"));
  assert.ok(result.sources.some((source) => source.benchmarkCategory === "holography"));
  assert.ok(result.sources.some((source) => source.benchmarkCategory === "island-replica"));
});

test("citation integrity maps prose labels only to retrieved records", () => {
  const sources = rankSources(
    expandRetrievalQuery("black hole information paradox"),
    getFoundationalResearchSources("black hole information paradox Hawking radiation unitarity"),
  );
  const valid = validateCitationSourceMapping(
    `Hawking evaporation creates the apparent conflict ${sources[0].citationLabel}.`,
    sources,
  );
  const invalid = validateCitationSourceMapping("A claim [Madeup 2026].", sources);

  assert.equal(valid.valid, true);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.unmappedLabels, ["[Madeup 2026]"]);
});

