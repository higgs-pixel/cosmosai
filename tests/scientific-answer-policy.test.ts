import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeScientificQuestion,
  buildInformationParadoxFallbackAnswer,
  buildScientificAnswerPolicy,
  getScientificResponseBudget,
} from "../src/lib/ai/scientific-answer-policy.ts";
import { getFoundationalResearchSources } from "../src/lib/retrieval/foundational-literature.ts";
import { expandRetrievalQuery } from "../src/lib/retrieval/query-expansion.ts";
import { rankSources, selectHighQualitySources } from "../src/lib/retrieval/relevance-score.ts";

const BLACK_HOLE_PROMPT =
  "Explain the black hole information paradox, including Hawking radiation, unitarity, and the major proposed resolutions.";

test("advanced information-paradox questions receive complete scientific coverage", () => {
  const analysis = analyzeScientificQuestion(BLACK_HOLE_PROMPT, "research", "researcher");
  const policy = buildScientificAnswerPolicy(analysis);
  const budget = getScientificResponseBudget(analysis);

  assert.equal(analysis.isAdvanced, true);
  assert.deepEqual(analysis.sections, [
    "Direct answer",
    "Physical setup",
    "Why the paradox arises",
    "Key concepts",
    "Major proposed resolutions",
    "Current scientific status",
    "Sources and evidence",
    "Remaining uncertainty",
  ]);

  for (const concept of [
    "Hawking radiation",
    "approximately thermal radiation",
    "pure and mixed quantum states",
    "unitarity",
    "entanglement across the event horizon",
    "black-hole evaporation",
    "Page curve",
    "Page time",
    "information recovery",
    "holography / AdS-CFT",
    "black-hole complementarity",
    "AMPS firewall proposal",
    "quantum extremal surfaces",
    "replica wormholes",
    "island formula",
    "remnants or non-unitary alternatives",
  ]) {
    assert.ok(analysis.requiredConcepts.includes(concept), `Missing required concept: ${concept}`);
  }

  assert.match(policy, /650-1100 words/i);
  assert.match(policy, /classical general relativity hides information behind the horizon/i);
  assert.match(policy, /established result[\s\S]*strong theoretical evidence[\s\S]*leading proposal[\s\S]*disputed proposal[\s\S]*speculative possibility/i);
  assert.match(policy, /Never write[\s\S]*Research source 1/i);
  assert.ok(budget.maxOutputTokens >= 1_800);
  assert.ok(budget.maxStreamedCharacters >= 9_000);
});

test("provider fallback still gives a substantive information-paradox explanation", () => {
  const answer = buildInformationParadoxFallbackAnswer();

  for (const concept of [
    "pure state",
    "mixed state",
    "unitarity",
    "Page curve",
    "Page time",
    "complementarity",
    "AdS/CFT",
    "firewall",
    "quantum extremal surface",
    "replica-wormhole",
    "remnant",
  ]) {
    assert.match(answer, new RegExp(concept, "i"));
  }
  assert.ok(answer.split(/\s+/).length >= 650);
  assert.doesNotMatch(answer, /Research sources?\s+\d/i);
});

test("information-paradox retrieval prioritizes transparent foundational literature", () => {
  const foundational = getFoundationalResearchSources(BLACK_HOLE_PROMPT);
  const ranked = selectHighQualitySources(
    rankSources(expandRetrievalQuery(BLACK_HOLE_PROMPT), [
      ...foundational,
      {
        id: "niche-analogy",
        title: "A cognitive analogy for information processing",
        abstract: "A perception study using a loose black-hole metaphor.",
        provider: "OpenAlex",
        year: 2026,
        url: "https://example.test/niche",
        sourceClass: "specialist-application",
      },
    ]),
    8,
  );

  assert.ok(foundational.length >= 8);
  assert.ok(ranked.length >= 5);
  assert.ok(ranked.slice(0, 5).every((source) => source.sourceClass !== "specialist-application"));
  assert.ok(ranked.some((source) => /Hawking/i.test(source.authors?.join(" ") ?? "")));
  assert.ok(ranked.some((source) => /Page/i.test(source.authors?.join(" ") ?? "")));
  assert.ok(ranked.some((source) => /Complementarity/i.test(source.title)));
  assert.ok(ranked.some((source) => /Firewalls/i.test(source.title)));
  assert.ok(ranked.some((source) => /Page Curve|Entropy of Bulk Quantum Fields/i.test(source.title)));

  for (const source of ranked) {
    assert.match(source.citationLabel ?? "", /^\[[^\]]+\]$/);
    assert.doesNotMatch(source.citationLabel ?? "", /Research source/i);
    assert.ok(source.relevanceReason.length > 20);
  }
});
