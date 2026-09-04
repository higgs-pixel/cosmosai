import { jsonOk } from "@/lib/api-response";
import { searchArxivPapers } from "@/lib/data-sources/arxiv";
import { searchCorePapers } from "@/lib/data-sources/core";
import { searchOpenAlexResearch } from "@/lib/data-sources/openalex";
import { cosmosApiError, parseLimit, parseQuery } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseQuery(searchParams);
    const limit = parseLimit(searchParams, 5, 15);
    const [openAlex, core, arxiv] = await Promise.allSettled([
      searchOpenAlexResearch(query, limit),
      searchCorePapers(query, limit),
      searchArxivPapers(query, limit),
    ]);
    const results = [
      ...(openAlex.status === "fulfilled" ? openAlex.value : []),
      ...(core.status === "fulfilled" ? core.value : []),
      ...(arxiv.status === "fulfilled" ? arxiv.value : []),
    ].slice(0, limit * 3);

    return jsonOk({ query, count: results.length, results }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
