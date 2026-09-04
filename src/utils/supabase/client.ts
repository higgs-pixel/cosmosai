"use client";

import {
  AUTH_CODE_VERIFIER_COOKIE,
  AUTH_FLOW_COOKIE_MAX_AGE,
  createPkceChallenge,
  createPkceVerifier,
} from "@/utils/supabase/auth-flow";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export async function getBrowserAuthStatus() {
  try {
    const response = await fetch("/api/auth/session", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (!response.ok) return { authenticated: false, configured: true };
    const json = (await response.json()) as { authenticated?: boolean; configured?: boolean };
    return {
      authenticated: Boolean(json.authenticated),
      configured: json.configured !== false,
    };
  } catch {
    return { authenticated: false, configured: false };
  }
}

export async function startGoogleOAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Google sign-in is temporarily unavailable.");
  }

  const verifier = createPkceVerifier();
  const challenge = await createPkceChallenge(verifier);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_CODE_VERIFIER_COOKIE}=${encodeURIComponent(verifier)}; Path=/; Max-Age=${AUTH_FLOW_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;

  const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
  const oauthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  oauthUrl.searchParams.set("provider", "google");
  oauthUrl.searchParams.set("redirect_to", redirectTo);
  oauthUrl.searchParams.set("code_challenge", challenge);
  oauthUrl.searchParams.set("code_challenge_method", "s256");

  window.location.assign(oauthUrl.toString());
}
