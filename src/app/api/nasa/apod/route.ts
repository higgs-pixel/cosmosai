import { NextRequest } from "next/server";
import { getApod } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext, optionalBoolean, optionalIsoDate, optionalNumber } from "../_utils";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const context = createNasaRouteContext();

  try {
    const data = await getApod({
      date: optionalIsoDate(searchParams.get("date")),
      startDate: optionalIsoDate(searchParams.get("startDate")),
      endDate: optionalIsoDate(searchParams.get("endDate")),
      count: optionalNumber(searchParams.get("count"), 1, 100),
      thumbs: optionalBoolean(searchParams.get("thumbs")),
    }, context.options);

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
