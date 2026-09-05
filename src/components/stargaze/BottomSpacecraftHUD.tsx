"use client";

import { Eye, Clock, Radio, Zap, Target, Play, Pause, RotateCcw, FastForward } from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassBadge } from "@/components/glass/GlassBadge";

interface BottomSpacecraftHUDProps {
  nakedEyeCount: number;
  visibleCount: number;
  activeTrackSatName: string | null;
  currentDate: Date;
  isMobileSynced: boolean;
  onOpenSimDock: () => void;
  showSimDock: boolean;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  timeMultiplier?: number;
  onSetMultiplier?: (val: number) => void;
  onResetNow?: () => void;
}

export function BottomSpacecraftHUD({
  nakedEyeCount,
  visibleCount,
  activeTrackSatName,
  currentDate,
  isMobileSynced,
  onOpenSimDock,
  showSimDock,
  isPlaying = true,
  onTogglePlay,
  timeMultiplier = 1,
  onSetMultiplier,
  onResetNow,
}: BottomSpacecraftHUDProps) {
  return (
    <footer className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-30 pointer-events-none flex items-center justify-between gap-3 text-xs font-mono">
      {/* LEFT: Sensor Detection Counts */}
      <GlassPanel
        level={1}
        className="hidden md:flex items-center gap-3 px-3.5 py-1.5 shadow-2xl pointer-events-auto"
      >
        <div className="flex items-center gap-1.5 text-amber-300">
          <Eye className="h-3 w-3 text-amber-400" />
          <span className="text-slate-400 text-[10px]">NAKED EYE:</span>
          <span className="font-bold">{nakedEyeCount}</span>
        </div>

        <span className="text-white/20">•</span>

        <div className="flex items-center gap-1.5 text-cyan-300">
          <span className="text-slate-400 text-[10px]">OVERHEAD:</span>
          <span className="font-bold">{visibleCount}</span>
        </div>

        {activeTrackSatName && (
          <>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5 text-emerald-300">
              <Target className="h-3 w-3 text-emerald-400" />
              <span className="text-slate-400 text-[10px]">LOCKED:</span>
              <span className="font-bold truncate max-w-[130px]">{activeTrackSatName}</span>
            </div>
          </>
        )}
      </GlassPanel>

      {/* CENTER: UTC Simulation Clock & Quick Speed Controller */}
      <GlassPanel
        level={1}
        className="px-3 py-1.5 flex items-center gap-2.5 shadow-2xl pointer-events-auto mx-auto border-white/15"
      >
        {/* Play/Pause Button */}
        {onTogglePlay && (
          <button
            onClick={onTogglePlay}
            className={`p-1.5 rounded-lg transition flex items-center justify-center cursor-pointer ${
              isPlaying
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40"
            }`}
            title={isPlaying ? "Pause Simulation" : "Resume Simulation"}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
        )}

        {/* Live Clock Display */}
        <div
          onClick={onOpenSimDock}
          className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-300 transition"
          title="Click to toggle Full 24-Hour Simulation Dock"
        >
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-extrabold text-white text-xs tracking-wider">
            {currentDate.toLocaleTimeString()}
          </span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">
            UTC
          </span>
        </div>

        {/* Quick Speed Selector Pills */}
        {onSetMultiplier && (
          <div className="flex items-center bg-white/[0.05] border border-white/10 rounded-lg p-0.5 text-[10px]">
            {[
              { label: "1x", val: 1 },
              { label: "10x", val: 10 },
              { label: "60x", val: 60 },
              { label: "300x", val: 300 },
            ].map((speed) => (
              <button
                key={speed.val}
                onClick={() => onSetMultiplier(speed.val)}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  timeMultiplier === speed.val
                    ? "bg-cyan-500 text-slate-950 font-black shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title={`Simulate at ${speed.label} orbital speed`}
              >
                {speed.label}
              </button>
            ))}
          </div>
        )}

        {/* Reset to Real Time Now */}
        {onResetNow && (
          <button
            onClick={onResetNow}
            className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center gap-0.5"
            title="Reset to live real time"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Now</span>
          </button>
        )}

        <button
          onClick={onOpenSimDock}
          className="p-1 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
          title="Toggle Full 24-Hour Timeline Dock"
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${showSimDock ? "bg-cyan-400 animate-ping" : "bg-emerald-400"}`} />
        </button>
      </GlassPanel>

      {/* RIGHT: Engine & Synchronization Status */}
      <GlassPanel
        level={1}
        className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 shadow-2xl pointer-events-auto ml-auto"
      >
        <div className="flex items-center gap-1 text-[10px] text-slate-300">
          <Zap className="h-3 w-3 text-emerald-400" />
          <span>SGP4 KERNEL</span>
        </div>

        <span className="text-white/20">•</span>

        <div className="flex items-center gap-1 text-[10px] text-slate-300">
          <Radio className="h-3 w-3 text-cyan-400" />
          <span>CELESTRAK LIVE</span>
        </div>

        {isMobileSynced && (
          <>
            <span className="text-white/20">•</span>
            <GlassBadge tone="cyan" dot pulse>
              PHONE
            </GlassBadge>
          </>
        )}
      </GlassPanel>
    </footer>
  );
}
