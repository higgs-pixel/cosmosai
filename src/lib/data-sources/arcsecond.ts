import "server-only";

import { env } from "@/lib/env";
import { fetchJson } from "./shared";

export type ArcsecondSearchResult = {
  label: string;
  type?: string;
  url?: string;
  source: "Arcsecond";
};

export async function searchArcsecondAstronomy(query: string): Promise<ArcsecondSearchResult[]> {
  const base = env.arcsecondBaseUrl.replace(/\/$/, "");
  const url = new URL(`${base}/observingsites/`);
  url.searchParams.set("search", query);

  try {
    const response = await fetchJson<{ results?: Array<{ name?: string; url?: string; type?: string }> }>(url, {
      revalidate: 86400,
      tags: ["cosmos", "astronomy", "arcsecond"],
    });

    return (response.results ?? []).slice(0, 5).map((item) => ({
      label: item.name ?? "Arcsecond astronomy record",
      type: item.type ?? "Observatory/catalog record",
      url: item.url,
      source: "Arcsecond" as const,
    }));
  } catch {
    return [];
  }
}
