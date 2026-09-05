"use client";

import { memo, useState } from "react";
import { Clock, Sparkles, Box, Calendar, ChevronRight, Eye, Crosshair } from "lucide-react";
import { SatellitePass } from "@/components/intelligence/PassPredictor";
import dynamic from "next/dynamic";

const Passes3DCarousel = dynamic(
  () => import("./Passes3DCarousel").then((m) => m.Passes3DCarousel),
  {
    ssr: false,
    loading: () => (
      <div className="w-full py-16 flex items-center justify-center font-mono text-xs text-cyan-400">
        LOADING 3D PASS CAROUSEL…
      </div>
    ),
  }
);

interface UpcomingPassesHorizontalTimelineProps {
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

export const UpcomingPassesHorizontalTimeline = memo(function UpcomingPassesHorizontalTimeline({
  passes,
  selectedPass,
  onSelectPass,
  onSelectSatId,
  onlyVisible,
  onToggleOnlyVisible,
  timeframeFilter,
  onSetTimeframeFilter,
}: UpcomingPassesHorizontalTimelineProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "carousel">("timeline");

  return (
    <section
      id="upcoming-passes"
      className="relative w-full py-20 px-4 sm:px-8 md:px-12 lg:px-16 bg-black select-none border-t border-white/[0.08]"
    >
      <div className="max-w-[1720px] mx-auto space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/10">
          <div className="space-y-2">
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-cyan-400 uppercase font-semibold">
              05 // PREDICTED TRANSITS
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extralight text-white uppercase tracking-tight">
              UPCOMING PASSES
            </h2>
            <p className="text-xs sm:text-sm font-light text-slate-400 tracking-wide">
              SGP4 TOPOCENTRIC SATELLITE FLYBYS RELATIVE TO OBSERVER HORIZON
            </p>
          </div>

          {/* Timeframe Filter & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Timeframe Selector */}
            <div className="flex items-center border border-white/20 bg-white/[0.02] p-1 font-mono text-xs">
              {(["1h", "6h", "24h"] as const).map((tf) => (
                <button
                  key={`tf-${tf}`}
                  onClick={() => onSetTimeframeFilter(tf)}
                  className={`px-3 py-1 font-bold uppercase transition cursor-pointer ${
                    timeframeFilter === tf ? "bg-white text-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center border border-white/20 bg-white/[0.02] p-1 font-mono text-xs">
              <button
                onClick={() => setViewMode("timeline")}
                className={`px-3 py-1 font-bold uppercase transition cursor-pointer ${
                  viewMode === "timeline" ? "bg-white text-black" : "text-slate-400 hover:text-white"
                }`}
              >
                TIMELINE
              </button>
              <button
                onClick={() => setViewMode("carousel")}
                className={`px-3 py-1 font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "carousel" ? "bg-white text-black" : "text-slate-400 hover:text-white"
                }`}
              >
                <Box className="h-3 w-3" />
                <span>3D CAROUSEL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content View: Horizontal Timeline OR 3D Carousel */}
        {passes.length === 0 ? (
          <div className="py-20 text-center font-mono text-xs space-y-2 border border-white/10 bg-white/[0.01]">
            <p className="text-white text-sm font-light">NO SATELLITE PASSES DETECTED IN TIMEFRAME</p>
            <p className="text-slate-400 max-w-md mx-auto">
              Try expanding the timeframe window to 24 hours to view upcoming satellite orbits.
            </p>
          </div>
        ) : viewMode === "carousel" ? (
          <Passes3DCarousel
            passes={passes}
            selectedPass={selectedPass}
            onSelectPass={onSelectPass}
            onSelectSatId={onSelectSatId}
          />
        ) : (
          /* Cinematic Horizontal Timeline */
          <div className="space-y-6">
            <div className="font-mono text-xs tracking-[0.25em] text-slate-400 uppercase">
              CHRONOLOGICAL TRANSIT SEQUENCE &bull; TODAY
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20">
              {passes.slice(0, 14).map((pass) => {
                const isSelected =
                  selectedPass?.noradId === pass.noradId &&
                  selectedPass?.startTimeMs === pass.startTimeMs;
                const timeStr = new Date(pass.startTimeMs).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
                const relativeTime = getRelativeTimeStr(pass.startTimeMs);

                return (
                  <div
                    key={`pass-seq-${pass.noradId}-${pass.startTimeMs}`}
                    onClick={() => {
                      onSelectPass(pass);
                      onSelectSatId(pass.noradId);
                    }}
                    className={`shrink-0 w-64 p-5 border transition-all duration-200 cursor-pointer select-none space-y-3 ${
                      isSelected
                        ? "border-cyan-400 bg-white/[0.06] shadow-[0_0_30px_rgba(0,229,255,0.2)] ring-1 ring-cyan-400"
                        : "border-white/15 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-slate-400">
                      <span className="font-bold text-cyan-400">{timeStr}</span>
                      <span className="uppercase text-[9px]">{relativeTime}</span>
                    </div>

                    <div>
                      <div className="text-base font-light text-white tracking-wide truncate">
                        {pass.satName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        NORAD {pass.noradId}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-slate-500 text-[9px] block uppercase">PEAK EL</span>
                        <span className="font-bold text-white">{pass.maxElevationDeg}°</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[9px] block uppercase">DURATION</span>
                        <span className="text-slate-300">{Math.round(pass.durationSec / 60)}M</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[9px] block uppercase">VISIBILITY</span>
                        <span className={pass.isVisibleToEye ? "text-emerald-400 font-bold" : "text-slate-400"}>
                          {pass.isVisibleToEye ? "NAKED EYE" : "OPTICAL"}
                        </span>
                      </div>
                    </div>

                    <button
                      className={`w-full py-1.5 font-mono text-[10px] tracking-widest uppercase transition flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-cyan-500 text-black font-bold"
                          : "border border-white/20 text-slate-300 hover:border-cyan-400"
                      }`}
                    >
                      <Crosshair className="h-3 w-3" />
                      <span>{isSelected ? "TARGET LOCKED" : "SELECT TARGET"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

export default UpcomingPassesHorizontalTimeline;
