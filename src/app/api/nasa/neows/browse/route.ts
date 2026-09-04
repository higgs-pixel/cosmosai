import { NextRequest } from "next/server";
import { browseNeoWsAsteroids } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext, optionalNumber } from "../../_utils";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const context = createNasaRouteContext();
    const data = await browseNeoWsAsteroids({
      page: optionalNumber(searchParams.get("page"), 0, 1_000),
      size: optionalNumber(searchParams.get("size"), 1, 100),
    }, context.options);

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
