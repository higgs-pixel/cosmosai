import { jsonOk } from "@/lib/api-response";
import { getPurpleAirQuality } from "@/lib/data-sources/purpleair";
import { cosmosApiError, parseCoordinates } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 600;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { latitude, longitude } = parseCoordinates(searchParams);
    const radius = Number(searchParams.get("radius") ?? 10000);
    const airQuality = await getPurpleAirQuality(latitude, longitude, Number.isFinite(radius) ? radius : 10000);
    return jsonOk({
      available: Boolean(airQuality),
      airQuality,
      fallback: airQuality ? undefined : "PurpleAir is not configured or temporarily unavailable.",
      source: "PurpleAir",
    }, { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
