import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/auth/actions";
import { CosmosAuthCard } from "@/components/auth/cosmos-auth-card";
import { getCurrentUserSession, getSupabaseRuntimeConfigStatus } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a COSMOS AI account for saved discoveries and future mission tools.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SignupPage() {
  const session = await getCurrentUserSession();
  if (session?.user) redirect("/account");
  const configStatus = getSupabaseRuntimeConfigStatus();

  return (
    <CosmosAuthCard
      mode="signup"
      action={signUpAction}
      configurationMessage={configStatus.message}
    />
  );
}
