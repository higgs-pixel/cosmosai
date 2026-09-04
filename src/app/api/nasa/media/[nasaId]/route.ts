import { NextRequest } from "next/server";
import { SecurityHttpError } from "@/lib/security/auth";
import {
  getNasaImageAsset,
  getNasaImageCaptionsLocation,
  getNasaImageMetadataLocation,
} from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext } from "../../_utils";

async function optionalNasaLookup<T>(task: Promise<T>) {
  try {
    return await task;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nasaId: string }> },
) {
  const { nasaId } = await params;
  const includeMetadata = request.nextUrl.searchParams.get("metadata") !== "false";
  const includeCaptions = request.nextUrl.searchParams.get("captions") === "true";

  try {
    if (!/^[A-Za-z0-9._-]{1,120}$/.test(nasaId)) {
      throw new SecurityHttpError(400, "Invalid NASA media ID.", "INVALID_NASA_ID");
    }
    const context = createNasaRouteContext();
    const asset = await getNasaImageAsset({ nasaId }, context.options);
    const [metadata, captions] = await Promise.all([
      includeMetadata ? optionalNasaLookup(getNasaImageMetadataLocation({ nasaId }, context.options)) : Promise.resolve(null),
      includeCaptions ? optionalNasaLookup(getNasaImageCaptionsLocation({ nasaId }, context.options)) : Promise.resolve(null),
    ]);

    return context.json({
      asset,
      metadata,
      captions,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
