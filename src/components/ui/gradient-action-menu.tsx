"use client";

import Link from "next/link";
import {
  Bookmark,
  Film,
  Heart,
  ImageIcon,
  Share2,
  Sparkles,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

type GradientMenuAction = {
  title: string;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  ariaLabel?: string;
};

type GradientActionMenuProps = {
  actions?: GradientMenuAction[];
  className?: string;
  label?: string;
};

const defaultActions: GradientMenuAction[] = [
  { title: "Images", icon: ImageIcon, gradientFrom: "#38bdf8", gradientTo: "#2563eb" },
  { title: "Videos", icon: Film, gradientFrom: "#22d3ee", gradientTo: "#4f46e5" },
  { title: "Audio", icon: Volume2, gradientFrom: "#67e8f9", gradientTo: "#7c3aed" },
  { title: "Saved", icon: Bookmark, gradientFrom: "#34d399", gradientTo: "#0ea5e9", href: "/discoveries" },
  { title: "Share", icon: Share2, gradientFrom: "#93c5fd", gradientTo: "#06b6d4" },
];

function actionStyle(action: GradientMenuAction) {
  return {
    "--gradient-from": action.gradientFrom,
    "--gradient-to": action.gradientTo,
  } as CSSProperties;
}

function ActionButton({ action }: { action: GradientMenuAction }) {
  const Icon = action.icon;
  const className = [
    "group relative isolate inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border text-cosmos-frost shadow-lg transition-all duration-300 ease-out focus-visible:w-36 hover:w-36 max-sm:h-14 max-sm:w-[4.8rem] max-sm:flex-col max-sm:gap-0.5 max-sm:rounded-[1rem] max-sm:px-2",
    "border-white/10 bg-white/[0.07] hover:border-oxygen-400/30 focus-visible:border-oxygen-400/40",
    "motion-reduce:transition-none motion-reduce:hover:w-12 motion-reduce:focus-visible:w-12 motion-reduce:max-sm:w-[4.8rem]",
    action.active ? "border-oxygen-300/55 text-cosmos-white shadow-glow-oxygen" : "",
  ].join(" ");
  const content = (
    <>
      <span className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
      <span className="absolute inset-x-0 top-2 -z-10 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 blur-[14px] transition-opacity duration-300 group-hover:opacity-40 group-focus-visible:opacity-40 motion-reduce:transition-none" />
      <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-cosmos-black/35 transition duration-300 group-hover:scale-0 group-focus-visible:scale-0 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100 max-sm:h-7 max-sm:w-7 max-sm:group-hover:scale-100 max-sm:group-focus-visible:scale-100">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="absolute z-10 scale-0 whitespace-nowrap px-4 text-xs font-bold uppercase tracking-[0.16em] text-white opacity-0 transition duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:hidden max-sm:static max-sm:scale-100 max-sm:px-0 max-sm:text-[9px] max-sm:tracking-[0.08em] max-sm:opacity-100 max-sm:motion-reduce:block">
        {action.title}
      </span>
    </>
  );

  if (action.href) {
    return (
      <Link
        href={action.href}
        className={className}
        style={actionStyle(action)}
        aria-label={action.ariaLabel ?? action.title}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={className}
      style={actionStyle(action)}
      aria-label={action.ariaLabel ?? action.title}
      aria-pressed={action.active}
    >
      {content}
    </button>
  );
}

export function GradientActionMenu({
  actions = defaultActions,
  className = "",
  label = "Archive actions",
}: GradientActionMenuProps) {
  return (
    <nav
      className={`inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-full border border-oxygen-400/14 bg-cosmos-black/36 p-1.5 backdrop-blur-xl [scrollbar-width:none] ${className}`}
      aria-label={label}
    >
      <span className="hidden items-center gap-2 pl-2 pr-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist sm:inline-flex">
        <Sparkles className="h-3.5 w-3.5 text-oxygen-400" />
        Actions
      </span>
      {actions.map((action) => (
        <ActionButton key={action.title} action={action} />
      ))}
      <Heart className="sr-only" aria-hidden="true" />
    </nav>
  );
}
