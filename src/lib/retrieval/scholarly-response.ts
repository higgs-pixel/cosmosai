import type { RankedSource, RelevanceQueryProfile } from "./relevance-score.ts";

function safeMarkdown(value: string | undefined, fallback = "Unavailable") {
  const text = value?.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (text || fallback).replace(/[\\`*_[\]<>]/g, "\\$&");
}

function paperTypeLabel(value: RankedSource["paperType"]) {
  return value ? value.replaceAll("-", " ") : "Unavailable";
}

export function formatScholarlySelectionResponse(
  profile: RelevanceQueryProfile,
  papers: RankedSource[],
  requestedCount: number,
) {
  const request = profile.researchRequest;
  const topic = safeMarkdown(request?.topic ?? profile.originalQuery);
  const mode = safeMarkdown(request?.mode ?? "general");
  const lines = [
    "### Search interpretation",
    `I interpreted this as a ${mode} literature search on **${topic}**. The records below are the papers that passed COSMOS's direct-relevance and metadata-verification gate.`,
    "",
    "### Selected papers",
  ];

  papers.forEach((paper, index) => {
    lines.push(
      "",
      `#### ${index + 1}. ${safeMarkdown(paper.title)}`,
      `- **Authors:** ${paper.authors?.length ? paper.authors.map((author) => safeMarkdown(author)).join(", ") : "Unavailable"}`,
      `- **Year:** ${paper.year ?? "Unavailable"}`,
      `- **Journal/source:** ${safeMarkdown(paper.source, paper.provider)}`,
      `- **Paper type:** ${safeMarkdown(paperTypeLabel(paper.paperType))}`,
      `- **DOI:** ${safeMarkdown(paper.doi)}`,
      `- **arXiv ID:** ${safeMarkdown(paper.arxivId)}`,
      `- **Direct link:** ${paper.url ?? "Unavailable"}`,
      `- **Classification:** ${paper.classificationBadges.length ? paper.classificationBadges.map((badge) => safeMarkdown(badge)).join(", ") : "Direct match"}`,
      `- **Why selected:** ${safeMarkdown(paper.relevanceReason)}`,
    );
  });

  lines.push("", "### Selection notes");
  if (papers.length < requestedCount) {
    lines.push(`Only ${papers.length} paper${papers.length === 1 ? "" : "s"} met the direct-relevance and metadata-verification threshold. I did not add weaker records to reach ${requestedCount}.`);
  } else {
    lines.push(`These ${papers.length} records met the requested constraints and the direct-relevance threshold. This is a strong starting set, not a claim of comprehensiveness.`);
  }

  return lines.join("\n");
}
