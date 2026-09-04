import "server-only";

import { env } from "@/lib/env";
import { fetchJson } from "./shared";

export type WikidataFact = {
  id: string;
  label: string;
  description?: string;
  url: string;
  source: "Wikidata";
};

type WikidataSearchResponse = {
  search?: Array<{
    id?: string;
    label?: string;
    description?: string;
    concepturi?: string;
  }>;
};

export async function searchWikidataFacts(query: string, limit = 5): Promise<WikidataFact[]> {
  const url = new URL(env.wikidataApiBaseUrl);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en");
  url.searchParams.set("limit", String(Math.min(limit, 10)));
  url.searchParams.set("search", query);

  const response = await fetchJson<WikidataSearchResponse>(url, {
    revalidate: 86400,
    tags: ["cosmos", "wikidata"],
  });

  return (response.search ?? []).map((item) => ({
    id: item.id ?? "unknown",
    label: item.label ?? "Wikidata entity",
    description: item.description,
    url: item.concepturi ?? `https://www.wikidata.org/wiki/${item.id}`,
    source: "Wikidata" as const,
  }));
}
