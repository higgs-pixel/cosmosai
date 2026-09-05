"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, Radio } from "lucide-react";

interface CinematicNavProps {
  onScrollToSection: (id: string) => void;
  activeSection?: string;
  onOpenControls?: () => void;
}

export const CinematicNav = memo(function CinematicNav({
  onScrollToSection,
  activeSection = "hero",
  onOpenControls,
}: CinematicNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "hero", label: "SKY" },
    { id: "live-orbit", label: "LIVE ORBIT" },
    { id: "observer-map", label: "OBSERVER" },
    { id: "satellite-intelligence", label: "INTELLIGENCE" },
    { id: "upcoming-passes", label: "PASSES" },
    { id: "analytics", label: "ANALYTICS" },
    { id: "satellite-catalog", label: "CATALOG" },
    { id: "mission-dossier", label: "DOSSIER" },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 select-none ${
        isScrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-white/10 py-3.5"
          : "bg-transparent border-b border-transparent py-5"
      }`}
    >
      <div className="max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 flex items-center justify-between gap-6">
        {/* Left: Minimal Editorial Brand */}
        <div className="flex items-center gap-4">
          <Link
            href="/orbit"
            className="text-slate-400 hover:text-white transition-colors text-xs font-mono flex items-center gap-1.5"
            title="Return to Cosmos Core"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline uppercase tracking-widest text-[10px]">BACK</span>
          </Link>

          <span className="text-white/20">|</span>

          <button
            onClick={() => onScrollToSection("hero")}
            className="text-white font-extralight tracking-[0.25em] text-xs sm:text-sm uppercase hover:opacity-80 transition cursor-pointer"
          >
            TRACK MY SKY
          </button>
        </div>

        {/* Center: Thin Editorial Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-[11px] font-mono tracking-[0.2em] text-slate-300">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onScrollToSection(item.id)}
                className={`transition-colors duration-200 cursor-pointer uppercase ${
                  isActive
                    ? "text-white font-bold border-b border-cyan-400 pb-0.5"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Live indicator & Controls Trigger */}
        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="flex items-center gap-2 px-2.5 py-1 border border-white/10 bg-white/[0.02] rounded-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] tracking-widest text-slate-300 uppercase font-semibold">LIVE</span>
          </div>

          {onOpenControls && (
            <button
              onClick={onOpenControls}
              className="p-1.5 border border-white/10 hover:border-white text-slate-300 hover:text-white transition cursor-pointer"
              title="Toggle Observatory Console Controls"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
});

export default CinematicNav;
