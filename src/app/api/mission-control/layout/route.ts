import { NextRequest, NextResponse } from "next/server";
import { assertAuthenticatedSession, SecurityHttpError } from "@/lib/security/auth";
import { readBoundedJson } from "@/lib/security/request";
import { getRequestId, requireSameOrigin, securityErrorResponse } from "@/lib/security/route";
import { validateWidgetLayoutInput } from "@/lib/security/validation";
import {
  getCurrentUserSession,
  getMissionControlLayout,
  saveMissionControlLayout,
} from "@/utils/supabase/server";

export const runtime = "nodejs";

const MAX_WIDGETS = 16;

type WidgetLayout = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function normalizeLayout(value: unknown): WidgetLayout[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): WidgetLayout | null => {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.slice(0, 80) : "";
      const x = Number(record.x);
      const y = Number(record.y);
      const w = Number(record.w);
      const h = Number(record.h);
      if (!id || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return null;

      return {
        id,
        x: Math.max(0, Math.min(11, Math.round(x))),
        y: Math.max(0, Math.min(100, Math.round(y))),
        w: Math.max(3, Math.min(12, Math.round(w))),
        h: Math.max(2, Math.min(8, Math.round(h))),
      };
    })
    .filter((item): item is WidgetLayout => Boolean(item))
    .slice(0, MAX_WIDGETS);
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const session = assertAuthenticatedSession(await getCurrentUserSession());
    const layout = normalizeLayout(await getMissionControlLayout(session.accessToken, session.user.id));
    return NextResponse.json({ layout }, { headers: { "x-cosmos-request-id": requestId } });
  } catch (error) {
    return securityErrorResponse(error, requestId);
  }
}

export async function PUT(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request, "/api/mission-control/layout", requestId);
    const session = assertAuthenticatedSession(await getCurrentUserSession());
    const payload = await readBoundedJson(request, 12_000);
    const validation = validateWidgetLayoutInput(payload);
    if (!validation.ok) throw new SecurityHttpError(400, validation.error, "INVALID_LAYOUT");
    const layout = normalizeLayout(validation.data);
    await saveMissionControlLayout({ accessToken: session.accessToken, userId: session.user.id, layout });
    return NextResponse.json({ layout }, { headers: { "x-cosmos-request-id": requestId } });
  } catch (error) {
    return securityErrorResponse(error, requestId);
  }
}
