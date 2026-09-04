import { jsonOk } from "@/lib/api-response";
import { getRecentEarthquakes } from "@/lib/data-sources/usgs-earthquake";
import { cosmosApiError, parseLimit } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return jsonOk({
      source: "USGS",
      results: await getRecentEarthquakes(parseLimit(searchParams, 8, 20)),
    }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
