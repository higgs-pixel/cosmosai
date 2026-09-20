import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getFallbackImageResponse(): NextResponse {
  try {
    const fallbackPath = path.join(process.cwd(), "public", "images", "satellites", "satellite_orbit_real.jpg");
    if (fs.existsSync(fallbackPath)) {
      const imgBuffer = fs.readFileSync(fallbackPath);
      return new NextResponse(imgBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
  } catch (e) {
    // ignore
  }

  return new NextResponse(null, { status: 404 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
    return getFallbackImageResponse();
  }

  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "COSMOS-AI-Space-Observatory/1.0 (https://cosmos.ai; research@cosmos.ai)",
        "Api-User-Agent": "COSMOS-AI/1.0",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`[Image Proxy Warning] HTTP ${res.status} for ${imageUrl}`);
      return getFallbackImageResponse();
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await res.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: any) {
    console.warn(`[Image Proxy Exception] ${err.message || err} for ${imageUrl}`);
    return getFallbackImageResponse();
  }
}
