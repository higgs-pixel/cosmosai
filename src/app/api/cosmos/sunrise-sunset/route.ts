import { jsonOk } from "@/lib/api-response";
import { getSunriseSunset } from "@/lib/data-sources/sunrise-sunset";
import { cosmosApiError, parseCoordinates } from "../_utils";

export const runtime = "nodejs";
export const revalidate = 43200;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { latitude, longitude } = parseCoordinates(searchParams);
    return jsonOk(await getSunriseSunset(latitude, longitude), { revalidate });
  } catch (error) {
    return cosmosApiError(error);
  }
}
