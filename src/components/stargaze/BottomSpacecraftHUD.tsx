"use client";

import { Eye, Clock, Radio, Zap, Target, Play, Pause, RotateCcw } from "lucide-react";

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
    <footer className="absolute bottom-3 inset-x-3 sm:inset-x-8 z-30 pointer-events-none flex items-center justify-between gap-3 text-xs font-mono select-none">
      {/* LEFT: Sensor Detection Counts */}
      <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 border border-zinc-800 bg-black/90 text-white pointer-events-auto shadow-xl">
        <div className="flex items-center gap-1.5 text-amber-300">
          <Eye className="h-3 w-3 text-amber-400" />
          <span className="text-zinc-500 text-[10px] uppercase">Naked Eye:</span>
          <span className="font-bold">{nakedEyeCount}</span>
        </div>

        <span className="text-zinc-800">•</span>

        <div className="flex items-center gap-1.5 text-cyan-300">
          <span className="text-zinc-500 text-[10px] uppercase">Overhead:</span>
          <span className="font-bold">{visibleCount}</span>
        </div>

        {activeTrackSatName && (
          <>
            <span className="text-zinc-800">•</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Target className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-500 text-[10px] uppercase">Locked:</span>
              <span className="font-bold truncate max-w-[130px]">{activeTrackSatName}</span>
            </div>
          </>
        )}
      </div>

      {/* CENTER: UTC Simulation Clock & Quick Speed Controller */}
      <div className="px-3.5 py-1.5 flex items-center gap-3 border border-zinc-800 bg-black/90 text-white pointer-events-auto mx-auto shadow-xl">
        {/* Play/Pause Button */}
        {onTogglePlay && (
          <button
            onClick={onTogglePlay}
            className={`p-1.5 border transition flex items-center justify-center cursor-pointer ${
              isPlaying
                ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-400"
                : "border-amber-500/50 bg-amber-950/40 text-amber-400"
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
          <span className="font-bold text-white text-xs tracking-wider">
            {currentDate.toLocaleTimeString()}
          </span>
          <span className="text-zinc-500 text-[10px] hidden sm:inline">
            UTC
          </span>
        </div>

        {/* Quick Speed Selector Pills */}
        {onSetMultiplier && (
          <div className="flex items-center border border-zinc-850 p-0.5 text-[10px]">
            {[
              { label: "1x", val: 1 },
              { label: "10x", val: 10 },
              { label: "60x", val: 60 },
              { label: "300x", val: 300 },
            ].map((speed) => (
              <button
                key={speed.val}
                onClick={() => onSetMultiplier(speed.val)}
                className={`px-1.5 py-0.5 transition cursor-pointer ${
                  timeMultiplier === speed.val
                    ? "bg-cyan-400 text-black font-bold"
                    : "text-zinc-500 hover:text-white"
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
            className="px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer flex items-center gap-1"
            title="Reset to live real time"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Now</span>
          </button>
        )}

        <button
          onClick={onOpenSimDock}
          className="p-1 text-zinc-500 hover:text-cyan-300 transition cursor-pointer"
          title="Toggle Full 24-Hour Timeline Dock"
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${showSimDock ? "bg-cyan-400 animate-ping" : "bg-emerald-400"}`} />
        </button>
      </div>

      {/* RIGHT: Engine & Synchronization Status */}
      <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 border border-zinc-800 bg-black/90 text-white pointer-events-auto ml-auto shadow-xl">
        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
          <Zap className="h-3 w-3 text-emerald-400" />
          <span>SGP4 KERNEL</span>
        </div>

        <span className="text-zinc-800">•</span>

        <div className="flex items-center gap-1 text-[10px] text-zinc-400">
          <Radio className="h-3 w-3 text-cyan-400" />
          <span>CELESTRAK LIVE</span>
        </div>

        {isMobileSynced && (
          <>
            <span className="text-zinc-800">•</span>
            <span className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              PHONE SYNC
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
