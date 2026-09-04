import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "cosmos-sb-access-token";
const REFRESH_COOKIE = "cosmos-sb-refresh-token";

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!url || !key || accessToken || !refreshToken) return response;

  try {
    const refreshResponse = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!refreshResponse.ok) return response;

    const session = (await refreshResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const secure = process.env.NODE_ENV === "production";

    if (session.access_token) {
      response.cookies.set(ACCESS_COOKIE, session.access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: Math.max(session.expires_in || 60 * 60, 60),
      });
    }

    if (session.refresh_token) {
      response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  } catch {
    return response;
  }

  return response;
}
