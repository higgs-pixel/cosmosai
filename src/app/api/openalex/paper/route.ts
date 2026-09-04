import { NextRequest, NextResponse } from "next/server";
import { getOpenAlexPaper } from "@/lib/openalex";
import { handleOpenAlexRouteError, jsonError, readQueryParam } from "../_utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const id = readQueryParam(request.nextUrl.searchParams, "id", 260);
  if (!id) return jsonError("Query parameter id is required.");

  try {
    const paper = await getOpenAlexPaper(id);
    return NextResponse.json(
      {
        success: true,
        paper,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    return handleOpenAlexRouteError(error);
  }
}
