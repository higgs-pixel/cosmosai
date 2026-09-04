import { UserRound } from "lucide-react";
import { AccountProfileForm } from "@/components/auth/account-profile-form";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function displayRole(role?: string | null) {
  if (!role || role === "user") return "Member";
  return role
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
    .join(" ");
}

export function ProfileCard({
  fullName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role?: string | null;
}) {
  return (
    <section className="rounded-xl border border-white/5 bg-[#0F1115] p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-blue-400/20 bg-blue-500/15 font-mono text-lg font-semibold text-blue-300">
          {fullName ? initialsFromName(fullName) : <UserRound className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Profile Summary</p>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-normal text-gray-100">{fullName}</h1>
          <p className="mt-1 truncate text-sm text-gray-500">{email}</p>
          <span className="mt-4 inline-flex rounded-full border border-blue-400/15 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
            {displayRole(role)}
          </span>
        </div>
      </div>

      <details className="group mt-6">
        <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-lg border border-white/10 bg-[#13161C] px-4 text-sm font-semibold text-gray-100 transition hover:bg-[#16181D] active:scale-[0.98]">
          Edit Profile
        </summary>
        <div className="mt-4 rounded-lg border border-white/5 bg-[#08090D] p-4">
          <AccountProfileForm fullName={fullName} />
        </div>
      </details>
    </section>
  );
}
