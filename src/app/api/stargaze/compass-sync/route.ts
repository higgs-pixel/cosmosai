import { NextResponse } from "next/server";

export interface CompassSyncData {
  sessionId: string;
  heading: number; // 0 to 360 degrees (Azimuth)
  pitch: number;   // -90 to 90 degrees (Elevation)
  roll?: number;   // -180 to 180 degrees
  timestamp: number;
}

// In-memory store for active mobile compass sessions
const compassSessions = new Map<string, CompassSyncData>();

// Clean up stale sessions older than 5 minutes periodically
function cleanupSessions() {
  const now = Date.now();
  for (const [id, data] of compassSessions.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) {
      compassSessions.delete(id);
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, heading, pitch, roll } = body;

    const normSessionId =
      sessionId && String(sessionId).trim() !== "<SESSION_ID>" && String(sessionId).trim() !== "%3CSESSION_ID%3E"
        ? String(sessionId).trim()
        : "stargaze-sync";

    if (typeof heading !== "number") {
      return NextResponse.json({ error: "Missing heading" }, { status: 400 });
    }

    const data: CompassSyncData = {
      sessionId: normSessionId,
      heading: (heading % 360 + 360) % 360,
      pitch: typeof pitch === "number" ? Math.max(-90, Math.min(90, pitch)) : 0,
      roll: typeof roll === "number" ? roll : 0,
      timestamp: Date.now(),
    };

    // Strictly isolate telemetry to this exact session ID (no global crosstalk)
    compassSessions.set(normSessionId, data);

    cleanupSessions();

    return NextResponse.json({ success: true, timestamp: data.timestamp });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestedSessionId = searchParams.get("session") || "stargaze-sync";

  const session = compassSessions.get(requestedSessionId);

  if (!session) {
    return NextResponse.json(
      { connected: false },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }

  const isFresh = Date.now() - session.timestamp < 10000; // Fresh within 10s
  return NextResponse.json(
    {
      connected: isFresh,
      data: session,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
