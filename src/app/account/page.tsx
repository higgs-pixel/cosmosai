import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { normalizeAccountPreferences } from "@/lib/account/preferences";
import {
  getCurrentUserSession,
  getProfile,
  getSupabaseSavedDiscoveries,
  getUserPreferences,
} from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your COSMOS AI account profile, preferences, and saved exploration activity.",
  robots: {
    index: false,
    follow: false,
  },
};

function fallbackNameFromEmail(email: string) {
  const prefix = email.split("@")[0] || "COSMOS Explorer";
  return prefix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

type AccountPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await getCurrentUserSession();
  if (!session?.user) redirect("/login");
  const params = await searchParams;

  const profile = await getProfile(session.accessToken, session.user.id);
  const preferencesRow = await getUserPreferences(session.accessToken, session.user.id);
  const email = session.user.email || profile?.email || "No email attached";
  const fullName = profile?.full_name || session.user.user_metadata?.full_name || fallbackNameFromEmail(email);

  let savedDiscoveriesCount = 0;
  try {
    savedDiscoveriesCount = (await getSupabaseSavedDiscoveries(session.accessToken, session.user.id)).length;
  } catch {
    // The account remains usable when optional activity metrics are unavailable.
  }

  return (
    <AccountDashboard
      fullName={fullName}
      email={email}
      role={profile?.role}
      preferences={normalizeAccountPreferences(
        preferencesRow
          ? {
              explanationLevel: preferencesRow.explanation_level,
              topics: preferencesRow.topics,
              dailyBriefingEmails: preferencesRow.daily_briefing_emails,
              publicProfile: preferencesRow.public_profile,
            }
          : null,
      )}
      metrics={{
        discoveries: savedDiscoveriesCount,
        bookmarks: 0,
        articlesRead: 0,
        collections: 0,
      }}
      notice={params.verified === "true" ? "Your email has been verified." : null}
    />
  );
}
