import { jsonOk } from "@/lib/api-response";
import { getOpenMeteoForecast } from "@/lib/data-sources/open-meteo";
import { cosmosApiError, parseCoordinates } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 1200;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { latitude, longitude } = parseCoordinates(searchParams);
    return jsonOk(await getOpenMeteoForecast(latitude, longitude), { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
