import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const previewFailureSchema = z.strictObject({
  nasaId: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._-]+$/),
  failureCategory: z.literal("image_load_failed"),
});

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "The preview diagnostic was invalid." } },
      { status: 400 },
    );
  }

  const parsed = previewFailureSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "The preview diagnostic was invalid." } },
      { status: 400 },
    );
  }

  console.warn("nasa_image_preview_resolution_failed", {
    endpoint: "/api/nasa/media/preview-failure",
    requestId: request.headers.get("x-request-id") ?? randomUUID(),
    nasaItemId: parsed.data.nasaId,
    failureCategory: parsed.data.failureCategory,
    sourceHost: "images-assets.nasa.gov",
  });

  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
