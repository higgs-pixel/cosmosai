import { NextRequest, NextResponse } from "next/server";
import { getDonkiEvents, type DonkiEventType } from "@/services/nasa";
import { apiErrorResponse, createNasaRouteContext, optionalIsoDate } from "../../_utils";

const DONKI_TYPES = new Set<DonkiEventType>([
  "CME",
  "CMEAnalysis",
  "GST",
  "IPS",
  "FLR",
  "SEP",
  "MPC",
  "RBE",
  "HSS",
  "WSAEnlilSimulations",
  "notifications",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  if (!DONKI_TYPES.has(type as DonkiEventType)) {
    return NextResponse.json(
      { error: { message: "Unsupported DONKI event type." } },
      { status: 400 },
    );
  }

  const searchParams = request.nextUrl.searchParams;

  try {
    const context = createNasaRouteContext();
    const data = await getDonkiEvents({
      type: type as DonkiEventType,
      startDate: optionalIsoDate(searchParams.get("startDate")),
      endDate: optionalIsoDate(searchParams.get("endDate")),
    }, context.options);

    return context.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
