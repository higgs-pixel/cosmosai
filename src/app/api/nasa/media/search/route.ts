import { NextRequest } from "next/server";
import { searchNasaImagesWithResolvedPreviews, type NasaImageMediaType } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext, optionalCsv, optionalNumber } from "../../_utils";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const context = createNasaRouteContext();
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    const data = await searchNasaImagesWithResolvedPreviews({
      q: searchParams.get("q") ?? undefined,
      center: searchParams.get("center") ?? undefined,
      description: searchParams.get("description") ?? undefined,
      description508: searchParams.get("description508") ?? undefined,
      keywords: optionalCsv(searchParams.get("keywords")),
      location: searchParams.get("location") ?? undefined,
      mediaType: optionalCsv(searchParams.get("mediaType")) as NasaImageMediaType[] | undefined,
      nasaId: searchParams.get("nasaId") ?? undefined,
      page: optionalNumber(searchParams.get("page")),
      pageSize: optionalNumber(searchParams.get("pageSize")),
      photographer: searchParams.get("photographer") ?? undefined,
      secondaryCreator: searchParams.get("secondaryCreator") ?? undefined,
      title: searchParams.get("title") ?? undefined,
      yearStart: searchParams.get("yearStart") ?? undefined,
      yearEnd: searchParams.get("yearEnd") ?? undefined,
    }, context.options, (failure) => {
      console.warn("nasa_image_preview_resolution_failed", {
        endpoint: "/api/nasa/media/search",
        requestId,
        nasaItemId: failure.nasaId,
        failureCategory: failure.category,
        sourceHost: failure.sourceHost,
        providerStatus: failure.status,
      });
    });

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
