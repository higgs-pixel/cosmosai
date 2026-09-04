import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type SessionStore = {
  lat: number;
  lon: number;
  alt: number;
  accuracy: number;
  updatedAt: number;
  placeName?: string;
};

const sessionMap = new Map<string, SessionStore>();
let defaultSession: SessionStore | null = null;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");

  if (sessionId && sessionMap.has(sessionId)) {
    const data = sessionMap.get(sessionId)!;
    if (Date.now() - data.updatedAt < 300000) {
      return NextResponse.json({ success: true, coords: data });
    }
  }

  if (defaultSession && Date.now() - defaultSession.updatedAt < 300000) {
    return NextResponse.json({ success: true, coords: defaultSession });
  }

  return NextResponse.json({ success: false, coords: null });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session") || body.session;

    if (body && typeof body.lat === "number" && typeof body.lon === "number") {
      const payload: SessionStore = {
        lat: body.lat,
        lon: body.lon,
        alt: body.alt || 180,
        accuracy: body.accuracy || 5,
        placeName: body.placeName || "Mobile Phone GPS",
        updatedAt: Date.now(),
      };

      if (sessionId) {
        sessionMap.set(sessionId, payload);
      }
      defaultSession = payload;

      return NextResponse.json({ success: true, session: sessionId || "default" });
    }
  } catch {
    /* skip */
  }

  return NextResponse.json({ success: false, error: "Invalid payload format" }, { status: 400 });
}
