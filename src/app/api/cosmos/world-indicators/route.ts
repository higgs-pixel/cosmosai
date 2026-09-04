import { jsonOk } from "@/lib/api-response";
import { getWorldIndicators } from "@/lib/data-sources/world-bank";
import { cosmosApiError } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return jsonOk({
      country: searchParams.get("country") || "WLD",
      results: await getWorldIndicators(searchParams.get("country") || "WLD"),
    }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
