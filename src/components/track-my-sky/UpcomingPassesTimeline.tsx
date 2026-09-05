"use client";

import { useMemo } from "react";
import {
  Clock,
  Sparkles,
  Eye,
  ChevronRight,
  TrendingUp,
  Compass,
  Calendar,
  Layers,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassBadge } from "@/components/glass/GlassBadge";
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
  return (
    <section id="passes-section" className="w-full space-y-4 pt-4">
      {/* Section Header */}
      <GlassPanel level={2} className="p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              <Calendar className="h-3.5 w-3.5" />
              <span>03 // UPCOMING SATELLITE PASSES TIMELINE</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Predicted Topocentric Passes ({passes.length})
            </h2>
            <p className="text-xs text-slate-300">
              High-precision SGP4 orbital pass predictions calculated relative to your observer horizon.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
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
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
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

        {/* Spatial Horizontal Timeline Flow */}
        {passes.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs">
            No upcoming satellite passes matching the current filter window ({timeframeFilter}).
          </div>
        ) : (
          <div className="pt-4 overflow-x-auto pb-2 scrollbar-thin">
            <div className="flex items-stretch gap-3.5 min-w-max">
              {passes.slice(0, 16).map((pass, idx) => {
                const isSelected =
                  selectedPass?.noradId === pass.noradId &&
                  selectedPass?.startTimeMs === pass.startTimeMs;
                const relativeTime = getRelativeTimeStr(pass.startTimeMs);

                return (
                  <div
                    key={`${pass.noradId}-${pass.startTimeMs}-${idx}`}
                    onClick={() => {
                      onSelectPass(pass);
                      onSelectSatId(pass.noradId);
                    }}
                    className={`w-[290px] sm:w-[320px] p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400/80 shadow-[0_0_24px_rgba(6,182,212,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                        : "bg-slate-950/60 hover:bg-slate-900/80 border-white/[0.08] hover:border-white/[0.18]"
                    }`}
                  >
                    {/* Top Row: Spacecraft Name & Relative Time */}
                    <div className="flex items-start justify-between gap-2 pb-2">
                      <div className="space-y-0.5 truncate">
                        <span className="font-extrabold text-sm text-white font-sans flex items-center gap-1.5 truncate">
                          {pass.isVisibleToEye && (
                            <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse shrink-0" />
                          )}
                          <span className="truncate">{pass.satName}</span>
                        </span>
                        <div className="text-[10px] font-mono text-slate-400">
                          NORAD #{pass.noradId}
                        </div>
                      </div>

                      <GlassBadge
                        tone={pass.isVisibleToEye ? "emerald" : "slate"}
                        dot
                      >
                        {relativeTime}
                      </GlassBadge>
                    </div>

                    {/* Middle Telemetry Matrix */}
                    <div className="grid grid-cols-2 gap-2 bg-white/[0.03] border border-white/[0.06] p-2.5 rounded-xl font-mono text-xs my-2">
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

                    {/* Bottom Trajectory & Magnitude Details */}
                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>
                        Az: {pass.riseAzimuthDeg}° → {pass.setAzimuthDeg}°
                      </span>
                      <span className="font-bold text-emerald-400">
                        {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mag
                      </span>
                    </div>

                    {/* Click To Track CTA */}
                    <div className="pt-2 text-[10px] font-mono text-cyan-400 font-semibold flex items-center justify-end gap-1">
                      <span>{isSelected ? "ACTIVE IN VIEWPORTS" : "TRACK TRAJECTORY"}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </GlassPanel>
    </section>
  );
}
