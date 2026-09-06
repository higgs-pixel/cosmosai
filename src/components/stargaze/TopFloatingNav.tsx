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
  Eye,
  Target,
  BarChart2,
  FileText,
  Globe,
} from "lucide-react";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

export interface TopFloatingNavProps {
  observer: ObserverCoords;
  currentDate: Date;
  isMobileSynced: boolean;
  onOpenMobileSync: () => void;
  mobileSightMode?: "ar" | "track";
  onToggleMobileSightMode?: () => void;
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
  onOpenGlossary?: () => void;
  onToggleTelemetryDrawer: () => void;
  isTelemetryDrawerOpen: boolean;
  visible24hCount: number;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onToggleTelemetryPanel?: () => void;
  isTelemetryPanelOpen?: boolean;
  onToggleGraph?: () => void;
  showGraph?: boolean;
}

export function TopFloatingNav({
  observer,
  currentDate,
  isMobileSynced,
  onOpenMobileSync,
  mobileSightMode = "track",
  onToggleMobileSightMode,
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
  onOpenGlossary,
  onToggleTelemetryDrawer,
  isTelemetryDrawerOpen,
  visible24hCount,
  searchQuery = "",
  onSearchChange,
  onToggleTelemetryPanel,
  isTelemetryPanelOpen = false,
  onToggleGraph,
  showGraph = false,
}: TopFloatingNavProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <header className="relative z-50 w-full bg-black/95 border-b border-zinc-850 backdrop-blur-xl select-none font-sans">
      {/* ── TOP UTILITY & BRAND BAR ── */}
      <div className="w-full px-4 sm:px-8 py-2.5 flex items-center justify-between gap-4 border-b border-zinc-900/80">
        {/* Brand Logo - NASA Editorial Geometric Typography */}
        <div className="flex items-center gap-4 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white hover:text-cyan-400 transition group"
          >
            
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-xs tracking-[0.2em] text-white uppercase font-sans">
                COSMOS AI
              </span>
              <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase">
                STARGAZE OBSERVATORY
              </span>
            </div>
          </Link>

          <span className="h-4 w-px bg-zinc-800 hidden sm:inline" />

          {/* Observer GPS Coordinates readout */}
          <div
            className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white transition truncate max-w-[280px]"
            title={`Observer Site: ${observer.name}`}
          >
            <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="truncate">GPS ({observer.lat.toFixed(4)}°, {observer.lon.toFixed(4)}°)</span>
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
        <div className="flex items-center gap-2.5 shrink-0 text-xs font-mono">
          {/* Active Sensor / Telemetry Count */}
          <button
            onClick={onToggleTelemetryDrawer}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border transition cursor-pointer ${
              isTelemetryDrawerOpen
                ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 font-bold"
                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:border-zinc-700"
            }`}
            title="Open Satellite Fleet Catalog"
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
                ? "border-emerald-400/80 bg-emerald-950/40 text-emerald-300 font-bold"
                : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700"
            }`}
            title={isMobileSynced ? "Phone compass connected" : "Pair smartphone compass via QR"}
          >
            <Smartphone className={`h-3 w-3 ${isMobileSynced ? "text-emerald-400 animate-pulse" : "text-zinc-400"}`} />
            <span className="hidden sm:inline">
              {isMobileSynced ? "Phone Synced" : "Pair Phone"}
            </span>
          </button>

          {/* AR View vs Track View Toggle Tab (Visible when Phone is Synced) */}
          {isMobileSynced && onToggleMobileSightMode && (
            <button
              onClick={onToggleMobileSightMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] border transition cursor-pointer font-bold ${
                mobileSightMode === "ar"
                  ? "border-cyan-400 bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "border-cyan-500/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40"
              }`}
              title={
                mobileSightMode === "ar"
                  ? "Currently in 1st-Person AR View (Click to switch to 3D Track View)"
                  : "Currently in 3D Track View (Click to switch to 1st-Person AR View)"
              }
            >
              <Eye className="h-3 w-3" />
              <span>{mobileSightMode === "ar" ? "Mode: AR View" : "Mode: Track View"}</span>
            </button>
          )}

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
      <div className="w-full px-4 sm:px-8 py-1.5 flex items-center justify-between gap-6 overflow-x-auto scrollbar-none text-[11px] tracking-[0.16em] uppercase font-mono">
        {/* Navigation Categories with Indicators */}
        <nav className="flex items-center gap-5 sm:gap-7 shrink-0">
          <button
            onClick={onToggleTelemetryDrawer}
            className={`flex items-center gap-1 transition cursor-pointer ${
              isTelemetryDrawerOpen ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Satellite className="h-3 w-3" />
            <span>Missions Catalog</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-70" />
          </button>

          {onToggleTelemetryPanel && (
            <button
              onClick={onToggleTelemetryPanel}
              className={`flex items-center gap-1 transition cursor-pointer ${
                isTelemetryPanelOpen ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Target className="h-3 w-3" />
              <span>Telemetry Data</span>
              <ChevronDown className="h-2.5 w-2.5 opacity-50" />
            </button>
          )}

          {onToggleGraph && (
            <button
              onClick={onToggleGraph}
              className={`flex items-center gap-1 transition cursor-pointer ${
                showGraph ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <BarChart2 className="h-3 w-3" />
              <span>Pass Profile Graph</span>
              <ChevronDown className="h-2.5 w-2.5 opacity-50" />
            </button>
          )}

          <button
            onClick={onToggleSimDock}
            className={`flex items-center gap-1 transition cursor-pointer ${
              showSimDock ? "text-cyan-400 font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Play className="h-2.5 w-2.5 text-cyan-400" />
            <span>24h Sim Dock</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </button>

          {onOpenGlossary && (
            <button
              onClick={onOpenGlossary}
              className="flex items-center gap-1 text-zinc-400 hover:text-cyan-400 transition cursor-pointer"
              title="Open Astrophysics & Astrometry Glossary"
            >
              <Globe className="h-2.5 w-2.5 text-cyan-400" />
              <span>Glossary</span>
            </button>
          )}

          <button
            onClick={onOpenManual}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <BookOpen className="h-2.5 w-2.5 text-emerald-400" />
            <span>Docs &amp; Guide</span>
          </button>
        </nav>

        {/* Quick Layer Controls - Flat 1px borders */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0 border-l border-zinc-800 pl-4">
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
