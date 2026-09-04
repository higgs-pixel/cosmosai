import { NextRequest } from "next/server";
import { SecurityHttpError } from "@/lib/security/auth";
import { getNeoWsAsteroid } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext } from "../../_utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ asteroidId: string }> },
) {
  const { asteroidId } = await params;

  try {
    if (!/^\d{1,30}$/.test(asteroidId)) {
      throw new SecurityHttpError(400, "Invalid asteroid ID.", "INVALID_ASTEROID_ID");
    }
    const context = createNasaRouteContext();
    const data = await getNeoWsAsteroid({ asteroidId }, context.options);

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
