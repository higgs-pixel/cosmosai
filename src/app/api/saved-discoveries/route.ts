import { NextResponse, type NextRequest } from "next/server";
import { assertAuthenticatedSession, SecurityHttpError } from "@/lib/security/auth";
import { readBoundedJson } from "@/lib/security/request";
import { getRequestId, requireSameOrigin, securityErrorResponse } from "@/lib/security/route";
import { validateSavedDiscoveryInput } from "@/lib/security/validation";
import {
  deleteSupabaseDiscovery,
  getCurrentUserSession,
  getSupabaseSavedDiscoveries,
  saveSupabaseDiscovery,
} from "@/utils/supabase/server";
import type { SavedDiscovery, SavedDiscoveryType } from "@/lib/saved-discoveries";

function isSavedDiscoveryType(value: unknown): value is SavedDiscoveryType {
  return value === "apod" || value === "nasa-image" || value === "planet" || value === "briefing";
}

function sanitizeDiscovery(input: unknown): SavedDiscovery | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as Record<string, unknown>;

  if (typeof record.id !== "string" || record.id.trim().length === 0) return null;
  if (typeof record.title !== "string" || record.title.trim().length === 0) return null;
  if (!isSavedDiscoveryType(record.type)) return null;

  return {
    id: record.id.trim().slice(0, 160),
    type: record.type,
    title: record.title.trim().slice(0, 240),
    subtitle: typeof record.subtitle === "string" ? record.subtitle.trim().slice(0, 240) : undefined,
    description: typeof record.description === "string" ? record.description.trim().slice(0, 1200) : undefined,
    imageUrl: typeof record.imageUrl === "string" ? record.imageUrl : undefined,
    href: typeof record.href === "string" ? record.href : undefined,
    source: typeof record.source === "string" ? record.source.trim().slice(0, 120) : undefined,
    savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date().toISOString(),
    metadata:
      typeof record.metadata === "object" && record.metadata !== null
        ? (record.metadata as SavedDiscovery["metadata"])
        : undefined,
  };
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const session = assertAuthenticatedSession(await getCurrentUserSession());
    const items = await getSupabaseSavedDiscoveries(session.accessToken, session.user.id);
    return NextResponse.json({ items, authenticated: true }, { headers: { "x-cosmos-request-id": requestId } });
  } catch (error) {
    return securityErrorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request, "/api/saved-discoveries", requestId);
    const session = assertAuthenticatedSession(await getCurrentUserSession());
    const payload = await readBoundedJson(request, 16_000);
    const validation = validateSavedDiscoveryInput(payload);
    if (!validation.ok) throw new SecurityHttpError(400, validation.error, "INVALID_DISCOVERY");
    const discovery = sanitizeDiscovery(validation.data);
    if (!discovery) throw new SecurityHttpError(400, "Invalid saved discovery.", "INVALID_DISCOVERY");

    const item = await saveSupabaseDiscovery({
      accessToken: session.accessToken,
      user: session.user,
      discovery,
    });

    return NextResponse.json({ item, authenticated: true }, { headers: { "x-cosmos-request-id": requestId } });
  } catch (error) {
    return securityErrorResponse(error, requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    requireSameOrigin(request, "/api/saved-discoveries", requestId);
    const session = assertAuthenticatedSession(await getCurrentUserSession());
    const id = request.nextUrl.searchParams.get("id")?.trim();
    if (!id || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(id)) {
      throw new SecurityHttpError(400, "Invalid saved discovery ID.", "INVALID_DISCOVERY_ID");
    }

    await deleteSupabaseDiscovery({ accessToken: session.accessToken, userId: session.user.id, id });
    return NextResponse.json({ ok: true, authenticated: true }, { headers: { "x-cosmos-request-id": requestId } });
  } catch (error) {
    return securityErrorResponse(error, requestId);
  }
}
