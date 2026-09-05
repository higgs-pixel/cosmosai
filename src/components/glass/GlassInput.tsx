"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

export interface GlassInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  containerClassName?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ icon: Icon, containerClassName = "", className = "", ...props }, ref) => {
    return (
      <div className={`relative flex items-center w-full ${containerClassName}`}>
        {Icon && (
          <Icon className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        )}
        <input
          ref={ref}
          className={`w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] focus:border-cyan-400/60 focus:bg-white/[0.05] rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none backdrop-blur-xl shadow-inner transition-all duration-200 font-mono py-2 ${
            Icon ? "pl-9 pr-3" : "px-3"
          } ${className}`}
          {...props}
        />
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";
