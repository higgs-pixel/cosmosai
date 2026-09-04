import { NextRequest, NextResponse } from "next/server";
import { searchOpenAlex } from "@/lib/openalex";
import {
  handleOpenAlexRouteError,
  jsonError,
  readOpenAlexSort,
  readPositiveInteger,
  readQueryParam,
  readSearchType,
  readYear,
} from "../_utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = readQueryParam(params, "q", 180);
  const type = readSearchType(params);

  if (!query) return jsonError("Query parameter q is required.");
  if (!type) return jsonError("Search type must be papers, authors, institutions, topics, or all.");
  const fromYear = readYear(params, "fromYear");
  const toYear = readYear(params, "toYear");
  if (fromYear && toYear && fromYear > toYear) return jsonError("fromYear must be earlier than or equal to toYear.");
  if (params.get("sort") && !readOpenAlexSort(params)) {
    return jsonError("sort must be cited_by_count:desc, publication_year:desc, or publication_year:asc.");
  }

  try {
    const result = await searchOpenAlex({
      query,
      type,
      limit: readPositiveInteger(params, "limit", 8, 25),
      page: readPositiveInteger(params, "page", 1, 100),
      fromYear,
      toYear,
      sort: readOpenAlexSort(params),
    });

    return NextResponse.json(
      {
        success: true,
        query,
        type,
        result,
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
