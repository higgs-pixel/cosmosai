"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Satellite,
  Compass,
  Radio,
  Clock,
  MapPin,
  Maximize2,
  Minimize2,
  Smartphone,
  BookOpen,
  Layers,
  Play,
  Search,
  ChevronDown,
  ExternalLink,
  Target,
} from "lucide-react";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

export interface TopFloatingNavProps {
  observer: ObserverCoords;
  currentDate: Date;
  isMobileSynced: boolean;
  onOpenMobileSync: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  showOrbits: boolean;
  onToggleOrbits: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRadar: boolean;
  onToggleRadar: () => void;
  showSimDock: boolean;
  onToggleSimDock: () => void;
  is180DomeView: boolean;
  onToggle180DomeView: () => void;
  onOpenManual: () => void;
  onToggleTelemetryDrawer: () => void;
  isTelemetryDrawerOpen: boolean;
  visible24hCount: number;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export function TopFloatingNav({
  observer,
  currentDate,
  isMobileSynced,
  onOpenMobileSync,
  showLabels,
  onToggleLabels,
  showOrbits,
  onToggleOrbits,
  showGrid,
  onToggleGrid,
  showRadar,
  onToggleRadar,
  showSimDock,
  onToggleSimDock,
  is180DomeView,
  onToggle180DomeView,
  onOpenManual,
  onToggleTelemetryDrawer,
  isTelemetryDrawerOpen,
  visible24hCount,
  searchQuery = "",
  onSearchChange,
}: TopFloatingNavProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black/95 border-b border-zinc-850 backdrop-blur-xl select-none font-sans">
      {/* ── TOP UTILITY & BRAND BAR ── */}
      <div className="w-full px-4 sm:px-8 py-2.5 flex items-center justify-between gap-4 border-b border-zinc-900/80">
        {/* Brand Logo - NASA Editorial Geometric Typography */}
        <div className="flex items-center gap-4 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white hover:text-cyan-400 transition group"
          >
            <div className="px-2 py-0.5 border border-white text-white font-black tracking-widest text-sm sm:text-base font-mono uppercase transition group-hover:border-cyan-400 group-hover:text-cyan-400">
              NASA
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-xs tracking-[0.2em] text-white uppercase font-sans">
                COSMOS
              </span>
              <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase">
                STARGAZE OBSERVATORY
              </span>
            </div>
          </Link>

          <span className="h-4 w-px bg-zinc-800 hidden sm:inline" />

          {/* Quick Observatory Tag */}
          <div
            onClick={() => scrollToSection("stargaze-ground-station")}
            className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white cursor-pointer transition truncate max-w-[240px]"
            title="Click to view observer location"
          >
            <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="truncate">{observer.name}</span>
          </div>
        </div>

        {/* Central Search Box - NASA Style */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search spacecraft, NORAD ID, or mission..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-none pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-zinc-500 font-sans focus:outline-none transition"
            />
          </div>
        </div>

        {/* Right Status & Quick Utilities */}
        <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
          {/* Active Sensor / Telemetry Count */}
          <button
            onClick={() => scrollToSection("stargaze-catalog")}
            className="flex items-center gap-1.5 px-2.5 py-1 text-zinc-300 hover:text-white border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition cursor-pointer"
            title="Jump to satellite catalog"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />
            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
              {visible24hCount}
            </span>
            <span className="text-[10px] text-zinc-400 uppercase hidden sm:inline">
              Passes in 24h
            </span>
          </button>

          {/* Mobile Phone Sync Button */}
          <button
            onClick={onOpenMobileSync}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] border transition cursor-pointer ${
              isMobileSynced
                ? "border-cyan-400/80 bg-cyan-950/40 text-cyan-300 font-bold"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
            title={isMobileSynced ? "Phone compass connected" : "Pair smartphone compass via QR"}
          >
            <Smartphone className={`h-3 w-3 ${isMobileSynced ? "text-cyan-400 animate-pulse" : "text-zinc-400"}`} />
            <span className="hidden sm:inline">
              {isMobileSynced ? "Sensors Synced" : "Pair Phone"}
            </span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition cursor-pointer"
            title="Toggle fullscreen mode"
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* ── SUB-NAVIGATION ROW (NASA EDITORIAL MENU) ── */}
      <div className="w-full px-4 sm:px-8 py-2 flex items-center justify-between gap-6 overflow-x-auto scrollbar-none text-[11px] tracking-[0.18em] uppercase font-mono">
        {/* Navigation Categories with Dropdown Indicators */}
        <nav className="flex items-center gap-5 sm:gap-7 shrink-0">
          <button
            onClick={() => scrollToSection("stargaze-hero")}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <span>Dome View</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </button>

          <button
            onClick={() => scrollToSection("stargaze-telemetry")}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <span>Telemetry</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </button>

          <button
            onClick={() => scrollToSection("stargaze-trajectory")}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <span>Pass Graph</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </button>

          <button
            onClick={() => scrollToSection("stargaze-ground-station")}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <span>Ground Station</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </button>

          <button
            onClick={() => scrollToSection("stargaze-catalog")}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition cursor-pointer"
          >
            <span>Missions Catalog</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-70" />
          </button>

          <button
            onClick={onToggleSimDock}
            className={`flex items-center gap-1 transition cursor-pointer ${
              showSimDock ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Play className="h-2.5 w-2.5 text-cyan-400" />
            <span>24h Sim</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </button>

          <button
            onClick={onOpenManual}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <BookOpen className="h-2.5 w-2.5 text-emerald-400" />
            <span>Docs &amp; Guide</span>
          </button>
        </nav>

        {/* Quick Layer Controls - Flat 1px borders */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0 border-l border-zinc-800 pl-4">
          <span className="text-[10px] text-zinc-500 tracking-widest mr-1">LAYERS:</span>

          <button
            onClick={onToggleLabels}
            className={`px-2 py-0.5 border text-[10px] transition cursor-pointer ${
              showLabels
                ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
          >
            Labels
          </button>

          <button
            onClick={onToggleOrbits}
            className={`px-2 py-0.5 border text-[10px] transition cursor-pointer ${
              showOrbits
                ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
          >
            Orbits
          </button>

          <button
            onClick={onToggleGrid}
            className={`px-2 py-0.5 border text-[10px] transition cursor-pointer ${
              showGrid
                ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
          >
            Grid
          </button>

          <button
            onClick={onToggleRadar}
            className={`px-2 py-0.5 border text-[10px] transition cursor-pointer ${
              showRadar
                ? "border-cyan-400 bg-cyan-950/40 text-cyan-300 font-bold"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
          >
            Radar
          </button>

          <button
            onClick={onToggle180DomeView}
            className={`px-2 py-0.5 border text-[10px] transition cursor-pointer flex items-center gap-1 ${
              is180DomeView
                ? "border-emerald-400 bg-emerald-950/40 text-emerald-300 font-bold"
                : "border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
          >
            <Compass className="h-2.5 w-2.5" />
            <span>{is180DomeView ? "Horizon Locked" : "Free Orbit"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
