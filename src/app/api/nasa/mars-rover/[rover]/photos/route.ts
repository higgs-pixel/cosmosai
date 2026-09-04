import { NextRequest, NextResponse } from "next/server";
import { getMarsRoverPhotos, type MarsRoverName } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext, optionalIsoDate, optionalNumber, optionalText } from "../../../_utils";

const ROVERS = new Set<MarsRoverName>(["curiosity", "opportunity", "spirit", "perseverance"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rover: string }> },
) {
  const { rover } = await params;

  if (!ROVERS.has(rover as MarsRoverName)) {
    return NextResponse.json(
      { error: { message: "Unsupported Mars rover." } },
      { status: 400 },
    );
  }

  const searchParams = request.nextUrl.searchParams;

  try {
    const context = createNasaRouteContext();
    const data = await getMarsRoverPhotos({
      rover: rover as MarsRoverName,
      sol: optionalNumber(searchParams.get("sol")),
      earthDate: optionalIsoDate(searchParams.get("earthDate")),
      camera: optionalText(searchParams.get("camera"), 30),
      page: optionalNumber(searchParams.get("page"), 1, 1_000),
    }, context.options);

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
