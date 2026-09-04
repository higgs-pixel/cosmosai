"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateProfileAction } from "@/app/auth/actions";

export function AccountProfileForm({ fullName }: { fullName: string }) {
  const [state, action, isPending] = useActionState(updateProfileAction, {});

  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cosmos-mist">Full name</span>
        <input
          name="fullName"
          defaultValue={fullName}
          minLength={2}
          maxLength={120}
          required
          className="mt-2 h-11 w-full rounded-lg border border-white/5 bg-[#0F1115] px-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/15"
        />
      </label>

      {state.error ? (
        <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm leading-6 text-red-100">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-sm leading-6 text-emerald-100">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Save className="h-4 w-4" />
        {isPending ? "Saving" : "Save profile"}
      </button>
    </form>
  );
}
