import "server-only";

import { env } from "@/lib/env";
import { compactList, compactText, fetchJson, type ResearchItem } from "./shared";

type CoreSearchResponse = {
  results?: Array<{
    title?: string;
    authors?: Array<{ name?: string }> | string[];
    yearPublished?: number;
    publishedDate?: string;
    abstract?: string;
    doi?: string;
    downloadUrl?: string;
    fullTextIdentifier?: string;
    journals?: Array<{ title?: string }>;
    publisher?: string;
    documentType?: string;
    types?: string[];
  }>;
};

export async function searchCorePapers(query: string, limit = 5): Promise<ResearchItem[]> {
  if (!env.coreApiKey) return [];

  const url = new URL("https://api.core.ac.uk/v3/search/works");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(limit, 20)));

  const response = await fetchJson<CoreSearchResponse>(url, {
    revalidate: 3600,
    timeoutMs: 9000,
    tags: ["cosmos", "research", "core"],
    accept: "application/json",
    headers: {
      Authorization: `Bearer ${env.coreApiKey}`,
    },
  });

  return (response.results ?? []).slice(0, limit).map((paper) => {
    const authors = Array.isArray(paper.authors)
      ? compactList(paper.authors.map((author) => (typeof author === "string" ? author : author.name)), 8)
      : [];

    const journal = paper.journals?.[0]?.title;
    const recordType = [paper.documentType, ...(paper.types ?? [])].filter(Boolean).join(" ").toLowerCase();
    const inferredType = recordType.includes("review")
      ? "review" as const
      : recordType.includes("conference")
        ? "conference-paper" as const
        : "journal-article" as const;

    return {
      title: paper.title ?? "Untitled CORE paper",
      authors,
      year: paper.yearPublished,
      source: journal ?? paper.publisher ?? "CORE",
      summary: compactText(paper.abstract, 1200),
      doi: paper.doi,
      url: paper.downloadUrl ?? paper.fullTextIdentifier,
      openAccess: Boolean(paper.downloadUrl || paper.fullTextIdentifier),
      provider: "CORE" as const,
      publishedAt: paper.publishedDate,
      paperType: inferredType,
      isRetracted: false,
      isPreprint: false,
      isPeerReviewed: Boolean(journal && (inferredType === "journal-article" || inferredType === "review")),
      sourceProviders: ["CORE"],
      rawProviderIds: {},
    };
  });
}
