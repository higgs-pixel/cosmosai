import assert from "node:assert/strict";
import test from "node:test";
import { expandRetrievalQuery } from "../src/lib/retrieval/query-expansion.ts";
import {
  deduplicateRankedSources,
  rankSources,
  selectHighQualitySources,
  type SourceCandidate,
} from "../src/lib/retrieval/relevance-score.ts";

test("preserves and expands black hole information paradox queries", () => {
  const profile = expandRetrievalQuery("black hole information paradox");

  assert.equal(profile.originalQuery, "black hole information paradox");
  assert.ok(profile.exactQueries.includes("black hole information paradox"));
  assert.ok(profile.exactQueries.includes('"black hole information paradox"'));
  assert.ok(profile.expandedQueries.includes("Hawking radiation information loss"));
  assert.notDeepEqual(profile.exactQueries, ["black hole"]);
  assert.equal(profile.topicType, "research");
  assert.deepEqual(profile.providerPriority.slice(0, 3), ["arXiv", "OpenAlex", "CORE"]);
});

test("routes APOD, Mars images, and stargazing weather to focused providers", () => {
  const apod = expandRetrievalQuery("today's APOD");
  const mars = expandRetrievalQuery("Mars rover images");
  const weather = expandRetrievalQuery("weather for stargazing tonight in Gwalior");

  assert.equal(apod.providerPriority[0], "NASA APOD");
  assert.deepEqual(mars.providerPriority.slice(0, 2), ["NASA Mars Rover", "NASA Image Library"]);
  assert.deepEqual(weather.providerPriority.slice(0, 4), ["7Timer", "Open-Meteo", "Weatherstack", "PurpleAir"]);
});

test("direct information-paradox papers outrank generic black-hole sources", () => {
  const profile = expandRetrievalQuery("black hole information paradox");
  const sources: SourceCandidate[] = [
    {
      id: "generic",
      title: "An introduction to black holes",
      abstract: "A broad overview of black-hole formation and observations.",
      provider: "NASA",
      year: 2026,
      url: "https://example.test/black-holes",
    },
    {
      id: "direct",
      title: "The black hole information paradox and unitarity",
      abstract: "We review Hawking radiation, information loss, and quantum-gravity proposals for unitary evaporation.",
      provider: "arXiv",
      year: 2020,
      arxivId: "2001.00001",
      url: "https://arxiv.org/abs/2001.00001",
    },
  ];

  const ranked = rankSources(profile, sources);
  assert.equal(ranked[0].id, "direct");
  assert.equal(ranked[0].matchLevel, "direct");
  assert.ok(ranked[0].score > ranked[1].score);
  assert.match(ranked[0].relevanceReason, /information paradox|unitarity/i);
});

test("deduplicates equivalent papers by DOI, arXiv ID, title, and canonical URL", () => {
  const profile = expandRetrievalQuery("black hole information paradox");
  const ranked = rankSources(profile, [
    {
      id: "openalex-copy",
      title: "Black Hole Information Paradox",
      abstract: "A direct treatment of information loss.",
      provider: "OpenAlex",
      doi: "https://doi.org/10.1000/COSMOS.1",
      url: "https://doi.org/10.1000/COSMOS.1",
    },
    {
      id: "core-copy",
      title: "Black Hole Information Paradox",
      abstract: "A direct treatment of information loss and unitarity.",
      provider: "CORE",
      doi: "10.1000/cosmos.1",
      url: "https://core.ac.uk/works/1",
    },
  ]);

  assert.equal(deduplicateRankedSources(ranked).length, 1);
});

test("returns fewer strong sources instead of filling with generic background", () => {
  const profile = expandRetrievalQuery("black hole information paradox");
  const ranked = rankSources(profile, Array.from({ length: 8 }, (_, index) => ({
    id: `generic-${index}`,
    title: `Black hole overview ${index}`,
    abstract: "General astronomy background.",
    provider: "NASA",
    url: `https://example.test/${index}`,
  })));

  const selected = selectHighQualitySources(ranked, 8);
  assert.ok(selected.length <= 3);
  assert.ok(selected.every((source) => source.matchLevel !== "direct"));
});
