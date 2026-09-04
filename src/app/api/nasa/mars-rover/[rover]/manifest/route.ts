import { NextRequest, NextResponse } from "next/server";
import { getMarsRoverManifest, type MarsRoverName } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext } from "../../../_utils";

const ROVERS = new Set<MarsRoverName>(["curiosity", "opportunity", "spirit", "perseverance"]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rover: string }> },
) {
  const { rover } = await params;

  if (!ROVERS.has(rover as MarsRoverName)) {
    return NextResponse.json(
      { error: { message: `Unsupported Mars rover: ${rover}` } },
      { status: 400 },
    );
  }

  try {
    const context = createNasaRouteContext();
    const data = await getMarsRoverManifest({ rover: rover as MarsRoverName }, context.options);

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
