"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTrustedSiteOrigin } from "@/lib/security/site-origin";
import {
  clearAuthCookies,
  getCurrentUserSession,
  isSupabaseConfigured,
  prepareEmailVerificationFlow,
  sendPasswordReset,
  setAuthCookies,
  signInWithSupabase,
  signUpWithSupabase,
  updateProfile,
  updateUserPreferences,
} from "@/utils/supabase/server";
import type { AuthActionState } from "@/utils/supabase/types";

function readField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("host") || "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return getTrustedSiteOrigin(`${protocol}://${host}`);
}

function configurationError(): AuthActionState {
  return {
    error: "Authentication is temporarily unavailable.",
  };
}

export async function signInAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return configurationError();

  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");

  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  try {
    const session = await signInWithSupabase(email, password);
    await setAuthCookies(session);
  } catch {
    return {
      error: "Email or password was not recognized. Check your details and try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signUpAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return configurationError();

  const fullName = readField(formData, "fullName");
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");
  const confirmPassword = readField(formData, "confirmPassword");

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (!validEmail(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  let shouldRedirect = false;

  try {
    const origin = await getOrigin();
    const verificationRedirect = new URL("/auth/callback", origin);
    verificationRedirect.searchParams.set("next", "/account");
    verificationRedirect.searchParams.set("flow", "email");
    const codeChallenge = await prepareEmailVerificationFlow();
    const result = await signUpWithSupabase({
      email,
      password,
      fullName,
      emailRedirectTo: verificationRedirect.toString(),
      codeChallenge,
    });

    if ("access_token" in result && result.access_token) {
      await setAuthCookies(result);
      shouldRedirect = true;
    }
  } catch {
    return {
      error: "We could not create the account. Try signing in if this email is already registered.",
    };
  }

  if (shouldRedirect) {
    revalidatePath("/", "layout");
    redirect("/account");
  }

  return {
    success: "Verification email sent. Check your inbox to confirm your account.",
  };
}

export async function resetPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return configurationError();

  const email = readField(formData, "email").toLowerCase();
  if (!validEmail(email)) return { error: "Enter a valid email address." };

  try {
    await sendPasswordReset(email, `${await getOrigin()}/login`);
    return {
      success: "If an account exists for that email, Supabase will send a secure reset link shortly.",
    };
  } catch {
    return {
      error: "Unable to send a reset email. Please try again.",
    };
  }
}

export async function signOutAction() {
  await clearAuthCookies();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function updateProfileAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const session = await getCurrentUserSession();
  if (!session?.user) {
    return { error: "Sign in again to update your COSMOS profile." };
  }

  const fullName = readField(formData, "fullName");
  if (fullName.length < 2) return { error: "Enter a full name with at least 2 characters." };
  if (fullName.length > 100) return { error: "Full name must be 100 characters or fewer." };

  try {
    await updateProfile({
      accessToken: session.accessToken,
      user: session.user,
      fullName,
    });
    revalidatePath("/account");
    return { success: "Profile updated." };
  } catch {
    return {
      error: "Unable to update your profile right now.",
    };
  }
}

export async function updatePreferencesAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const session = await getCurrentUserSession();
  if (!session?.user) {
    return { error: "Sign in again to update your COSMOS preferences." };
  }

  const explanationLevel = readField(formData, "explanationLevel");
  const allowedLevels = new Set(["Beginner", "Student", "Researcher"]);
  const topics = formData
    .getAll("topics")
    .filter((topic): topic is string => typeof topic === "string" && topic.length <= 80)
    .slice(0, 8);

  if (!allowedLevels.has(explanationLevel)) {
    return { error: "Choose a valid explanation level." };
  }

  try {
    await updateUserPreferences({
      accessToken: session.accessToken,
      userId: session.user.id,
      preferences: {
        explanation_level: explanationLevel,
        topics,
        daily_briefing_emails: formData.get("dailyBriefingEmails") === "on",
        public_profile: formData.get("publicProfile") === "on",
      },
    });
    revalidatePath("/account");
    return { success: "Preferences saved." };
  } catch {
    return { error: "Unable to save preferences right now." };
  }
}
