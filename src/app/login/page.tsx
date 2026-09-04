import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/auth/actions";
import { CosmosAuthCard } from "@/components/auth/cosmos-auth-card";
import { getCurrentUserSession, getSupabaseRuntimeConfigStatus } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to COSMOS AI to access your account and saved space discoveries.",
  robots: {
    index: false,
    follow: false,
  },
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  google_sign_in_failed: "Google sign-in was not completed. Please try again.",
  auth_callback_failed: "We could not complete sign-in securely. Please try again.",
  invalid_or_expired_link: "This confirmation link is invalid or has expired. Request a new email and try again.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentUserSession();
  if (session?.user) redirect("/account");
  const configStatus = getSupabaseRuntimeConfigStatus();
  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const statusKey = typeof params.status === "string" ? params.status : "";

  return (
    <CosmosAuthCard
      mode="login"
      action={signInAction}
      configurationMessage={configStatus.message}
      initialError={errorMessages[errorKey] || null}
      initialSuccess={statusKey === "email_verified" ? "Your email has been verified. Please sign in." : null}
    />
  );
}
