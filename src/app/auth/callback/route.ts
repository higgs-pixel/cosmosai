import { NextResponse, type NextRequest } from "next/server";
import { getTrustedSiteOrigin } from "@/lib/security/site-origin";
import { createSecurityRequestId, logSecurityEvent } from "@/lib/security/logger";
import { validateInternalAuthRedirect } from "@/utils/supabase/auth-flow";
import {
  clearAuthFlowCookies,
  exchangeAuthCodeForSession,
  hasAuthCodeVerifier,
  setAuthCookies,
} from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const requestId = createSecurityRequestId();
  let siteOrigin: string;
  try {
    siteOrigin = getTrustedSiteOrigin(request.nextUrl.origin);
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable.", requestId }, { status: 503 });
  }
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const flow = searchParams.get("flow");
  const next = validateInternalAuthRedirect(searchParams.get("next"));
  const providerError = searchParams.get("error") || searchParams.get("error_code");

  if (providerError || !code) {
    await clearAuthFlowCookies();
    const error = flow === "email" ? "invalid_or_expired_link" : "google_sign_in_failed";
    return NextResponse.redirect(new URL(`/login?error=${error}`, siteOrigin));
  }

  const hasVerifier = await hasAuthCodeVerifier();
  if (!hasVerifier) {
    await clearAuthFlowCookies();
    const destination = flow === "email" ? "/login?status=email_verified" : "/login?error=auth_callback_failed";
    return NextResponse.redirect(new URL(destination, siteOrigin));
  }

  try {
    const session = await exchangeAuthCodeForSession(code);
    await setAuthCookies(session);
    await clearAuthFlowCookies();

    const destination = new URL(next, siteOrigin);
    if (flow === "email") destination.searchParams.set("verified", "true");
    return NextResponse.redirect(destination);
  } catch {
    logSecurityEvent("auth_callback_failed", {
      endpoint: "/auth/callback",
      requestId,
      flow: flow === "email" ? "email" : "oauth",
      reason: "code_exchange_failed",
    });
    await clearAuthFlowCookies();
    const failure = flow === "email" ? "invalid_or_expired_link" : "auth_callback_failed";
    return NextResponse.redirect(new URL(`/login?error=${failure}`, siteOrigin));
  }
}
