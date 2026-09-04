import "server-only";

import {
  getOpenAlexPaperByDoi,
  searchOpenAlexAuthors,
  searchOpenAlexInstitutions,
  searchOpenAlexPapers,
  searchOpenAlexTopics,
  type OpenAlexPaper,
} from "@/lib/openalex";
import type { ResearchItem } from "./shared";

function toResearchItem(paper: OpenAlexPaper): ResearchItem {
  const reviewLike = paper.type?.includes("review") || /\b(?:systematic\s+)?review\b|\bsurvey\b/i.test(paper.title);
  const isPreprint = paper.type === "preprint";
  return {
    title: paper.title,
    authors: paper.authors,
    year: paper.publicationYear,
    source: paper.journal,
    summary: paper.abstract,
    doi: paper.doi,
    url: paper.primaryUrl ?? paper.openAlexUrl,
    openAccess: Boolean(paper.primaryUrl),
    provider: "OpenAlex",
    citationCount: paper.citationCount,
    publishedAt: paper.publicationDate,
    openAlexId: paper.openAlexId,
    paperType: reviewLike
      ? "review"
      : paper.type === "article" && paper.venueType === "journal"
        ? "journal-article"
        : paper.type === "preprint"
          ? "preprint"
          : paper.type?.includes("conference")
            ? "conference-paper"
            : paper.type === "dataset"
              ? "dataset"
              : undefined,
    isRetracted: paper.isRetracted,
    isPreprint,
    isPeerReviewed: Boolean(
      !paper.isRetracted &&
      (paper.type === "article" || reviewLike) &&
      paper.venueType === "journal",
    ),
    concepts: [...paper.concepts, ...paper.topics],
    keywords: paper.keywords,
    sourceProviders: ["OpenAlex"],
    rawProviderIds: { OpenAlex: paper.openAlexId },
  };
}

export async function searchOpenAlexResearch(
  query: string,
  limit = 5,
  options: { fromYear?: number; toYear?: number; sort?: string } = {},
): Promise<ResearchItem[]> {
  const result = await searchOpenAlexPapers({ query, limit, ...options });
  return result.results.map(toResearchItem);
}

export async function lookupOpenAlexResearchByDoi(doi: string): Promise<ResearchItem[]> {
  return [toResearchItem(await getOpenAlexPaperByDoi(doi))];
}

export async function searchOpenAlexResearchExactTitle(
  title: string,
  limit = 5,
  options: { fromYear?: number; toYear?: number } = {},
): Promise<ResearchItem[]> {
  const result = await searchOpenAlexPapers({
    query: `"${title.replaceAll('"', " ").trim()}"`,
    limit,
    searchMode: "exact",
    ...options,
  });
  return result.results.map(toResearchItem);
}

export async function searchOpenAlexResearchByAuthor(
  author: string,
  limit = 10,
  options: { fromYear?: number; toYear?: number } = {},
): Promise<ResearchItem[]> {
  const safeAuthor = author
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}.' -]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  if (!safeAuthor) return [];
  const result = await searchOpenAlexPapers({
    query: "",
    limit,
    filter: `raw_author_name.search:"${safeAuthor}"`,
    ...options,
  });
  return result.results.map(toResearchItem);
}

export async function searchOpenAlexAuthorProfiles(query: string, limit = 5) {
  const result = await searchOpenAlexAuthors({ query, limit });
  return result.results;
}

export async function searchOpenAlexInstitutionProfiles(query: string, limit = 5) {
  const result = await searchOpenAlexInstitutions({ query, limit });
  return result.results;
}

export async function searchOpenAlexTopicProfiles(query: string, limit = 5) {
  const result = await searchOpenAlexTopics({ query, limit });
  return result.results;
}
