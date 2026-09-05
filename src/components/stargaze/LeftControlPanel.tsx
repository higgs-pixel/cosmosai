"use client";

import { useState } from "react";
import {
  MapPin,
  Target,
  Sun,
  Moon,
  Compass,
  Eye,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

interface LeftControlPanelProps {
  observer: ObserverCoords;
  onSelectObserver: (coords: ObserverCoords) => void;
  onRequestGps: () => void;
  presetLocations: ObserverCoords[];
  sunCoords: { elevationDeg: number; isDark: boolean } | null;
  nakedEyeCount: number;
  currentBearing: number;
  currentPitch: number;
  is180DomeView: boolean;
  onToggle180DomeView: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  showOrbits: boolean;
  onToggleOrbits: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRadar: boolean;
  onToggleRadar: () => void;
}

export function LeftControlPanel({
  observer,
  onSelectObserver,
  onRequestGps,
  presetLocations,
  sunCoords,
  nakedEyeCount,
  currentBearing,
  currentPitch,
  is180DomeView,
  onToggle180DomeView,
  showLabels,
  onToggleLabels,
  showOrbits,
  onToggleOrbits,
  showGrid,
  onToggleGrid,
  showRadar,
  onToggleRadar,
}: LeftControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<"location" | "sky" | "orientation" | "view" | null>("location");

  const toggleSection = (section: "location" | "sky" | "orientation" | "view") => {
    setOpenSection(openSection === section ? null : section);
  };

  const getCardinal = (deg: number) => {
    const cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
    return cardinals[index];
  };

  if (isCollapsed) {
    return (
      <aside className="absolute top-20 left-4 z-30 pointer-events-auto">
        <GlassButton
          size="sm"
          variant="default"
          onClick={() => setIsCollapsed(false)}
          className="shadow-2xl"
          title="Expand Mission Control Panel"
        >
          <Layers className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-xs">CONTROLS</span>
        </GlassButton>
      </aside>
    );
  }

  return (
    <aside className="absolute top-20 left-4 z-30 pointer-events-auto w-[290px] sm:w-[320px] max-h-[calc(100vh-140px)] flex flex-col font-sans transition-all duration-300">
      <GlassPanel level={2} className="p-3.5 flex flex-col gap-2.5 overflow-y-auto">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-extrabold text-xs tracking-wider text-white uppercase">
              MISSION CONTROLS
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer"
            title="Collapse panel"
          >
            COLLAPSE
          </button>
        </div>

        {/* 1. LOCATION SECTION */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => toggleSection("location")}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-mono font-bold text-slate-200 hover:bg-white/[0.04] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" />
              <span>01 // LOCATION</span>
            </div>
            {openSection === "location" ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {openSection === "location" && (
            <div className="p-3 border-t border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Observatory Site
                </span>
                <select
                  value={observer.name}
                  onChange={(e) => {
                    const loc = presetLocations.find((l) => l.name === e.target.value);
                    if (loc) onSelectObserver(loc);
                  }}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer focus:border-cyan-400/60 font-mono truncate"
                >
                  <option value={observer.name} className="bg-slate-950 text-white">
                    {observer.name}
                  </option>
                  {presetLocations.map((loc) => (
                    <option key={loc.name} value={loc.name} className="bg-slate-950 text-white">
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-950/40 p-2 rounded-xl border border-white/[0.06]">
                <div>
                  <span className="text-slate-500">LATITUDE</span>
                  <div className="font-bold text-slate-200">{observer.lat.toFixed(4)}°</div>
                </div>
                <div>
                  <span className="text-slate-500">LONGITUDE</span>
                  <div className="font-bold text-slate-200">{observer.lon.toFixed(4)}°</div>
                </div>
              </div>

              <GlassButton
                size="xs"
                variant="primary"
                onClick={onRequestGps}
                className="w-full justify-center py-2"
                title="Detect live GPS coordinates via browser sensor"
              >
                <Target className="h-3.5 w-3.5" />
                <span>USE MY LOCATION (GPS)</span>
              </GlassButton>
            </div>
          )}
        </div>

        {/* 2. SKY CONDITIONS SECTION */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => toggleSection("sky")}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-mono font-bold text-slate-200 hover:bg-white/[0.04] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>02 // SKY CONDITIONS</span>
            </div>
            {openSection === "sky" ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {openSection === "sky" && (
            <div className="p-3 border-t border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-white/[0.06]">
                <span className="text-slate-400 text-[10px]">SUN ELEVATION</span>
                <span className="font-bold text-amber-300">
                  {sunCoords ? `${sunCoords.elevationDeg.toFixed(1)}°` : "Calculating..."}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-white/[0.06]">
                <span className="text-slate-400 text-[10px]">ILLUMINATION</span>
                <span className={sunCoords?.isDark ? "font-bold text-emerald-300" : "font-bold text-amber-300"}>
                  {sunCoords
                    ? sunCoords.elevationDeg < -18
                      ? "Astronomical Night"
                      : sunCoords.elevationDeg < -12
                      ? "Nautical Twilight"
                      : sunCoords.elevationDeg < -6
                      ? "Civil Twilight"
                      : "Daylight"
                    : "Live"}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-white/[0.06]">
                <span className="text-slate-400 text-[10px]">NAKED EYE VISIBLE</span>
                <GlassBadge tone="amber">
                  <Eye className="h-2.5 w-2.5" />
                  <span>{nakedEyeCount} SATS</span>
                </GlassBadge>
              </div>
            </div>
          )}
        </div>

        {/* 3. ORIENTATION & BEARING */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => toggleSection("orientation")}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-mono font-bold text-slate-200 hover:bg-white/[0.04] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Compass className="h-3.5 w-3.5 text-emerald-400" />
              <span>03 // ORIENTATION</span>
            </div>
            {openSection === "orientation" ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {openSection === "orientation" && (
            <div className="p-3 border-t border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-950/40 p-2 rounded-xl border border-white/[0.06]">
                <div>
                  <span className="text-slate-500">BEARING</span>
                  <div className="font-bold text-emerald-300">
                    {Math.round(currentBearing)}° ({getCardinal(currentBearing)})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">PITCH / EL</span>
                  <div className="font-bold text-cyan-300">
                    {Math.round(currentPitch)}°
                  </div>
                </div>
              </div>

              <GlassButton
                size="xs"
                variant={is180DomeView ? "success" : "default"}
                onClick={onToggle180DomeView}
                className="w-full justify-center py-2 font-mono"
              >
                <span>{is180DomeView ? "LOCKED TO HORIZON" : "FREE ROTATION DOME"}</span>
              </GlassButton>
            </div>
          )}
        </div>

        {/* 4. VIEW LAYERS */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => toggleSection("view")}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-mono font-bold text-slate-200 hover:bg-white/[0.04] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              <span>04 // VIEW LAYERS</span>
            </div>
            {openSection === "view" ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>

          {openSection === "view" && (
            <div className="p-3 border-t border-white/[0.06] grid grid-cols-2 gap-1.5 text-xs font-mono">
              <GlassButton
                size="xs"
                variant="default"
                isActive={showLabels}
                onClick={onToggleLabels}
                className="justify-center py-1.5"
              >
                LABELS
              </GlassButton>
              <GlassButton
                size="xs"
                variant="accent"
                isActive={showOrbits}
                onClick={onToggleOrbits}
                className="justify-center py-1.5"
              >
                ORBITS
              </GlassButton>
              <GlassButton
                size="xs"
                variant="default"
                isActive={showGrid}
                onClick={onToggleGrid}
                className="justify-center py-1.5"
              >
                GRID
              </GlassButton>
              <GlassButton
                size="xs"
                variant="default"
                isActive={showRadar}
                onClick={onToggleRadar}
                className="justify-center py-1.5"
              >
                RADAR
              </GlassButton>
            </div>
          )}
        </div>
      </GlassPanel>
    </aside>
  );
}
