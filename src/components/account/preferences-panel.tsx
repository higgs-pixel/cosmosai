"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updatePreferencesAction } from "@/app/auth/actions";
import {
  EXPLANATION_LEVELS,
  INTEREST_TOPICS,
  type AccountPreferences,
} from "@/lib/account/preferences";

export function PreferencesPanel({ preferences }: { preferences: AccountPreferences }) {
  const [state, action, isPending] = useActionState(updatePreferencesAction, {});

  return (
    <section className="rounded-xl border border-white/5 bg-[#0F1115] p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Preferences</p>
      <h2 className="mt-2 text-xl font-semibold tracking-normal text-gray-100">Tune your COSMOS experience.</h2>

      <form action={action} className="mt-5 space-y-6">
        <fieldset>
          <legend className="text-sm font-semibold text-gray-300">Explanation level</legend>
          <div className="mt-3 grid gap-2">
            {EXPLANATION_LEVELS.map((level) => (
              <label
                key={level}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-white/5 bg-[#08090D] px-3 py-2 text-sm text-gray-300 transition hover:bg-[#16181D]"
              >
                <span>{level}</span>
                <input
                  type="radio"
                  name="explanationLevel"
                  value={level}
                  defaultChecked={preferences.explanationLevel === level}
                  className="h-4 w-4 accent-blue-400"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-gray-300">Topics of interest</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTEREST_TOPICS.map((topic) => (
              <label
                key={topic}
                className="cursor-pointer rounded-full border border-white/5 bg-[#08090D] px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-[#16181D] has-[:checked]:border-blue-400/30 has-[:checked]:bg-blue-500/20 has-[:checked]:text-blue-200"
              >
                <input
                  type="checkbox"
                  name="topics"
                  value={topic}
                  defaultChecked={preferences.topics.includes(topic)}
                  className="sr-only"
                />
                {topic}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-[#08090D] px-3 py-3 text-sm text-gray-300">
            <span>Daily briefing emails</span>
            <input
              type="checkbox"
              name="dailyBriefingEmails"
              defaultChecked={preferences.dailyBriefingEmails}
              className="h-4 w-4 accent-blue-400"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-[#08090D] px-3 py-3 text-sm text-gray-300">
            <span>Public profile</span>
            <input
              type="checkbox"
              name="publicProfile"
              defaultChecked={preferences.publicProfile}
              className="h-4 w-4 accent-blue-400"
            />
          </label>
        </div>

        {state.error ? (
          <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Saving" : "Save preferences"}
        </button>
      </form>
    </section>
  );
}
