"use client";

import { forwardRef, HTMLAttributes } from "react";

export type GlassLevel = 1 | 2 | 3;

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  level?: GlassLevel;
  glow?: boolean;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable Liquid Glass Panel Component
 * Level 1: Very transparent floating controls (translucent sheen, light blur)
 * Level 2: Medium translucent information panels & cards (balanced frosted glass)
 * Level 3: High-density aerospace telemetry docks & modals (deep frosted obsidian)
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      level = 2,
      glow = false,
      interactive = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const levelClasses: Record<GlassLevel, string> = {
      1: "bg-slate-950/40 backdrop-blur-xl border border-white/[0.10] shadow-[0_8px_32px_0_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      2: "bg-slate-950/60 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_48px_0_rgba(0,0,0,0.50),inset_0_1px_0_0_rgba(255,255,255,0.12)]",
      3: "bg-slate-950/75 backdrop-blur-3xl border border-white/[0.15] shadow-[0_24px_64px_0_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.15)]",
    };

    const interactiveClasses = interactive
      ? "hover:border-white/[0.22] hover:bg-slate-900/65 hover:shadow-[0_20px_50px_0_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.18)] transition-all duration-300 transform-gpu hover:-translate-y-0.5 active:translate-y-0"
      : "";

    const glowClasses = glow
      ? "relative after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:shadow-[0_0_25px_rgba(6,182,212,0.18)]"
      : "";

    return (
      <div
        ref={ref}
        className={`rounded-2xl text-slate-100 ${levelClasses[level]} ${interactiveClasses} ${glowClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";
