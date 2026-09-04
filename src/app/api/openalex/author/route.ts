import { NextRequest, NextResponse } from "next/server";
import { getOpenAlexAuthor, searchOpenAlexAuthors } from "@/lib/openalex";
import {
  handleOpenAlexRouteError,
  jsonError,
  readPositiveInteger,
  readQueryParam,
} from "../_utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = readQueryParam(params, "id", 180);
  const query = readQueryParam(params, "q", 140);

  if (!id && !query) return jsonError("Either id or q is required.");

  try {
    const result = id
      ? { author: await getOpenAlexAuthor(id) }
      : {
          results: await searchOpenAlexAuthors({
            query: query!,
            limit: readPositiveInteger(params, "limit", 8, 25),
            page: readPositiveInteger(params, "page", 1, 100),
          }),
        };

    return NextResponse.json(
      {
        success: true,
        ...result,
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
