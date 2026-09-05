"use client";

import { forwardRef, HTMLAttributes } from "react";

export type GlassBadgeTone =
  | "emerald"
  | "cyan"
  | "amber"
  | "purple"
  | "pink"
  | "slate";

export interface GlassBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: GlassBadgeTone;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const GlassBadge = forwardRef<HTMLSpanElement, GlassBadgeProps>(
  (
    {
      tone = "cyan",
      dot = false,
      pulse = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const toneClasses: Record<GlassBadgeTone, { badge: string; dot: string }> = {
      emerald: {
        badge:
          "bg-emerald-500/10 border-emerald-400/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
        dot: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
      },
      cyan: {
        badge:
          "bg-cyan-500/10 border-cyan-400/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]",
        dot: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
      },
      amber: {
        badge:
          "bg-amber-500/10 border-amber-400/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
        dot: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
      },
      purple: {
        badge:
          "bg-purple-500/10 border-purple-400/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]",
        dot: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
      },
      pink: {
        badge:
          "bg-pink-500/10 border-pink-400/30 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.15)]",
        dot: "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]",
      },
      slate: {
        badge:
          "bg-white/[0.04] border-white/[0.10] text-slate-300 shadow-sm",
        dot: "bg-slate-400 shadow-none",
      },
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md ${toneClasses[tone].badge} ${className}`}
        {...props}
      >
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${toneClasses[tone].dot} ${
              pulse ? "animate-pulse" : ""
            }`}
          />
        )}
        {children}
      </span>
    );
  }
);

GlassBadge.displayName = "GlassBadge";
