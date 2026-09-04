import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Extract client IP from proxy/CDN headers if available
  const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const isLocal = !rawIp || rawIp === "127.0.0.1" || rawIp === "::1" || rawIp.startsWith("192.168.") || rawIp.startsWith("10.");
  const queryIp = isLocal ? "" : rawIp;

  // Primary Provider: ipwho.is
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(queryIp)}`, {
      signal: AbortSignal.timeout(4500),
      headers: {
        "User-Agent": "COSMOS-AI-Space-Observatory/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && typeof data.latitude === "number" && typeof data.longitude === "number") {
        return NextResponse.json({
          city: data.city || data.region || "Connected Network Location",
          region: data.region || "",
          country: data.country || "Earth",
          lat: data.latitude,
          lon: data.longitude,
          ip: data.ip || rawIp,
        });
      }
    }
  } catch {
    /* try secondary provider */
  }

  // Secondary Provider: ipapi.co
  try {
    const url = queryIp ? `https://ipapi.co/${encodeURIComponent(queryIp)}/json/` : `https://ipapi.co/json/`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4500),
      headers: {
        "User-Agent": "COSMOS-AI-Space-Observatory/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === "number" && typeof data.longitude === "number") {
        return NextResponse.json({
          city: data.city || data.region || "Connected Network Location",
          region: data.region || "",
          country: data.country_name || "Earth",
          lat: data.latitude,
          lon: data.longitude,
          ip: data.ip || rawIp,
        });
      }
    }
  } catch {
    /* try tertiary provider */
  }

  // Tertiary Provider: ip-api.com
  try {
    const url = queryIp ? `http://ip-api.com/json/${encodeURIComponent(queryIp)}` : `http://ip-api.com/json/`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "success" && typeof data.lat === "number" && typeof data.lon === "number") {
        return NextResponse.json({
          city: data.city || data.regionName || "Connected Network Location",
          region: data.regionName || "",
          country: data.country || "Earth",
          lat: data.lat,
          lon: data.lon,
          ip: data.query || rawIp,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // Default IP Geolocation fallback
  return NextResponse.json({
    city: "Observer Location",
    region: "Local Network",
    country: "Earth",
    lat: 13.0827,
    lon: 80.2707,
  });
}
