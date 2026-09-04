import type { CosmosQueryIntent } from "./query-intent.ts";
import { parseResearchRequest } from "../retrieval/research-request.ts";

const FALSE_PREMISE_POLICY = [
  "FALSE-PREMISE RESPONSE POLICY:",
  "Correct the unsupported premise immediately and respectfully in one clear sentence; do not repeat the denial in every section.",
  "Explain the likely source of confusion, including pareidolia, shadows and lighting, erosion or unusual geology, low-resolution imagery, compression artefacts, and misleading captions when relevant.",
  "Distinguish artificial structures, intelligent extraterrestrial life, present microbial life, past microbial life, habitability, organic molecules, and possible biosignatures. These claims require different evidence.",
  "State what the supplied official evidence actually supports and what it does not support.",
  "For Mars, explain that missions have found ancient rivers and lakes, sedimentary geology, potentially habitable past environments, and organic molecules, but no verified artificial structures, confirmed biological origin, or confirmed extraterrestrial life.",
  "Explain how to verify similar claims: locate the original mission release, inspect higher-resolution and differently lit images, check instrument metadata, and compare the claim with the agency's exact wording.",
  "Use only attached official records for claims about what NASA confirmed. Never invent an announcement.",
  "Use concise headings: ### Direct correction, ### Why the claim circulates, ### What the evidence shows, ### How to verify claims.",
].join("\n");

export function buildIntentResponsePolicy(intent: CosmosQueryIntent) {
  if (intent.mode === "false-premise") return FALSE_PREMISE_POLICY;

  if (intent.mode === "scholarly-sources") {
    const requested = intent.requestedSourceCount ?? 5;
    const request = parseResearchRequest(intent.originalQuery);
    const orderRule = request.mode === "recent" || request.mode === "latest-developments"
      ? "Order by direct relevance first and recency second; do not let an older citation count displace a directly relevant recent paper."
      : request.mode === "foundational" || request.mode === "landmark"
        ? "Order by historical contribution and direct relevance; old landmark papers are expected and must not receive a recency penalty."
        : request.mode === "review" || request.mode === "systematic-review"
          ? "Return only records verified as reviews; systematic-review requests require explicit systematic-review evidence in the title or abstract."
          : "Order by direct topic centrality, then metadata confidence and scholarly authority.";
    return [
      "SCHOLARLY-SOURCE RESPONSE POLICY:",
      `Return up to ${requested} directly relevant, verifiable scholarly records; return fewer if the quality gate leaves fewer.`,
      `The request was deterministically interpreted as ${request.mode} literature on \"${request.topic}\". Do not broaden or rename that topic.`,
      "Begin with one sentence describing the set as a balanced starting set or directly relevant set, never a comprehensive or definitive bibliography.",
      "For every item give title, authors, year, journal/provider, DOI and arXiv ID when present, direct link, source classification, and a specific one-sentence relevance explanation.",
      orderRule,
      "Do not add a generic topic essay unless the user asked for one.",
      "Use only metadata in the supplied records; missing fields must be called unavailable.",
      "Never add a paper from memory, claim access to unavailable full text, or infer a conclusion beyond the supplied title and abstract.",
    ].join("\n");
  }

  if (intent.mode === "uncertain-science") {
    return [
      "UNCERTAIN-SCIENCE RESPONSE POLICY:",
      "Separate observation, established theory, extrapolation, and speculation.",
      "State clearly when a question is not currently testable or when the theory does not define an earlier state.",
      "Present leading proposals as proposals, not discoveries, and avoid false certainty in either direction.",
    ].join("\n");
  }

  if (intent.mode === "current-mission" || intent.mode === "live-data") {
    return [
      "TIME-SENSITIVE RESPONSE POLICY:",
      "Use attached current-source data and timestamps. Do not substitute remembered schedules or live values when the source is unavailable.",
      "Separate confirmed status from tentative dates and explain the source's update time.",
    ].join("\n");
  }

  return "";
}
