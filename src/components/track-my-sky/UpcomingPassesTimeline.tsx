"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Sparkles,
  Eye,
  ChevronRight,
  TrendingUp,
  Compass,
  Calendar,
  Layers,
  Box,
  LayoutGrid,
  Crosshair,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { SpaceTechCard } from "@/components/ui/SpaceTechCard";
import { Passes3DCarousel } from "./Passes3DCarousel";
import { SatellitePass } from "@/components/intelligence/PassPredictor";

interface UpcomingPassesTimelineProps {
  passes: SatellitePass[];
  selectedPass: SatellitePass | null;
  onSelectPass: (pass: SatellitePass) => void;
  onSelectSatId: (id: number) => void;
  onlyVisible: boolean;
  onToggleOnlyVisible: (val: boolean) => void;
  timeframeFilter: "1h" | "6h" | "24h";
  onSetTimeframeFilter: (tf: "1h" | "6h" | "24h") => void;
}

function getRelativeTimeStr(targetTimeMs: number): string {
  const diffMs = targetTimeMs - Date.now();
  if (diffMs <= 0) return "ACTIVE NOW";
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `IN ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  return remMins > 0 ? `IN ${diffHours}h ${remMins}m` : `IN ${diffHours}h`;
}

export function UpcomingPassesTimeline({
  passes,
  selectedPass,
  onSelectPass,
  onSelectSatId,
  onlyVisible,
  onToggleOnlyVisible,
  timeframeFilter,
  onSetTimeframeFilter,
}: UpcomingPassesTimelineProps) {
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");

  return (
    <section id="passes-section" className="w-full space-y-4 pt-4">
      {/* Section Header */}
      <GlassPanel level={2} className="p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              <Calendar className="h-3.5 w-3.5" />
              <span>03 // UPCOMING SATELLITE PASSES TIMELINE</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Predicted Topocentric Passes</span>
              <GlassBadge tone="cyan">{passes.length} TARGETS</GlassBadge>
            </h2>
            <p className="text-xs text-slate-300">
              High-precision SGP4 orbital pass predictions calculated relative to your observer horizon.
            </p>
          </div>

          {/* Filter & View Mode Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher: 3D Carousel vs Matrix Grid */}
            <div className="flex items-center gap-1 bg-slate-950/90 border border-cyan-500/30 p-1 rounded-xl font-mono text-xs">
              <button
                onClick={() => setViewMode("carousel")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "carousel"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)] font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Box className="h-3.5 w-3.5" />
                <span>3D CAROUSEL</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)] font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>MATRIX GRID</span>
              </button>
            </div>

            {/* Naked-Eye Only Toggle */}
            <label className="flex items-center gap-2 text-xs font-mono text-slate-200 cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3 py-1.5 rounded-xl transition select-none">
              <input
                type="checkbox"
                checked={onlyVisible}
                onChange={(e) => onToggleOnlyVisible(e.target.checked)}
                className="rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-0 cursor-pointer"
              />
              <span className="font-semibold">Naked-Eye Only</span>
            </label>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-white/10 p-1 rounded-xl font-mono text-xs">
              {(["1h", "6h", "24h"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => onSetTimeframeFilter(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    timeframeFilter === tf
                      ? "bg-cyan-500 text-slate-950 shadow-md font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content View: 3D Spatial Carousel OR Matrix Grid */}
        {passes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-mono text-xs space-y-2">
            <p className="text-white text-sm font-bold">NO UPCOMING SATELLITE PASSES DETECTED</p>
            <p className="text-slate-400">
              No passes found in the selected {timeframeFilter} window. Try expanding the timeframe or unchecking "Naked-Eye Only".
            </p>
          </div>
        ) : viewMode === "carousel" ? (
          /* Mode 1: 3D Spatial Cylindrical Carousel */
          <Passes3DCarousel
            passes={passes}
            selectedPass={selectedPass}
            onSelectPass={onSelectPass}
            onSelectSatId={onSelectSatId}
          />
        ) : (
          /* Mode 2: Space-Tech Matrix Grid of 3D Tilt Cards */
          <div className="pt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {passes.slice(0, 15).map((pass, idx) => {
              const isSelected =
                selectedPass?.noradId === pass.noradId &&
                selectedPass?.startTimeMs === pass.startTimeMs;
              const relativeTime = getRelativeTimeStr(pass.startTimeMs);

              return (
                <SpaceTechCard
                  key={`grid-pass-${pass.noradId}-${pass.startTimeMs}-${idx}`}
                  tilt={true}
                  scanLine={isSelected}
                  glow={isSelected}
                  moduleTag={`NORAD ${pass.noradId}`}
                  statusText={pass.isVisibleToEye ? "NAKED-EYE" : "ABOVE HORIZON"}
                  statusColor={pass.isVisibleToEye ? "emerald" : "cyan"}
                  onClick={() => {
                    onSelectPass(pass);
                    onSelectSatId(pass.noradId);
                  }}
                  className={`cursor-pointer p-4 flex flex-col justify-between transition-all select-none ${
                    isSelected ? "ring-2 ring-cyan-400" : ""
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                        {pass.isVisibleToEye && (
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse shrink-0" />
                        )}
                        <span className="truncate">{pass.satName}</span>
                      </h3>
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-400/30">
                        {relativeTime}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white/[0.03] border border-white/[0.06] p-2.5 rounded-xl font-mono text-xs">
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Max Elevation</div>
                        <div className="font-bold text-cyan-300 text-sm">
                          {pass.maxElevationDeg}° Peak
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Duration</div>
                        <div className="font-bold text-white text-sm">
                          {Math.round(pass.durationSec / 60)} min
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Rise (AOS)</div>
                        <div className="font-semibold text-slate-300 text-xs">
                          {new Date(pass.startTimeMs).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 uppercase">Set (LOS)</div>
                        <div className="font-semibold text-slate-300 text-xs">
                          {new Date(pass.endTimeMs).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                    <span>
                      Az: {pass.riseAzimuthDeg}° → {pass.setAzimuthDeg}°
                    </span>
                    <span className="font-bold text-emerald-400">
                      {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mag
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPass(pass);
                      onSelectSatId(pass.noradId);
                    }}
                    className={`mt-3 w-full h-9 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                      isSelected
                        ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                        : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40"
                    }`}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>{isSelected ? "LOCKED IN VIEWPORTS" : "AIM RETICLE & LOCK"}</span>
                  </button>
                </SpaceTechCard>
              );
            })}
          </div>
        )}
      </GlassPanel>
    </section>
  );
}

export default UpcomingPassesTimeline;
