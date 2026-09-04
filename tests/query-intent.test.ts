import assert from "node:assert/strict";
import test from "node:test";
import { classifyCosmosQuery } from "../src/lib/ai/query-intent.ts";

test("classifies advanced explanations separately from scholarly source requests", () => {
  assert.equal(
    classifyCosmosQuery("Explain the black hole information paradox, including Hawking radiation and unitarity.").mode,
    "advanced-scientific",
  );

  const sources = classifyCosmosQuery(
    "Give me five peer-reviewed or preprint sources specifically about the black hole information paradox.",
  );
  assert.equal(sources.mode, "scholarly-sources");
  assert.equal(sources.requestedSourceCount, 5);
  assert.equal(sources.requiresDirectSources, true);
});

test("detects unsupported-premise, mission, live-data, and uncertainty intents", () => {
  assert.equal(
    classifyCosmosQuery("Why did NASA confirm that aliens built structures on Mars?").mode,
    "false-premise",
  );
  assert.equal(
    classifyCosmosQuery("Why did JWST prove the Big Bang was wrong?").mode,
    "false-premise",
  );
  assert.equal(classifyCosmosQuery("What is the latest Artemis mission schedule?").mode, "current-mission");
  assert.equal(classifyCosmosQuery("What can I observe tonight in Gwalior?").mode, "live-data");
  assert.equal(classifyCosmosQuery("What existed before the Big Bang?").mode, "uncertain-science");
});

test("classifies additional source-evaluation prompts without losing their original topic", () => {
  for (const prompt of [
    "Give me five sources on dark-matter direct detection",
    "Give me five sources on exoplanet atmospheric biosignatures",
    "Give me five sources on Mars sample-return science",
    "Give me five sources on quantum gravity and black-hole entropy",
  ]) {
    const intent = classifyCosmosQuery(prompt);
    assert.equal(intent.mode, "scholarly-sources");
    assert.equal(intent.requestedSourceCount, 5);
    assert.equal(intent.originalQuery, prompt);
  }
});

test("classifies deterministic scholarly identifiers without requiring prompt keywords", () => {
  assert.equal(
    classifyCosmosQuery("10.1103/PhysRevLett.71.3743").mode,
    "scholarly-sources",
  );
  assert.equal(
    classifyCosmosQuery("https://doi.org/10.1007/BF02345020").mode,
    "scholarly-sources",
  );
  assert.equal(
    classifyCosmosQuery('paper titled "Information in Black Hole Radiation"').mode,
    "scholarly-sources",
  );
});
