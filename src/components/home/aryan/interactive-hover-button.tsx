"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

type InteractiveHoverButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
};

const buttonClasses =
  "aryan-cursor-target group relative inline-flex items-center justify-center overflow-hidden rounded-xl border-2 border-[#00E5FF] bg-[#00E5FF] font-sans font-bold text-[#030508] transition-all duration-500 hover:scale-105 hover:border-[#007FFF] hover:bg-[#007FFF] hover:text-white hover:shadow-[0_0_40px_rgba(0,127,255,0.7)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100";

function ButtonContent({ children }: { children: ReactNode }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[aryan-sweep_1.5s_ease-in-out_infinite]"
      />
      <span className="relative z-10 flex items-center gap-2 tracking-widest uppercase transition-colors duration-300">
        {children}
      </span>
    </>
  );
}

export function InteractiveHoverButton({
  children,
  className = "",
  href,
  disabled = false,
  onClick,
  ariaLabel,
}: InteractiveHoverButtonProps) {
  const classes = `${buttonClasses} ${className}`;

  if (href && !disabled) {
    return (
      <Link href={href} data-cursor-link="true" className={classes} aria-label={ariaLabel}>
        <ButtonContent>{children}</ButtonContent>
      </Link>
    );
  }

  return (
    <button
      type="button"
      data-cursor-link="true"
      className={classes}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <ButtonContent>{children}</ButtonContent>
    </button>
  );
}
