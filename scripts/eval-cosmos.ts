import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { classifyCosmosQuery } from "../src/lib/ai/query-intent.ts";
import { buildIntentResponsePolicy } from "../src/lib/ai/response-quality-policy.ts";
import { assessGeneratedResponse } from "../src/lib/ai/response-quality.ts";
import { getAuthoritativeEvidence } from "../src/lib/ai/authoritative-evidence.ts";
import { getFoundationalResearchSources } from "../src/lib/retrieval/foundational-literature.ts";
import { expandRetrievalQuery } from "../src/lib/retrieval/query-expansion.ts";
import { rankSources, selectScholarlySourceSet } from "../src/lib/retrieval/relevance-score.ts";

const prompts = [
  "Explain the black hole information paradox, including Hawking radiation, unitarity, and the major proposed resolutions.",
  "Why did NASA confirm that aliens built structures on Mars?",
  "Give me five peer-reviewed or preprint sources specifically about the black hole information paradox. For each, explain why it is relevant.",
  "What existed before the Big Bang?",
  "What is the latest status of NASA's Artemis programme?",
  "Give me five sources on dark-matter direct detection",
  "Give me five sources on exoplanet atmospheric biosignatures",
  "Give me five sources on Mars sample-return science",
  "Give me five sources on quantum gravity and black-hole entropy",
  "Why did JWST prove the Big Bang was wrong?",
  "Why did NASA hide evidence of life on Mars?",
  "What can I observe tonight in Gwalior?",
  "Search NASA images of the Pillars of Creation",
  "Compare Venus and Earth",
];

const results = prompts.map((prompt) => {
  const startedAt = performance.now();
  const intent = classifyCosmosQuery(prompt);
  const profile = expandRetrievalQuery(prompt);
  const retrievalStartedAt = performance.now();
  const candidates = getFoundationalResearchSources(prompt);
  const ranked = rankSources(profile, candidates);
  const sourceSet = selectScholarlySourceSet(profile, ranked, {
    limit: intent.requestedSourceCount ?? 8,
    requiresDirectSources: intent.requiresDirectSources || intent.mode === "scholarly-sources",
  });
  const retrievalLatencyMs = Math.round((performance.now() - retrievalStartedAt) * 100) / 100;
  const policy = buildIntentResponsePolicy(intent);
  const evidence = getAuthoritativeEvidence(intent);
  const quality = assessGeneratedResponse(policy, sourceSet.sources.map((source) => source.citationLabel ?? ""));
  const hardFailures: string[] = [];

  if (intent.mode === "false-premise" && evidence.length === 0) hardFailures.push("missing_authoritative_evidence_packet");
  if (prompt.includes("black hole information paradox") && intent.mode === "scholarly-sources" && sourceSet.sources.length < 5) {
    hardFailures.push("black_hole_source_set_below_five");
  }
  if (sourceSet.sources.some((source) => source.sourceClass === "peripheral-context")) {
    hardFailures.push("peripheral_source_selected");
  }

  return {
    prompt,
    queryMode: intent.mode,
    generatedQueryVariants: [...profile.exactQueries, ...profile.expandedQueries],
    providersQueried: profile.providerPriority,
    retrievedSourceCount: sourceSet.retrievedCount,
    finalSourceCount: sourceSet.sources.length,
    filteredSourceCount: sourceSet.filteredCount,
    sourceClasses: sourceSet.sources.map((source) => source.sourceClass),
    sourceScores: sourceSet.sources.map((source) => ({ title: source.title, score: source.score })),
    citationIntegrityStatus: quality.unmappedCitationLabels.length === 0 ? "passed" : "failed",
    authoritativeEvidenceCount: evidence.length,
    responseLatencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
    retrievalLatencyMs,
    providerUsed: "development-policy-evaluation",
    hardFailures,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  evaluationType: "offline deterministic policy and retrieval evaluation",
  promptCount: results.length,
  hardFailureCount: results.reduce((count, result) => count + result.hardFailures.length, 0),
  results,
};

mkdirSync("outputs/evals", { recursive: true });
writeFileSync("outputs/evals/ask-cosmos-results.json", `${JSON.stringify(summary, null, 2)}\n`, "utf8");

const table = results.map((result) =>
  `| ${result.queryMode} | ${result.finalSourceCount} | ${result.filteredSourceCount} | ${result.citationIntegrityStatus} | ${result.hardFailures.join(", ") || "None"} | ${result.prompt.replaceAll("|", "\\|")} |`,
).join("\n");
const report = [
  "# Ask COSMOS Development Evaluation",
  "",
  `Generated: ${summary.generatedAt}`,
  "",
  "This is an offline, deterministic evaluation of query classification, targeted query expansion, curated benchmark coverage, source-set quality gates, false-premise evidence routing, and citation-label integrity. It makes no paid model calls and logs no secrets.",
  "",
  `- Prompts: ${summary.promptCount}`,
  `- Hard failures: ${summary.hardFailureCount}`,
  "",
  "| Query mode | Final sources | Filtered | Citation integrity | Hard failures | Prompt |",
  "| --- | ---: | ---: | --- | --- | --- |",
  table,
  "",
].join("\n");
writeFileSync("outputs/evals/ask-cosmos-report.md", report, "utf8");

console.log(`Ask COSMOS evaluation complete: ${summary.promptCount} prompts, ${summary.hardFailureCount} hard failures.`);
