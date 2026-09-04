import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getFallbackSvgResponse(): NextResponse {
  try {
    const fallbackPath = path.join(process.cwd(), "public", "images", "satellites", "hubble.svg");
    if (fs.existsSync(fallbackPath)) {
      const svgBuffer = fs.readFileSync(fallbackPath);
      return new NextResponse(svgBuffer, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
  } catch (e) {
    // ignore
  }

  // Basic inline SVG fallback if file read fails
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="#0b0f19"><rect width="800" height="600" fill="#0b0f19"/><path d="M400 250 L450 350 L350 350 Z" fill="#00e5ff" opacity="0.6"/><text x="400" y="420" font-family="sans-serif" font-size="20" fill="#00e5ff" text-anchor="middle">COSMOS AI Satellite Observatory</text></svg>`;
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) {
    return getFallbackSvgResponse();
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
      return getFallbackSvgResponse();
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
    return getFallbackSvgResponse();
  }
}
