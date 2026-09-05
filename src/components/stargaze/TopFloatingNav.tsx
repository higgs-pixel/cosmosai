"use client";

import { motion } from "framer-motion";
import {
  Satellite,
  Compass,
  Radio,
  Clock,
  MapPin,
  Maximize2,
  Smartphone,
  BookOpen,
  Layers,
  Play,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

interface TopFloatingNavProps {
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
}: TopFloatingNavProps) {
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="absolute top-3 inset-x-3 sm:inset-x-6 z-40 pointer-events-none flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 pointer-events-auto flex-wrap">
        {/* LEFT: Compact Spatial Identity & Title Treatment */}
        <GlassPanel
          level={1}
          className="px-3.5 py-2 flex items-center gap-3 shrink-0 shadow-2xl"
        >
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
            <Satellite className="h-4 w-4" />
          </div>

          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs tracking-wider text-white font-sans">
                SKY EXPLORER
              </span>
              <GlassBadge tone="cyan" dot pulse>
                LIVE
              </GlassBadge>
            </div>
            <span className="text-[9px] font-mono text-slate-400 tracking-wide truncate max-w-[210px] sm:max-w-[320px]">
              Live Orbit &amp; Trajectory Spacecraft Radar
            </span>
          </div>
        </GlassPanel>

        {/* CENTER: Spatial Layer & View Controls */}
        <GlassPanel
          level={1}
          className="hidden lg:flex items-center gap-1 p-1 shadow-2xl shrink-0"
        >
          <GlassButton
            size="xs"
            variant="default"
            isActive={showLabels}
            onClick={onToggleLabels}
            title="Toggle satellite labels"
          >
            Labels
          </GlassButton>

          <GlassButton
            size="xs"
            variant="accent"
            isActive={showOrbits}
            onClick={onToggleOrbits}
            title="Toggle selected satellite orbit path"
          >
            Orbit
          </GlassButton>

          <GlassButton
            size="xs"
            variant="default"
            isActive={showGrid}
            onClick={onToggleGrid}
            title="Toggle azimuth & elevation coordinate grid"
          >
            Grid
          </GlassButton>

          <GlassButton
            size="xs"
            variant="default"
            isActive={showRadar}
            onClick={onToggleRadar}
            title="Toggle 2D planisphere radar"
          >
            Radar
          </GlassButton>

          <GlassButton
            size="xs"
            variant="default"
            isActive={showSimDock}
            onClick={onToggleSimDock}
            title="Toggle 24-hour simulation timeline dock"
          >
            <Play className="h-2.5 w-2.5" />
            <span>Sim</span>
          </GlassButton>

          <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />

          <GlassButton
            size="xs"
            variant={is180DomeView ? "success" : "default"}
            isActive={is180DomeView}
            onClick={onToggle180DomeView}
            title={is180DomeView ? "Locked to horizon: Click for free rotation" : "Free rotation: Click to lock to horizon"}
          >
            <Compass className="h-3 w-3" />
            <span>{is180DomeView ? "Horizon Locked" : "Free Orbit"}</span>
          </GlassButton>
        </GlassPanel>

        {/* RIGHT: Telemetry Drawer, Phone Sync, Fullscreen & Docs */}
        <div className="flex items-center gap-1.5 ml-auto pointer-events-auto">
          {/* Mobile Phone Sync Button */}
          <GlassButton
            size="sm"
            variant={isMobileSynced ? "primary" : "default"}
            isActive={isMobileSynced}
            onClick={onOpenMobileSync}
            title={isMobileSynced ? "Mobile phone sensors connected" : "Pair smartphone compass via QR code"}
          >
            <Smartphone className={`h-3.5 w-3.5 ${isMobileSynced ? "text-cyan-300 animate-pulse" : "text-slate-400"}`} />
            <span className="hidden sm:inline">
              {isMobileSynced ? "Sensors Synced" : "Pair Phone"}
            </span>
          </GlassButton>

          {/* Floating 24h Pass Telemetry Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTelemetryDrawer}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition border backdrop-blur-2xl cursor-pointer select-none shadow-xl ${
              isTelemetryDrawerOpen
                ? "bg-cyan-500/20 border-cyan-400/70 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                : "bg-slate-950/60 hover:bg-slate-900/80 border-white/[0.12] hover:border-white/[0.22] text-slate-300 hover:text-white"
            }`}
            title="Toggle live satellite telemetry dock"
          >
            <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
              <img
                src="/images/floating-satellite-station.png"
                alt="Station Icon"
                className="w-full h-full object-contain filter drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]"
              />
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500" />
              </span>
            </div>
            <div className="flex flex-col text-left leading-none font-mono">
              <span className="text-[10px] font-bold text-white tracking-wider">
                TELEMETRY
              </span>
              <span className="text-[8px] text-cyan-400">
                {visible24hCount} Visible
              </span>
            </div>
          </motion.button>

          {/* Fullscreen Toggle */}
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={handleToggleFullscreen}
            title="Toggle fullscreen view"
            className="p-2"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </GlassButton>

          {/* Manual Documentation Modal Trigger */}
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={onOpenManual}
            title="Open StarGazer Aerospace Technical Manual"
            className="p-2"
          >
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
          </GlassButton>
        </div>
      </div>
    </header>
  );
}
