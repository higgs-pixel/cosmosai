"use client";

import {
  Check,
  Facebook,
  Link2,
  Linkedin,
  MessageCircle,
  Share2,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildHomepageShareUrl,
  type HomepageSharePlatform,
} from "./homepage-contract";

type ShareAction = {
  platform: HomepageSharePlatform;
  label: string;
  icon: LucideIcon;
  hoverClass: string;
};

const shareActions: ShareAction[] = [
  { platform: "whatsapp", label: "Share on WhatsApp", icon: MessageCircle, hoverClass: "hover:border-emerald-400 hover:text-emerald-300" },
  { platform: "x", label: "Share on X", icon: Twitter, hoverClass: "hover:border-white hover:text-white" },
  { platform: "linkedin", label: "Share on LinkedIn", icon: Linkedin, hoverClass: "hover:border-blue-400 hover:text-blue-300" },
  { platform: "facebook", label: "Share on Facebook", icon: Facebook, hoverClass: "hover:border-indigo-400 hover:text-indigo-300" },
  { platform: "copy", label: "Copy link", icon: Link2, hoverClass: "hover:border-[#00E5FF] hover:text-[#00E5FF]" },
];

export function FooterShareMenu() {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  const closeSoon = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setCopyStatus("idle");
      triggerRef.current?.focus();
    }, 900);
  };

  const activate = async (platform: HomepageSharePlatform) => {
    const pageUrl = window.location.href;
    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(pageUrl);
        setCopyStatus("copied");
        closeSoon();
      } catch {
        setCopyStatus("failed");
      }
      return;
    }

    const shareUrl = buildHomepageShareUrl(platform, pageUrl, document.title || "Explore COSMOS AI");
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
    setCopyStatus("idle");
  };

  return (
    <div ref={rootRef} className="relative z-50 flex items-center justify-center">
      <div
        id="homepage-share-menu"
        role="menu"
        aria-label="Share COSMOS AI"
        aria-hidden={!open}
        className={`absolute bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#071018]/95 p-2 shadow-[0_0_30px_rgba(0,229,255,0.16)] backdrop-blur-xl transition-all duration-300 motion-reduce:transition-none ${open ? "visible translate-y-0 opacity-100" : "invisible translate-y-3 opacity-0"}`}
      >
        {shareActions.map((action, index) => {
          const Icon = action.platform === "copy" && copyStatus === "copied" ? Check : action.icon;
          const label = action.platform === "copy"
            ? copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : action.label
            : action.label;

          return (
            <button
              key={action.platform}
              type="button"
              role="menuitem"
              data-cursor-link="true"
              aria-label={label}
              title={label}
              tabIndex={open ? 0 : -1}
              onClick={() => void activate(action.platform)}
              style={{ transitionDelay: open ? `${index * 45}ms` : "0ms" }}
              className={`aryan-cursor-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/70 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00E5FF] motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:transition-none ${action.hoverClass} ${open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-75 opacity-0"}`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
            </button>
          );
        })}
      </div>

      <button
        ref={triggerRef}
        type="button"
        data-cursor-link="true"
        aria-label={open ? "Close share menu" : "Open share menu"}
        aria-expanded={open}
        aria-controls="homepage-share-menu"
        onClick={() => {
          setOpen((value) => !value);
          setCopyStatus("idle");
        }}
        className={`aryan-cursor-target flex h-10 w-10 items-center justify-center rounded-full border bg-transparent text-white/70 shadow-[0_0_16px_rgba(0,229,255,0.12)] transition-all duration-300 hover:border-[#00E5FF] hover:text-[#00E5FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00E5FF] motion-reduce:transition-none ${open ? "rotate-45 border-[#00E5FF] text-[#00E5FF]" : "border-white/20"}`}
      >
        <Share2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
      </button>

      <span className="sr-only" aria-live="polite">
        {copyStatus === "copied" ? "Link copied" : copyStatus === "failed" ? "Unable to copy link" : ""}
      </span>
    </div>
  );
}
