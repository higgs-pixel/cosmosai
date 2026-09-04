import assert from "node:assert/strict";
import test from "node:test";
import { classifyCosmosQuery } from "../src/lib/ai/query-intent.ts";
import { buildIntentResponsePolicy } from "../src/lib/ai/response-quality-policy.ts";
import { assessGeneratedResponse, createCitationIntegrityFilter } from "../src/lib/ai/response-quality.ts";
import { getAuthoritativeEvidence } from "../src/lib/ai/authoritative-evidence.ts";
import { chunkTextForStream } from "../src/lib/ai/text-stream.ts";

test("fallback streaming preserves long scientific words without dropping characters", () => {
  const text = "I could not find papers that met the direct-relevance and metadata-verification threshold.";
  const chunks = chunkTextForStream(text, 18);

  assert.equal(chunks.join(""), text);
  assert.ok(chunks.every((chunk) => chunk.length <= 18));
});

test("false-premise policy separates Mars evidence categories and requires verification guidance", () => {
  const intent = classifyCosmosQuery("Why did NASA confirm that aliens built structures on Mars?");
  const policy = buildIntentResponsePolicy(intent);
  const evidence = getAuthoritativeEvidence(intent);

  assert.match(policy, /correct the unsupported premise immediately/i);
  for (const concept of [
    "pareidolia",
    "artificial structures",
    "intelligent extraterrestrial life",
    "microbial life",
    "habitability",
    "organic molecules",
    "biosignatures",
  ]) {
    assert.match(policy, new RegExp(concept, "i"));
  }
  assert.ok(evidence.length >= 3);
  assert.ok(evidence.every((source) => /^(https:\/\/)?(?:www\.)?(?:science\.)?nasa\.gov|^https:\/\/www\.jpl\.nasa\.gov/.test(source.url)));
});

test("citation filter preserves mapped labels and removes invented labels across stream chunks", () => {
  const filter = createCitationIntegrityFilter(["[Page 1993]"]);
  const output = [
    filter.push("Page entropy [Pa"),
    filter.push("ge 1993]; invented claim [Made"),
    filter.push("up 2026]."),
    filter.flush(),
  ].join("");

  assert.match(output, /\[Page 1993\]/);
  assert.doesNotMatch(output, /Madeup 2026/);
});

test("response quality checker catches repetition, anonymous sources, and unmapped citations", () => {
  const assessment = assessGeneratedResponse(
    "The result remains uncertain.\n\nThe result remains uncertain. Research sources 1-8 support this. [Invented 2026]",
    ["[Hawking 1976]"],
  );

  assert.equal(assessment.hasRepeatedParagraphs, true);
  assert.equal(assessment.hasAnonymousResearchSources, true);
  assert.deepEqual(assessment.unmappedCitationLabels, ["[Invented 2026]"]);
  assert.equal(assessment.passed, false);
});
