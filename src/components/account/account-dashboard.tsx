import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { ActivityMetrics, type AccountActivityMetrics } from "@/components/account/activity-metrics";
import { ContinueExploring } from "@/components/account/continue-exploring";
import { PreferencesPanel } from "@/components/account/preferences-panel";
import { ProfileCard } from "@/components/account/profile-card";
import { QuickActions } from "@/components/account/quick-actions";
import type { AccountPreferences } from "@/lib/account/preferences";

export function AccountDashboard({
  fullName,
  email,
  role,
  preferences,
  metrics,
  notice,
}: {
  fullName: string;
  email: string;
  role?: string | null;
  preferences: AccountPreferences;
  metrics: AccountActivityMetrics;
  notice?: string | null;
}) {
  return (
    <main id="main-content" className="min-h-screen bg-[#050507] px-4 py-6 text-gray-100 md:px-8 md:py-8">
      <section className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/5 bg-[#0F1115] px-3 text-sm font-semibold text-gray-400 transition hover:bg-[#16181D] hover:text-gray-100 active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" />
              COSMOS AI
            </Link>
            <h1 className="mt-6 text-3xl font-semibold tracking-normal text-gray-100 md:text-4xl">
              Account Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Manage your COSMOS profile, preferences, saved activity, and next exploration path.
            </p>
          </div>

          <form action={signOutAction}>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/5 bg-[#0F1115] px-4 text-sm font-semibold text-gray-300 transition hover:bg-[#16181D] hover:text-gray-100 active:scale-[0.98]">
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </form>
        </header>

        {notice ? (
          <div className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100" role="status">
            {notice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <aside className="contents lg:block lg:space-y-5">
            <div className="order-1 lg:order-none">
              <ProfileCard fullName={fullName} email={email} role={role} />
            </div>
            <div className="order-5 lg:order-none">
              <PreferencesPanel preferences={preferences} />
            </div>
          </aside>

          <section className="order-2 lg:col-span-2 lg:space-y-5">
            <div className="space-y-5">
              <QuickActions />
              <ContinueExploring />
              <ActivityMetrics metrics={metrics} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
