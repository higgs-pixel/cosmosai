"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserAuthStatus } from "@/utils/supabase/client";

export function AuthNavLink({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "aryan";
}) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      const status = await getBrowserAuthStatus();
      if (mounted) setAuthenticated(status.authenticated);
    }

    void loadStatus();
    window.addEventListener("focus", loadStatus);
    return () => {
      mounted = false;
      window.removeEventListener("focus", loadStatus);
    };
  }, []);

  return (
    <Link
      href={authenticated ? "/account" : "/login"}
      data-cursor-link={variant === "aryan" ? "true" : undefined}
      className={cn(
        variant === "aryan"
          ? "aryan-cursor-target group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-[#00E5FF] bg-[#00E5FF] px-6 text-[10px] font-bold uppercase tracking-widest text-[#030508] transition-all duration-500 hover:scale-105 hover:border-[#007FFF] hover:bg-[#007FFF] hover:text-white hover:shadow-[0_0_40px_rgba(0,127,255,0.7)]"
          : "inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-4 text-sm font-semibold text-cosmos-frost transition hover:border-oxygen-300/35 hover:text-cosmos-white",
        className,
      )}
    >
      {variant === "aryan" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[aryan-sweep_1.5s_ease-in-out_infinite]"
        />
      ) : null}
      <span className="relative z-10 inline-flex items-center gap-2">
        <UserRound className="h-4 w-4" />
        {authenticated ? "Account" : "Login"}
      </span>
    </Link>
  );
}
