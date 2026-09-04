import { mkdirSync, writeFileSync } from "node:fs";
import { GOLDEN_RESEARCH_CORPUS } from "../tests/fixtures/golden-research-corpus.ts";
import {
  evaluateRetrieval,
  type RetrievalEvaluationCase,
} from "../src/lib/retrieval/retrieval-metrics.ts";
import {
  createInMemoryScholarlyIndex,
  retrieveFromScholarlyIndex,
} from "../src/lib/retrieval/scholarly-index.ts";
import { normalizeScholarlyLookupQuery } from "../src/lib/retrieval/scholarly-query-normalizer.ts";
import { normalizeScholarlyTitle } from "../src/lib/retrieval/scholarly-paper.ts";

const cases: RetrievalEvaluationCase[] = [
  { id: "page-title", query: "Information in Black Hole Radiation", queryType: "exact-title", relevantIds: ["page-information-radiation-1993"] },
  { id: "page-doi", query: "10.1103/PhysRevLett.71.3743", queryType: "doi", relevantIds: ["page-information-radiation-1993"] },
  { id: "page-author", query: "papers by Don N. Page", queryType: "author", relevantIds: ["page-information-radiation-1993"] },
  { id: "black-hole-topic", query: "black hole information paradox", queryType: "topic", relevantIds: ["page-information-radiation-1993", "hawking-particle-creation-1975"], variationGroup: "black-hole-information" },
  { id: "black-hole-synonym", query: "Hawking information loss", queryType: "synonym", relevantIds: ["page-information-radiation-1993", "hawking-particle-creation-1975"] },
  { id: "black-hole-natural", query: "paper explaining when information returns during black-hole evaporation", queryType: "natural-language", relevantIds: ["page-information-radiation-1993"] },
  { id: "ai-acronym", query: "AI attention architecture", queryType: "acronym", relevantIds: ["vaswani-attention-2017"] },
  { id: "ir-acronym", query: "IR social construction of anarchy", queryType: "acronym", relevantIds: ["wendt-anarchy-1992"] },
  { id: "climate-acronym", query: "IPCC AR6 physical climate report", queryType: "acronym", relevantIds: ["ipcc-ar6-wg1-2021"] },
  { id: "cosmology-description", query: "Type Ia supernova evidence for cosmic acceleration", queryType: "natural-language", relevantIds: ["riess-accelerating-universe-1998"] },
  { id: "policy-description", query: "incremental decision making in public policy", queryType: "natural-language", relevantIds: ["lindblom-muddling-1959"] },
  { id: "space-technology", query: "space telescope transit photometry first results", queryType: "topic", relevantIds: ["borucki-kepler-2010"] },
  { id: "title-punctuation", query: "Information in Black-Hole Radiation!", queryType: "variation", relevantIds: ["page-information-radiation-1993"] },
  { id: "title-typo", query: "black hole informtion paradox", queryType: "variation", relevantIds: ["page-information-radiation-1993", "hawking-particle-creation-1975"], variationGroup: "black-hole-information" },
];

const store = createInMemoryScholarlyIndex(GOLDEN_RESEARCH_CORPUS);

async function legacyRetrieve(query: string) {
  const normalized = normalizeScholarlyTitle(query);
  return GOLDEN_RESEARCH_CORPUS
    .filter((paper) => {
      const searchable = normalizeScholarlyTitle(`${paper.title} ${paper.abstract ?? ""}`);
      return searchable.includes(normalized);
    })
    .sort((left, right) => (right.citationCount ?? 0) - (left.citationCount ?? 0))
    .map((paper) => paper.id)
    .slice(0, 10);
}

async function hybridRetrieve(query: string) {
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery(query), store, { limit: 10 });
  return result.sources.map((source) => source.paper.id);
}

const baseline = await evaluateRetrieval(cases, legacyRetrieve);
const exactLookup = await evaluateRetrieval(cases, async (query) => {
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery(query), store, { limit: 10 });
  return result.sources
    .filter((source) => source.paths.some((path) => path === "doi" || path === "id" || path === "exact-title"))
    .map((source) => source.paper.id);
});
const lexicalRetrieval = await evaluateRetrieval(cases, async (query) => {
  const result = await retrieveFromScholarlyIndex(normalizeScholarlyLookupQuery(query), store, { limit: 10 });
  return result.sources.filter((source) => source.paths.includes("lexical")).map((source) => source.paper.id);
});
const semanticRetrieval = await evaluateRetrieval(cases, async () => []);
const postFix = await evaluateRetrieval(cases, hybridRetrieve);
const report = {
  generatedAt: new Date().toISOString(),
  evaluationType: "offline deterministic candidate-discovery evaluation",
  corpusSize: GOLDEN_RESEARCH_CORPUS.length,
  baseline,
  stages: {
    exactLookup,
    lexicalRetrieval,
    semanticRetrieval: {
      ...semanticRetrieval,
      status: "not_configured",
    },
    hybridRetrieval: postFix,
    rerankedHybridRetrieval: postFix,
  },
  postFix,
  improvement: {
    recallAt1: postFix.recallAt[1] - baseline.recallAt[1],
    recallAt5: postFix.recallAt[5] - baseline.recallAt[5],
    meanReciprocalRank: postFix.meanReciprocalRank - baseline.meanReciprocalRank,
    falseNegativeRate: baseline.falseNegativeRate - postFix.falseNegativeRate,
  },
};

mkdirSync("outputs/evals", { recursive: true });
writeFileSync("outputs/evals/research-discovery-results.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  baseline: {
    recallAt1: baseline.recallAt[1],
    recallAt5: baseline.recallAt[5],
    falseNegativeRate: baseline.falseNegativeRate,
  },
  postFix: {
    recallAt1: postFix.recallAt[1],
    recallAt5: postFix.recallAt[5],
    falseNegativeRate: postFix.falseNegativeRate,
    queryVariationStability: postFix.queryVariationStability,
  },
}, null, 2));

if (postFix.recallAt[5] < baseline.recallAt[5] || postFix.falseNegativeRate > baseline.falseNegativeRate) {
  process.exitCode = 1;
}
