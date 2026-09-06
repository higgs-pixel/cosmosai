"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Search,
  Smartphone,
  ChevronDown,
  BookOpen,
  FileText,
} from "lucide-react";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

interface TrackMySkyNavProps {
  observer: ObserverCoords;
  formattedTime: string;
  onOpenPairModal?: () => void;
  onOpenManual?: () => void;
  onOpenKnowledge?: (tab: "glossary" | "docs") => void;
  onScrollToSection: (id: string) => void;
  activeSection?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function TrackMySkyNav({
  observer,
  formattedTime,
  onOpenPairModal,
  onOpenManual,
  onOpenKnowledge,
  onScrollToSection,
  activeSection = "hero",
  searchQuery = "",
  onSearchChange,
}: TrackMySkyNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "hero", label: "Overview" },
    { id: "satellite-info-section", label: "Mission Focus" },
    { id: "console-section", label: "Observatory Console" },
    { id: "viewports-section", label: "Viewports" },
    { id: "passes-section", label: "Pass Predictor" },
    { id: "analytics-section", label: "Astrometry" },
    { id: "fleet-table-section", label: "Fleet Catalog" },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
        isScrolled ? "bg-black/95 border-b border-zinc-850 backdrop-blur-md" : "bg-black/85 border-b border-zinc-900 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Upper Editorial Row: Brand, Search Bar, Companion GPS & Actions */}
        <div className="flex h-14 items-center justify-between gap-4 border-b border-zinc-900">
          {/* Brand: Bold NASA-Style Sans Logo */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/orbit"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition font-sans text-xs uppercase tracking-wider group mr-2"
              title="Return to Orbit Workspace"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Orbit</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="text-base sm:text-lg font-black tracking-[0.2em] text-white uppercase font-sans select-none">
                COSMOS AI
              </span>
              <span className="h-4 w-px bg-zinc-800 hidden sm:block" />
              <span className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase font-semibold font-sans hidden sm:block">
                Track My Sky
              </span>
            </div>
          </div>

          {/* Center Search Input (Exact NASA reference style) */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange?.(e.target.value);
                  if (e.target.value) {
                    onScrollToSection("fleet-table-section");
                  }
                }}
                placeholder="Search fleet catalog or NORAD ID…"
                className="w-full h-8 pl-9 pr-3 rounded-none bg-zinc-950 border border-zinc-800 text-xs font-sans text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              />
            </div>
          </div>

          {/* Right Controls: Companion Phone Link, Observer Site & Live Time */}
          <div className="flex items-center gap-4 text-xs font-sans">
            {/* Observer Geodetic Site Pill (Click to open Country / GPS Console) */}
            <button
              onClick={() => onScrollToSection("console-section")}
              className="hidden lg:flex items-center gap-1.5 text-zinc-400 hover:text-cyan-300 transition-colors max-w-[220px] truncate cursor-pointer px-2 py-1 rounded bg-zinc-950/80 border border-zinc-850 hover:border-cyan-500/40"
              title={`Observer Site: ${observer.name} (Click to switch country or GPS)`}
            >
              <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="truncate text-[11px] font-sans text-zinc-200">{observer.name}</span>
            </button>

            {/* Companion Smartphone GPS Sync */}
            {onOpenPairModal && (
              <button
                onClick={onOpenPairModal}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition uppercase text-[11px] tracking-wider font-medium cursor-pointer"
                title="Pair Smartphone GPS sensor"
              >
                <Smartphone className="h-3.5 w-3.5 text-zinc-500" />
                <span className="hidden xl:inline">Companion GPS</span>
              </button>
            )}

            {/* Observatory Clock */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-zinc-300 pl-2 border-l border-zinc-800">
              <Clock className="h-3 w-3 text-zinc-500" />
              <span>{formattedTime}</span>
            </div>
          </div>
        </div>

        {/* Lower Editorial Sub-Navigation Bar: Small Uppercase Labels with Dropdowns */}
        <nav className="flex items-center gap-6 sm:gap-8 overflow-x-auto py-2 scrollbar-none font-sans">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onScrollToSection(item.id)}
                className={`flex items-center gap-1 shrink-0 text-[11px] uppercase tracking-[0.15em] font-medium transition cursor-pointer ${
                  isActive
                    ? "text-white font-bold border-b border-white pb-0.5"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>{item.label}</span>
                <ChevronDown className="h-2.5 w-2.5 opacity-40" />
              </button>
            );
          })}

          {onOpenManual ? (
            <button
              onClick={onOpenManual}
              className="ml-auto flex items-center gap-1 shrink-0 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            >
              <span>Guide &amp; Glossary</span>
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
