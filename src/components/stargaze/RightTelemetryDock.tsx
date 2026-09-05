"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  RotateCcw,
  X,
  Search,
  Calendar,
  Eye,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassInput } from "@/components/glass/GlassInput";
import { GlassButton } from "@/components/glass/GlassButton";
import { SatelliteCapsuleCard } from "./SatelliteCapsuleCard";
import { ComputedSatelliteSkyState } from "@/lib/astronomy/satellite-sky-math";

interface RightTelemetryDockProps {
  isOpen: boolean;
  onClose: () => void;
  satellites: ComputedSatelliteSkyState[];
  selectedSat: ComputedSatelliteSkyState | null;
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
  onAimTrackSat: (sat: ComputedSatelliteSkyState) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: "Visible in 24 Hours" | "Naked-Eye Visible" | "Overhead Now";
  onSelectCategory: (
    cat: "Visible in 24 Hours" | "Naked-Eye Visible" | "Overhead Now"
  ) => void;
  visible24hCount: number;
  nakedEyeCount: number;
  visibleCount: number;
  lastRefreshedDate: Date;
  onRefreshTles: () => void;
  isRefreshingTles: boolean;
  tleStatusText: string;
}

export function RightTelemetryDock({
  isOpen,
  onClose,
  satellites,
  selectedSat,
  onSelectSat,
  onAimTrackSat,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  visible24hCount,
  nakedEyeCount,
  visibleCount,
  lastRefreshedDate,
  onRefreshTles,
  isRefreshingTles,
  tleStatusText,
}: RightTelemetryDockProps) {
  // Mobile drawer expand states: 'collapsed' (just header), 'half', 'full'
  const [mobileHeight, setMobileHeight] = useState<"half" | "full">("half");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, x: 50, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`fixed z-50 pointer-events-auto flex flex-col font-sans transition-all duration-300
          /* Desktop & Tablet: Floating Right Dock */
          top-16 sm:top-20 right-3 sm:right-6 bottom-4 sm:bottom-6 w-[calc(100vw-1.5rem)] sm:w-[390px] md:w-[420px] max-w-full
        `}
      >
        <GlassPanel
          level={3}
          className="h-full flex flex-col p-3.5 sm:p-4 shadow-[0_24px_64px_0_rgba(0,0,0,0.7),0_0_35px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.15)] overflow-hidden"
        >
          {/* Header Bar */}
          <div className="flex flex-col gap-1.5 border-b border-white/10 pb-3 mb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="font-extrabold text-sm text-white font-mono tracking-wider">
                  LIVE TELEMETRY
                </span>
                <GlassBadge tone="emerald" dot pulse>
                  SYNC
                </GlassBadge>
              </div>

              <div className="flex items-center gap-1.5">
                <GlassButton
                  size="xs"
                  variant="default"
                  onClick={onRefreshTles}
                  disabled={isRefreshingTles}
                  title="Force re-sync CelesTrak NORAD TLE catalog"
                >
                  <RotateCcw
                    className={`h-3 w-3 ${
                      isRefreshingTles ? "animate-spin text-cyan-400" : ""
                    }`}
                  />
                  <span className="text-[10px] font-mono hidden sm:inline">
                    Sync
                  </span>
                </GlassButton>

                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Compress into top icon"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 bg-white/[0.03] px-2.5 py-1 rounded-xl border border-white/[0.08]">
              <span className="flex items-center gap-1 text-emerald-300">
                <Radio className="h-2.5 w-2.5" />
                3H CYCLE: {lastRefreshedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-slate-400 truncate max-w-[190px]">{tleStatusText}</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="mb-2.5 shrink-0">
            <GlassInput
              icon={Search}
              placeholder="Search satellite name / NORAD ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 mb-3 shrink-0 text-xs font-mono">
            <button
              onClick={() => onSelectCategory("Visible in 24 Hours")}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                selectedCategory === "Visible in 24 Hours"
                  ? "bg-emerald-500/20 border-emerald-400/70 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.08]"
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>24H ({visible24hCount})</span>
            </button>

            <button
              onClick={() => onSelectCategory("Naked-Eye Visible")}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                selectedCategory === "Naked-Eye Visible"
                  ? "bg-amber-500/20 border-amber-400/70 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : "bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.08]"
              }`}
              title="Physically Visible with Naked Eye"
            >
              <Eye className="h-3 w-3" />
              <span>EYE ({nakedEyeCount})</span>
            </button>

            <button
              onClick={() => onSelectCategory("Overhead Now")}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                selectedCategory === "Overhead Now"
                  ? "bg-cyan-500/20 border-cyan-400/70 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.08]"
              }`}
            >
              <span>OVERHEAD ({visibleCount})</span>
            </button>
          </div>

          {/* Satellite Telemetry Capsule Cards List */}
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
            {satellites.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono text-slate-400">
                No matching satellites located for current filter.
              </div>
            ) : (
              satellites.map((sat) => (
                <SatelliteCapsuleCard
                  key={sat.id}
                  sat={sat}
                  isSelected={selectedSat?.id === sat.id}
                  onSelectSat={onSelectSat}
                  onAimTrackSat={onAimTrackSat}
                />
              ))
            )}
          </div>
        </GlassPanel>
      </motion.aside>
    </AnimatePresence>
  );
}
