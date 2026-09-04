import { jsonOk } from "@/lib/api-response";
import { searchWikidataFacts } from "@/lib/data-sources/wikidata";
import { cosmosApiError, parseLimit, parseQuery } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseQuery(searchParams);
    return jsonOk({
      query,
      results: await searchWikidataFacts(query, parseLimit(searchParams, 5, 10)),
    }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
