import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { RESEARCH_BENCHMARKS } from "../tests/fixtures/research-benchmarks.ts";
import { parseResearchRequest } from "../src/lib/retrieval/research-request.ts";
import { createScholarlyQueryPlan } from "../src/lib/retrieval/scholarly-query-plan.ts";
import { expandRetrievalQuery } from "../src/lib/retrieval/query-expansion.ts";
import { rankSources, selectScholarlySourceSet, validateCitationSourceMapping } from "../src/lib/retrieval/relevance-score.ts";

const results = RESEARCH_BENCHMARKS.map((benchmark) => {
  const startedAt = performance.now();
  const request = parseResearchRequest(benchmark.query, new Date("2026-07-19T00:00:00.000Z"));
  const profile = expandRetrievalQuery(benchmark.query);
  profile.researchRequest = request;
  const plan = createScholarlyQueryPlan(request);
  const ranked = rankSources(profile, benchmark.candidates);
  const sourceSet = selectScholarlySourceSet(profile, ranked, {
    limit: request.resultCount,
    requiresDirectSources: true,
  });
  const citationText = sourceSet.sources.map((paper) => `${paper.citationLabel} ${paper.relevanceReason}`).join("\n");
  const citationIntegrity = validateCitationSourceMapping(citationText, sourceSet.sources);
  const dateValid = sourceSet.sources.every((paper) =>
    (!request.startYear || Boolean(paper.year && paper.year >= request.startYear)) &&
    (!request.endYear || Boolean(paper.year && paper.year <= request.endYear)),
  );
  const typeValid = sourceSet.sources.every((paper) => !paper.paperType || request.paperTypes.includes(paper.paperType));
  const peerReviewValid = !request.peerReviewedOnly || sourceSet.sources.every((paper) => paper.isPeerReviewed);
  const directValid = sourceSet.sources.every((paper) => paper.isDirectMatch && paper.matchLevel === "direct");
  const hardFailures = [
    request.mode !== benchmark.expectedMode ? "mode_mismatch" : undefined,
    sourceSet.sources.length < benchmark.minimumSelected ? "insufficient_strong_results" : undefined,
    !dateValid ? "date_constraint_failed" : undefined,
    !typeValid ? "paper_type_constraint_failed" : undefined,
    !peerReviewValid ? "peer_review_constraint_failed" : undefined,
    !directValid ? "direct_relevance_failed" : undefined,
    !citationIntegrity.valid ? "citation_integrity_failed" : undefined,
    sourceSet.sources.some((paper) => paper.isRetracted) ? "retracted_paper_selected" : undefined,
  ].filter((value): value is string => Boolean(value));

  return {
    query: benchmark.query,
    parsedIntent: request.mode,
    topic: request.topic,
    dateRange: { startYear: request.startYear, endYear: request.endYear },
    queryVariants: plan.variants,
    providerResults: Object.fromEntries(plan.providers.map((provider) => [provider, benchmark.candidates.filter((paper) => paper.provider === provider).length])),
    deduplicatedCount: sourceSet.deduplicatedCount,
    filteredCount: sourceSet.filteredCount,
    selectedPapers: sourceSet.sources.map((paper) => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      provider: paper.provider,
      paperType: paper.paperType,
      sourceClass: paper.sourceClass,
      relevanceScore: paper.score,
      relevanceReason: paper.relevanceReason,
      citationLabel: paper.citationLabel,
    })),
    sourceClasses: sourceSet.sources.map((paper) => paper.sourceClass),
    rejectionReasons: sourceSet.rejections,
    metadataCompleteness: sourceSet.sources.length === 0 ? 0 : sourceSet.sources.reduce((sum, paper) => sum + paper.relevanceFeatures.metadataConfidence, 0) / sourceSet.sources.length,
    citationIntegrity: citationIntegrity.valid,
    latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
    pass: hardFailures.length === 0,
    hardFailures,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  evaluationType: "offline deterministic scholarly-retrieval evaluation with labeled adversarial fixtures",
  benchmarkCount: results.length,
  passed: results.filter((result) => result.pass).length,
  failed: results.filter((result) => !result.pass).length,
  results,
};

mkdirSync("outputs/evals", { recursive: true });
writeFileSync("outputs/evals/research-retrieval-results.json", `${JSON.stringify(summary, null, 2)}\n`, "utf8");
const rows = results.map((result) =>
  `| ${result.pass ? "PASS" : "FAIL"} | ${result.parsedIntent} | ${result.selectedPapers.length} | ${result.filteredCount} | ${result.citationIntegrity ? "PASS" : "FAIL"} | ${result.query.replaceAll("|", "\\|")} |`,
).join("\n");
const report = [
  "# COSMOS AI Scholarly Retrieval Evaluation",
  "",
  `Generated: ${summary.generatedAt}`,
  "",
  "This repeatable evaluation uses clearly labeled fixtures, including tangential, highly cited, wrong-type, out-of-range, duplicate, and retracted records. It makes no model or paid API calls.",
  "",
  `- Benchmarks: ${summary.benchmarkCount}`,
  `- Passed: ${summary.passed}`,
  `- Failed: ${summary.failed}`,
  "",
  "| Result | Intent | Selected | Filtered | Citations | Query |",
  "| --- | --- | ---: | ---: | --- | --- |",
  rows,
  "",
  ...results.flatMap((result) => [
    `## ${result.pass ? "PASS" : "FAIL"}: ${result.query}`,
    "",
    `- Topic: ${result.topic}`,
    `- Selected: ${result.selectedPapers.map((paper) => paper.title).join("; ") || "None"}`,
    `- Rejections: ${result.rejectionReasons.map((item) => `${item.title} (${item.reasons.join(", ")})`).join("; ") || "None"}`,
    `- Hard failures: ${result.hardFailures.join(", ") || "None"}`,
    "",
  ]),
].join("\n");
writeFileSync("outputs/evals/research-retrieval-report.md", report, "utf8");

console.log(`Research retrieval evaluation: ${summary.passed}/${summary.benchmarkCount} passed.`);
if (summary.failed > 0) process.exitCode = 1;
