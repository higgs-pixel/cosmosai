"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";

export type GlassButtonVariant =
  | "default"
  | "primary"
  | "accent"
  | "success"
  | "amber"
  | "ghost";

export interface GlassButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GlassButtonVariant;
  size?: "xs" | "sm" | "md" | "lg";
  isActive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      variant = "default",
      size = "sm",
      isActive = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: "px-2 py-1 text-[10px] rounded-lg gap-1",
      sm: "px-2.5 py-1.5 text-xs rounded-xl gap-1.5",
      md: "px-3.5 py-2 text-xs rounded-xl gap-2",
      lg: "px-4 py-2.5 text-sm rounded-2xl gap-2.5",
    };

    const variantClasses: Record<GlassButtonVariant, string> = {
      default: isActive
        ? "bg-white/[0.12] border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.15),inset_0_1px_0_0_rgba(255,255,255,0.2)] font-bold"
        : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.10] hover:border-white/[0.22] text-slate-300 hover:text-white shadow-sm",
      primary: isActive
        ? "bg-cyan-500/25 border-cyan-400/70 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)] font-bold"
        : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-400/50 text-cyan-300 hover:text-cyan-100",
      accent: isActive
        ? "bg-pink-600/30 border-pink-400/80 text-pink-100 shadow-[0_0_20px_rgba(236,72,153,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)] font-bold"
        : "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30 hover:border-pink-400/50 text-pink-300 hover:text-pink-100",
      success: isActive
        ? "bg-emerald-500/25 border-emerald-400/70 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)] font-bold"
        : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-400/50 text-emerald-300 hover:text-emerald-100",
      amber: isActive
        ? "bg-amber-500/25 border-amber-400/70 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)] font-bold"
        : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 hover:border-amber-400/50 text-amber-300 hover:text-amber-100",
      ghost:
        "bg-transparent hover:bg-white/[0.06] border-transparent hover:border-white/10 text-slate-400 hover:text-slate-200",
    };

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-semibold border backdrop-blur-xl transition-all duration-200 cursor-pointer select-none disabled:opacity-40 disabled:pointer-events-none transform-gpu active:scale-95 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";
