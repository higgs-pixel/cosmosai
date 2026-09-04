import type { Metadata } from "next";
import { resetPasswordAction } from "@/app/auth/actions";
import { CosmosAuthCard } from "@/components/auth/cosmos-auth-card";
import { getSupabaseRuntimeConfigStatus } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a secure COSMOS AI password reset email.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  const configStatus = getSupabaseRuntimeConfigStatus();
  return <CosmosAuthCard mode="forgot" action={resetPasswordAction} configurationMessage={configStatus.message} />;
}
