import { jsonOk } from "@/lib/api-response";
import { getWeatherstackCurrent } from "@/lib/data-sources/weatherstack";
import { cosmosApiError } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 1200;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location")?.trim() || "Gwalior";
    const weather = await getWeatherstackCurrent(location);
    return jsonOk({
      location,
      available: Boolean(weather),
      weather,
      fallback: weather ? undefined : "Weatherstack is not configured or temporarily unavailable.",
      source: "Weatherstack",
    }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
