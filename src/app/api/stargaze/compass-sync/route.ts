import { NextResponse } from "next/server";

export interface CompassSyncData {
  sessionId: string;
  heading: number; // 0 to 360 degrees (Azimuth)
  pitch: number;   // -90 to 90 degrees (Elevation)
  roll?: number;    // -180 to 180 degrees
  timestamp: number;
}

// In-memory store for active mobile compass sessions
const compassSessions = new Map<string, CompassSyncData>();
let latestCompassData: CompassSyncData | null = null;

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

    const normSessionId = sessionId ? String(sessionId).trim() : "stargaze-sync";
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

    compassSessions.set(normSessionId, data);
    compassSessions.set("stargaze-sync", data);
    compassSessions.set("default-session", data);
    compassSessions.set("<SESSION_ID>", data);
    compassSessions.set("%3CSESSION_ID%3E", data);
    latestCompassData = data;

    cleanupSessions();

    return NextResponse.json({ success: true, timestamp: data.timestamp });
  } catch (err) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestedSessionId = searchParams.get("session") || "stargaze-sync";

  let session = compassSessions.get(requestedSessionId);

  // Fall back to latest active telemetry if session ID isn't directly matched
  if (!session && latestCompassData && (Date.now() - latestCompassData.timestamp < 10000)) {
    session = latestCompassData;
  }

  if (!session) {
    return NextResponse.json({ connected: false });
  }

  const isFresh = Date.now() - session.timestamp < 10000; // Fresh within 10s
  return NextResponse.json({
    connected: isFresh,
    data: session,
  });
}
