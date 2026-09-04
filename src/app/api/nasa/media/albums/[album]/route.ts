import { NextRequest, NextResponse } from "next/server";
import { SecurityHttpError } from "@/lib/security/auth";
import { getNasaImageAlbum } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext, optionalNumber } from "../../../_utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ album: string }> },
) {
  const { album } = await params;

  if (!album) {
    return NextResponse.json(
      { error: { message: "album is required." } },
      { status: 400 },
    );
  }

  try {
    if (album.length > 120 || /[\u0000-\u001f\u007f]/.test(album)) {
      throw new SecurityHttpError(400, "Invalid album name.", "INVALID_ALBUM");
    }
    const context = createNasaRouteContext();
    const data = await getNasaImageAlbum(
      album,
      optionalNumber(request.nextUrl.searchParams.get("page")),
      context.options,
    );

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
