"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Sparkles,
  Eye,
  Calendar,
  Box,
  LayoutGrid,
  Crosshair,
  ArrowRight,
} from "lucide-react";
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
    <section id="passes-section" className="w-full space-y-6 pt-6 font-sans">
      {/* Editorial Section Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
            Section 04 // Upcoming Orbital Passes
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase font-sans flex items-center gap-3">
            <span>Predicted Topocentric Passes</span>
            <span className="text-xs text-zinc-400 font-normal">({passes.length} TARGETS IN RANGE)</span>
          </h2>
          <p className="text-xs text-zinc-400 font-sans mt-1">
            Astrometric pass calculations relative to your local observer horizon over the next {timeframeFilter}.
          </p>
        </div>

        {/* Filter & View Mode Controls */}
        <div className="flex flex-wrap items-center gap-3 font-sans">
          {/* View Mode Switcher: 3D Carousel vs Matrix Grid */}
          <div className="flex items-center border border-zinc-800 bg-black p-0.5 text-xs">
            <button
              onClick={() => setViewMode("carousel")}
              className={`px-3 py-1 text-[11px] uppercase font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "carousel"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Box className="h-3 w-3" />
              <span>3D Carousel</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1 text-[11px] uppercase font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              <span>Story Grid</span>
            </button>
          </div>

          {/* Naked-Eye Only Toggle */}
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer border border-zinc-800 bg-zinc-950 px-3 py-1 hover:border-zinc-700 transition select-none">
            <input
              type="checkbox"
              checked={onlyVisible}
              onChange={(e) => onToggleOnlyVisible(e.target.checked)}
              className="rounded-none border-zinc-700 bg-black text-white focus:ring-0 cursor-pointer accent-white"
            />
            <span className="text-[11px] uppercase font-semibold tracking-wider">Naked-Eye Only</span>
          </label>

          {/* Timeframe Selector */}
          <div className="flex items-center border border-zinc-800 bg-black p-0.5 text-xs">
            {(["1h", "6h", "24h"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onSetTimeframeFilter(tf)}
                className={`px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer uppercase ${
                  timeframeFilter === tf
                    ? "bg-white text-black font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Passes Container */}
      <div className="w-full border border-zinc-850 bg-black p-4 sm:p-6">
        {passes.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 font-sans text-xs uppercase tracking-widest space-y-2">
            <p className="text-white text-sm font-bold">No upcoming passes in {timeframeFilter} window</p>
            <p className="text-zinc-400">Expand the timeframe window or uncheck &ldquo;Naked-Eye Only&rdquo;.</p>
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
          /* Mode 2: NASA Editorial Story Grid of Pass Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passes.slice(0, 15).map((pass, idx) => {
              const isSelected =
                selectedPass?.noradId === pass.noradId &&
                selectedPass?.startTimeMs === pass.startTimeMs;
              const relativeTime = getRelativeTimeStr(pass.startTimeMs);

              return (
                <div
                  key={`grid-pass-${pass.noradId}-${pass.startTimeMs}-${idx}`}
                  onClick={() => {
                    onSelectPass(pass);
                    onSelectSatId(pass.noradId);
                  }}
                  className={`border p-5 flex flex-col justify-between transition cursor-pointer select-none ${
                    isSelected
                      ? "border-white bg-zinc-900 shadow-[0_0_15px_rgba(255,255,255,0.06)]"
                      : "border-zinc-850 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row: Timing & Status Tag */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-sans uppercase tracking-widest text-[#00e5ff] font-semibold">
                        {relativeTime}
                      </span>
                      <span
                        className={`text-[9px] uppercase px-2 py-0.5 border font-semibold ${
                          pass.isVisibleToEye
                            ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                            : "border-zinc-800 text-zinc-400 bg-black"
                        }`}
                      >
                        {pass.isVisibleToEye ? "Naked-Eye Pass" : "Above Horizon"}
                      </span>
                    </div>

                    {/* Satellite Name & NORAD */}
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight truncate font-sans">
                        {pass.satName}
                      </h3>
                      <span className="text-[10px] font-sans text-zinc-500">NORAD {pass.noradId}</span>
                    </div>

                    {/* Astrometry Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 border-t border-b border-zinc-900 py-3 text-xs font-sans">
                      <div>
                        <div className="text-[10px] uppercase text-zinc-500">Max Elevation</div>
                        <div className="font-bold text-white text-sm">{pass.maxElevationDeg}°</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-zinc-500">Visual Mag</div>
                        <div className="font-bold text-emerald-400 text-sm">
                          {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mᵥ
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-zinc-500">AOS (Rise)</div>
                        <div className="text-zinc-300 font-sans text-xs">
                          {new Date(pass.startTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-zinc-500">Duration</div>
                        <div className="text-zinc-300 font-sans text-xs">
                          {Math.round(pass.durationSec / 60)} min
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-400 font-sans">
                      Trajectory: Az {pass.riseAzimuthDeg}° &rarr; {pass.setAzimuthDeg}°
                    </div>
                  </div>

                  {/* Target Action Link */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPass(pass);
                      onSelectSatId(pass.noradId);
                    }}
                    className={`mt-4 w-full h-8 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 border transition cursor-pointer ${
                      isSelected
                        ? "border-white bg-white text-black font-bold"
                        : "border-zinc-800 bg-black hover:border-zinc-600 text-zinc-200"
                    }`}
                  >
                    <Crosshair className="h-3 w-3" />
                    <span>{isSelected ? "Target Locked" : "Track Target"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default UpcomingPassesTimeline;
