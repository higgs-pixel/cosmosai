"use client";

import { Eye, Clock, Radio, Zap, Smartphone, Target } from "lucide-react";
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
}

export function BottomSpacecraftHUD({
  nakedEyeCount,
  visibleCount,
  activeTrackSatName,
  currentDate,
  isMobileSynced,
  onOpenSimDock,
  showSimDock,
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

      {/* CENTER: UTC Simulation Clock Trigger */}
      <GlassPanel
        level={1}
        onClick={onOpenSimDock}
        className="px-3.5 py-1.5 flex items-center gap-2 shadow-2xl cursor-pointer hover:border-white/25 transition pointer-events-auto mx-auto"
        title="Click to toggle 24-Hour Timeline Simulator"
      >
        <Clock className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-extrabold text-white text-xs tracking-wider">
          {currentDate.toLocaleTimeString()}
        </span>
        <span className="text-slate-400 text-[10px] hidden sm:inline">
          UTC ({currentDate.toLocaleDateString()})
        </span>
        <span className={`w-1.5 h-1.5 rounded-full ${showSimDock ? "bg-cyan-400 animate-ping" : "bg-emerald-400"}`} />
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
