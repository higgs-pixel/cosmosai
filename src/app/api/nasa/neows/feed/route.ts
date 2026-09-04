import { NextRequest, NextResponse } from "next/server";
import { getNeoWsFeed } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext, optionalIsoDate } from "../../_utils";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = optionalIsoDate(searchParams.get("startDate"));

  if (!startDate) {
    return NextResponse.json(
      { error: { message: "startDate is required. Use YYYY-MM-DD." } },
      { status: 400 },
    );
  }

  try {
    const context = createNasaRouteContext();
    const data = await getNeoWsFeed({
      startDate,
      endDate: optionalIsoDate(searchParams.get("endDate")),
    }, context.options);

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
