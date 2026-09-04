import "server-only";

import { env } from "@/lib/env";
import { compactText, decodeXml, fetchText, textBetween, type ResearchItem } from "./shared";

export async function searchArxivPapers(
  query: string,
  limit = 5,
  options: {
    sortBy?: "submittedDate" | "relevance";
    revalidate?: number;
    searchField?: "all" | "title" | "author";
  } = {},
): Promise<ResearchItem[]> {
  const baseUrl = env.arxivBaseUrl.replace(/\/$/, "");
  const escapedQuery = query.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
  const field = options.searchField ?? "all";
  const fieldQuery = field === "title"
    ? `ti:"${escapedQuery}"`
    : field === "author"
      ? `au:"${escapedQuery}"`
      : escapedQuery
          .split(/\s+/)
          .filter((term) => term.length > 2 && !/^(?:and|for|from|paper|papers|research|the|with)$/i.test(term))
          .slice(0, 10)
          .map((term) => `all:${term}`)
          .join(" AND ");
  const searchQuery = `(cat:astro-ph* OR cat:gr-qc OR cat:hep-th OR cat:quant-ph OR cat:physics.space-ph) AND (${fieldQuery || `all:"${escapedQuery}"`})`;
  const url = `${baseUrl}/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${Math.min(limit, 20)}&sortBy=${options.sortBy ?? "submittedDate"}&sortOrder=descending`;
  const xml = await fetchText(url, {
    accept: "application/atom+xml,text/xml,*/*",
    revalidate: options.revalidate ?? 3600,
    tags: ["cosmos", "research", "arxiv"],
  });

  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, Math.min(limit, 20)).map((match) => {
    const entry = match[1];
    const authors = [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)]
      .map((author) => decodeXml(author[1].replace(/\s+/g, " ").trim()))
      .slice(0, 8);
    const publishedAt = textBetween(entry, "published")?.slice(0, 10);
    const arxivId = textBetween(entry, "id")
      ?.replace(/^https?:\/\/arxiv\.org\/(?:abs|pdf)\//i, "")
      .replace(/v\d+$/i, "");
    const doi = textBetween(entry, "arxiv:doi");

    const title = textBetween(entry, "title") ?? "Untitled arXiv paper";
    const summary = compactText(textBetween(entry, "summary"), 1200);
    const reviewLike = /\b(?:systematic\s+)?review\b|\bsurvey\b/i.test(`${title} ${summary}`);

    return {
      title,
      authors,
      year: publishedAt ? Number(publishedAt.slice(0, 4)) : undefined,
      source: "arXiv",
      summary,
      url: textBetween(entry, "id"),
      doi,
      arxivId,
      openAccess: true,
      provider: "arXiv" as const,
      publishedAt,
      paperType: reviewLike ? "review" as const : "preprint" as const,
      isRetracted: false,
      isPreprint: true,
      isPeerReviewed: false,
      sourceProviders: ["arXiv"],
      rawProviderIds: arxivId ? { arXiv: arxivId } : undefined,
    };
  });
}
