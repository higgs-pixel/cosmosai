import { jsonOk } from "@/lib/api-response";
import { searchArcsecondAstronomy } from "@/lib/data-sources/arcsecond";
import { cosmosApiError, parseQuery } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseQuery(searchParams);
    const results = await searchArcsecondAstronomy(query);
    return jsonOk({
      query,
      available: results.length > 0,
      results,
      fallback: results.length > 0 ? undefined : "Arcsecond catalog endpoint is wrapped, but a supported matching endpoint/result was not available.",
      source: "Arcsecond",
    }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
