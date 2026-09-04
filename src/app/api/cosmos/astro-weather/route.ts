import { jsonOk } from "@/lib/api-response";
import { getSevenTimerAstroWeather } from "@/lib/data-sources/seven-timer";
import { cosmosApiError, parseCoordinates } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 7200;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { latitude, longitude } = parseCoordinates(searchParams);
    return jsonOk(await getSevenTimerAstroWeather(latitude, longitude), { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
