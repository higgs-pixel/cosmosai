import "server-only";

import { cookies } from "next/headers";
import { createSecurityRequestId, hashActor, logSecurityEvent } from "@/lib/security/logger";
import type { SavedDiscovery, SavedDiscoveryType } from "@/lib/saved-discoveries";
import {
  AUTH_CODE_VERIFIER_COOKIE,
  AUTH_FLOW_COOKIE_MAX_AGE,
  createPkceChallenge,
  createPkceVerifier,
} from "@/utils/supabase/auth-flow";
import type {
  SupabaseProfile,
  SupabaseMissionControlLayoutRow,
  SupabaseSavedDiscoveryRow,
  SupabaseSession,
  SupabaseUser,
  SupabaseUserPreferences,
} from "@/utils/supabase/types";

export const ACCESS_COOKIE = "cosmos-sb-access-token";
export const REFRESH_COOKIE = "cosmos-sb-refresh-token";

type SupabaseErrorPayload = {
  msg?: string;
  message?: string;
  error?: string;
  error_description?: string;
};

function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let url: string | undefined;
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
      if (parsed.protocol === "https:" || (localDevelopment && parsed.protocol === "http:")) url = parsed.origin;
    } catch {
      url = undefined;
    }
  }
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    configured: missing.length === 0,
    missing,
    url,
    key,
  };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig().configured;
}

export function getSupabaseRuntimeConfigStatus() {
  const { configured, missing } = getSupabaseConfig();
  return {
    configured,
    missing,
    message: configured
      ? null
      : "Authentication is temporarily unavailable.",
  };
}

function logSupabaseFailure(event: string, actor?: string) {
  logSecurityEvent(event, {
    endpoint: "supabase-rest",
    requestId: createSecurityRequestId(),
    actor: hashActor(actor),
    reason: "upstream_request_failed",
  });
}

async function readSupabaseResponse<T>(response: Response): Promise<T> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 2_000_000) {
    throw new Error("Supabase response exceeded the safety limit.");
  }
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error("Supabase response exceeded the safety limit.");
  const payload = text ? (JSON.parse(text) as T | SupabaseErrorPayload) : {};

  if (!response.ok) {
    const errorPayload = payload as SupabaseErrorPayload;
    throw new Error(
      errorPayload.error_description ||
        errorPayload.message ||
        errorPayload.msg ||
        errorPayload.error ||
        "Supabase request failed.",
    );
  }

  return payload as T;
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}, accessToken?: string) {
  const { configured, url, key } = getSupabaseConfig();
  if (!configured || !url || !key) {
    const status = getSupabaseRuntimeConfigStatus();
    throw new Error(status.message || "Supabase authentication is not configured.");
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${accessToken || key}`);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");

  const timeoutSignal = AbortSignal.timeout(8_000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal,
  });

  return readSupabaseResponse<T>(response);
}

export async function signInWithSupabase(email: string, password: string) {
  return supabaseFetch<SupabaseSession>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signUpWithSupabase({
  email,
  password,
  fullName,
  emailRedirectTo,
  codeChallenge,
}: {
  email: string;
  password: string;
  fullName: string;
  emailRedirectTo: string;
  codeChallenge: string;
}) {
  return supabaseFetch<SupabaseSession | { user: SupabaseUser | null; session: SupabaseSession | null }>(
    "/auth/v1/signup",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name: fullName,
        },
        email_redirect_to: emailRedirectTo,
        code_challenge: codeChallenge,
        code_challenge_method: "s256",
      }),
    },
  );
}

export async function prepareEmailVerificationFlow() {
  const verifier = createPkceVerifier();
  const codeChallenge = await createPkceChallenge(verifier);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_CODE_VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_FLOW_COOKIE_MAX_AGE,
  });

  return codeChallenge;
}

export async function hasAuthCodeVerifier() {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(AUTH_CODE_VERIFIER_COOKIE)?.value);
}

export async function exchangeAuthCodeForSession(code: string) {
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get(AUTH_CODE_VERIFIER_COOKIE)?.value;
  if (!codeVerifier) throw new Error("Missing authentication verifier.");

  return supabaseFetch<SupabaseSession>("/auth/v1/token?grant_type=pkce", {
    method: "POST",
    body: JSON.stringify({
      auth_code: code,
      code_verifier: codeVerifier,
    }),
  });
}

export async function clearAuthFlowCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_CODE_VERIFIER_COOKIE);
}

export async function sendPasswordReset(email: string, redirectTo: string) {
  await supabaseFetch<Record<string, never>>("/auth/v1/recover", {
    method: "POST",
    body: JSON.stringify({
      email,
      redirect_to: redirectTo,
    }),
  });
}

export async function setAuthCookies(session: SupabaseSession) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const maxAge = Math.max(session.expires_in || 60 * 60, 60);

  cookieStore.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  });

  if (session.refresh_token) {
    cookieStore.set(REFRESH_COOKIE, session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function getCurrentUserSession() {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    const user = await supabaseFetch<SupabaseUser>("/auth/v1/user", { method: "GET" }, accessToken);
    return { user, accessToken };
  } catch {
    logSupabaseFailure("supabase_session_read_failed");
    return null;
  }
}

export async function getProfile(accessToken: string, userId: string) {
  try {
    const params = new URLSearchParams({
      id: `eq.${userId}`,
      select: "id,email,full_name,avatar_url,role,created_at,updated_at",
      limit: "1",
    });
    const profiles = await supabaseFetch<SupabaseProfile[]>(`/rest/v1/profiles?${params}`, {
      method: "GET",
    }, accessToken);
    return profiles[0] || null;
  } catch {
    logSupabaseFailure("supabase_profile_read_failed", userId);
    return null;
  }
}

export async function updateProfile({
  accessToken,
  user,
  fullName,
}: {
  accessToken: string;
  user: SupabaseUser;
  fullName: string;
}) {
  const profiles = await supabaseFetch<SupabaseProfile[]>(
    `/rest/v1/profiles?id=eq.${user.id}&select=id,email,full_name,avatar_url,role,created_at,updated_at`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        full_name: fullName,
      }),
    },
    accessToken,
  );

  return profiles[0] || null;
}

export const DEFAULT_USER_PREFERENCES: Pick<
  SupabaseUserPreferences,
  "explanation_level" | "topics" | "daily_briefing_emails" | "public_profile"
> = {
  explanation_level: "Student",
  topics: [],
  daily_briefing_emails: false,
  public_profile: false,
};

export async function getUserPreferences(accessToken: string, userId: string) {
  try {
    const params = new URLSearchParams({
      user_id: `eq.${userId}`,
      select: "id,user_id,explanation_level,topics,daily_briefing_emails,public_profile,created_at,updated_at",
      limit: "1",
    });
    const rows = await supabaseFetch<SupabaseUserPreferences[]>(
      `/rest/v1/user_preferences?${params.toString()}`,
      { method: "GET" },
      accessToken,
    );
    return rows[0] || null;
  } catch {
    logSupabaseFailure("supabase_preferences_read_failed", userId);
    return null;
  }
}

export async function updateUserPreferences({
  accessToken,
  userId,
  preferences,
}: {
  accessToken: string;
  userId: string;
  preferences: Pick<
    SupabaseUserPreferences,
    "explanation_level" | "topics" | "daily_briefing_emails" | "public_profile"
  >;
}) {
  const rows = await supabaseFetch<SupabaseUserPreferences[]>(
    "/rest/v1/user_preferences?on_conflict=user_id&select=id,user_id,explanation_level,topics,daily_briefing_emails,public_profile,created_at,updated_at",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        ...preferences,
      }),
    },
    accessToken,
  );

  return rows[0] || null;
}

function isSavedDiscoveryType(value: string): value is SavedDiscoveryType {
  return value === "apod" || value === "nasa-image" || value === "planet" || value === "briefing";
}

function mapSavedDiscoveryRow(row: SupabaseSavedDiscoveryRow): SavedDiscovery {
  const metadata = row.metadata || {};
  const clientId = typeof metadata.client_id === "string" ? metadata.client_id : row.id;
  const subtitle = typeof metadata.subtitle === "string" ? metadata.subtitle : undefined;
  const source = typeof metadata.source === "string" ? metadata.source : undefined;
  const type = isSavedDiscoveryType(row.item_type) ? row.item_type : "briefing";

  return {
    id: clientId,
    type,
    title: row.title,
    subtitle,
    description: row.description || undefined,
    imageUrl: row.image_url || undefined,
    href: row.source_url || undefined,
    source,
    savedAt: row.created_at,
    metadata: Object.fromEntries(
      Object.entries(metadata).filter(([key]) => key !== "client_id" && key !== "subtitle" && key !== "source"),
    ) as SavedDiscovery["metadata"],
  };
}

function savedDiscoveryPayload(user: SupabaseUser, discovery: SavedDiscovery) {
  return {
    user_id: user.id,
    item_type: discovery.type,
    title: discovery.title,
    description: discovery.description || discovery.subtitle || null,
    source_url: discovery.href || null,
    image_url: discovery.imageUrl || null,
    metadata: {
      ...(discovery.metadata || {}),
      client_id: discovery.id,
      subtitle: discovery.subtitle || null,
      source: discovery.source || null,
    },
  };
}

async function findSavedDiscoveryRow(accessToken: string, userId: string, clientId: string) {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,user_id,item_type,title,description,source_url,image_url,metadata,created_at",
    limit: "1",
  });
  params.set("metadata->>client_id", `eq.${clientId}`);

  const rows = await supabaseFetch<SupabaseSavedDiscoveryRow[]>(
    `/rest/v1/saved_discoveries?${params.toString()}`,
    { method: "GET" },
    accessToken,
  );

  return rows[0] || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getSupabaseSavedDiscoveries(accessToken: string, userId: string) {
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,user_id,item_type,title,description,source_url,image_url,metadata,created_at",
    order: "created_at.desc",
    limit: "120",
  });

  const rows = await supabaseFetch<SupabaseSavedDiscoveryRow[]>(
    `/rest/v1/saved_discoveries?${params.toString()}`,
    { method: "GET" },
    accessToken,
  );

  return rows.map(mapSavedDiscoveryRow);
}

export async function saveSupabaseDiscovery({
  accessToken,
  user,
  discovery,
}: {
  accessToken: string;
  user: SupabaseUser;
  discovery: SavedDiscovery;
}) {
  const existing = await findSavedDiscoveryRow(accessToken, user.id, discovery.id);
  const payload = savedDiscoveryPayload(user, discovery);

  const path = existing
    ? `/rest/v1/saved_discoveries?id=eq.${existing.id}&user_id=eq.${user.id}&select=id,user_id,item_type,title,description,source_url,image_url,metadata,created_at`
    : "/rest/v1/saved_discoveries?select=id,user_id,item_type,title,description,source_url,image_url,metadata,created_at";

  const rows = await supabaseFetch<SupabaseSavedDiscoveryRow[]>(
    path,
    {
      method: existing ? "PATCH" : "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    },
    accessToken,
  );

  return rows[0] ? mapSavedDiscoveryRow(rows[0]) : null;
}

export async function deleteSupabaseDiscovery({
  accessToken,
  userId,
  id,
}: {
  accessToken: string;
  userId: string;
  id: string;
}) {
  const existing = await findSavedDiscoveryRow(accessToken, userId, id);
  const rowId = existing?.id || id;

  if (!isUuid(rowId)) return false;

  await supabaseFetch<Record<string, never>>(
    `/rest/v1/saved_discoveries?id=eq.${rowId}&user_id=eq.${userId}`,
    {
      method: "DELETE",
    },
    accessToken,
  );

  return true;
}

export async function getMissionControlLayout(accessToken: string, userId: string) {
  try {
    const params = new URLSearchParams({
      user_id: `eq.${userId}`,
      select: "id,user_id,layout,created_at,updated_at",
      limit: "1",
    });

    const rows = await supabaseFetch<SupabaseMissionControlLayoutRow[]>(
      `/rest/v1/mission_control_layouts?${params.toString()}`,
      { method: "GET" },
      accessToken,
    );

    return rows[0]?.layout ?? null;
  } catch {
    logSupabaseFailure("supabase_mission_layout_read_failed", userId);
    return null;
  }
}

export async function saveMissionControlLayout({
  accessToken,
  userId,
  layout,
}: {
  accessToken: string;
  userId: string;
  layout: unknown;
}) {
  const rows = await supabaseFetch<SupabaseMissionControlLayoutRow[]>(
    "/rest/v1/mission_control_layouts?on_conflict=user_id&select=id,user_id,layout,created_at,updated_at",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        layout,
      }),
    },
    accessToken,
  );

  return rows[0] ?? null;
}
