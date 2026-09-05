"use client";

import { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Crosshair,
  TrendingUp,
  Compass,
} from "lucide-react";
import { SatellitePass } from "@/components/intelligence/PassPredictor";

interface Passes3DCarouselProps {
  passes: SatellitePass[];
  selectedPass: SatellitePass | null;
  onSelectPass: (pass: SatellitePass) => void;
  onSelectSatId: (id: number) => void;
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

export function Passes3DCarousel({
  passes,
  selectedPass,
  onSelectPass,
  onSelectSatId,
}: Passes3DCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, passes.length - 1)));
  }, [passes.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < passes.length - 1 ? prev + 1 : 0));
  }, [passes.length]);

  if (passes.length === 0) return null;

  // Show up to 3 cards in view, centered on currentIndex
  const visibleCards = [];
  const total = passes.length;
  for (let offset = -1; offset <= 1; offset++) {
    let idx = currentIndex + offset;
    if (idx < 0) idx = total - 1;
    if (idx >= total) idx = 0;
    visibleCards.push({ pass: passes[idx], index: idx, offset });
  }

  return (
    <div className="relative w-full py-8 overflow-hidden font-sans select-none">
      {/* Background Liquid Glass Ambient Refraction */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[680px] h-[320px] bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-purple-500/15 blur-[120px] rounded-full" />
      </div>

      {/* Header & Controls Bar */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#00e5ff]">
            Naked-Eye Passes ({passes.length})
          </span>
          <span className="text-zinc-700">&bull;</span>
          <span className="text-xs text-zinc-400 font-sans">
            Pass <strong className="text-white font-semibold">{currentIndex + 1}</strong> of {passes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-8 h-8 rounded-full border border-white/20 bg-white/[0.05] hover:bg-white/[0.15] hover:border-cyan-400/50 backdrop-blur-2xl text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
            title="Previous Pass"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-full border border-white/20 bg-white/[0.05] hover:bg-white/[0.15] hover:border-cyan-400/50 backdrop-blur-2xl text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
            title="Next Pass"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3D Liquid Glass Space-Tech Carousel */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center min-h-[390px] w-full"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {visibleCards.map(({ pass, index, offset }) => {
            const isCenter = offset === 0;
            const isSelected =
              selectedPass?.noradId === pass.noradId &&
              selectedPass?.startTimeMs === pass.startTimeMs;
            const relativeTime = getRelativeTimeStr(pass.startTimeMs);

            return (
              <motion.div
                key={`liquid-card-${pass.noradId}-${pass.startTimeMs}`}
                initial={{ opacity: 0, scale: 0.85, x: offset * 320 }}
                animate={{
                  opacity: isCenter ? 1 : 0.45,
                  scale: isCenter ? 1 : 0.88,
                  x: offset * 350,
                  zIndex: isCenter ? 30 : 10,
                }}
                exit={{ opacity: 0, scale: 0.8, x: offset * 320 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  if (!isCenter) {
                    setCurrentIndex(index);
                  }
                  onSelectPass(pass);
                  onSelectSatId(pass.noradId);
                }}
                className={`
                  absolute w-[330px] sm:w-[370px] h-[375px] p-6 rounded-2xl cursor-pointer
                  flex flex-col justify-between transition-all duration-300
                  backdrop-blur-3xl relative overflow-hidden group
                  ${
                    isCenter
                      ? isSelected
                        ? "bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent border border-cyan-400/80 shadow-[0_20px_50px_rgba(0,229,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                        : "bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-transparent border border-white/25 hover:border-cyan-400/60 shadow-[0_20px_45px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.25)]"
                      : "bg-white/[0.02] border border-white/10 pointer-events-auto filter blur-[0.5px]"
                  }
                `}
              >
                {/* Specular Liquid Edge Highlight */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />

                {/* Top Glass Badge & Status */}
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-wider text-cyan-300 border border-cyan-400/40 bg-cyan-950/40 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                      NORAD {pass.noradId}
                    </span>

                    <span
                      className={`text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                        pass.isVisibleToEye
                          ? "border-emerald-400/40 text-emerald-300 bg-emerald-950/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          : "border-white/15 text-zinc-400 bg-white/[0.03]"
                      }`}
                    >
                      {pass.isVisibleToEye && <Sparkles className="h-3 w-3 text-emerald-400" />}
                      <span>{pass.isVisibleToEye ? "Naked-Eye Pass" : "Above Horizon"}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight truncate font-sans">
                      {pass.satName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-sans mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="font-semibold text-zinc-200">{relativeTime}</span>
                      <span className="text-zinc-600">&bull;</span>
                      <span>Duration {Math.round(pass.durationSec / 60)}m</span>
                    </div>
                  </div>
                </div>

                {/* Space-Tech Liquid Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl border border-white/15 bg-black/40 backdrop-blur-2xl text-xs font-sans relative z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 font-medium block">Peak Elevation</span>
                    <span className="text-base font-bold text-white font-sans">{pass.maxElevationDeg}°</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 font-medium block">Visual Mag</span>
                    <span className="text-base font-bold text-emerald-400 font-sans">
                      {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mᵥ
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 font-medium block">AOS (Rise)</span>
                    <span className="text-zinc-300 font-sans font-medium text-xs">
                      {new Date(pass.startTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 font-medium block">LOS (Set)</span>
                    <span className="text-zinc-300 font-sans font-medium text-xs">
                      {new Date(pass.endTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Trajectory Footprint */}
                <div className="text-[10px] text-zinc-400 font-sans flex items-center justify-between border-t border-white/10 pt-2 relative z-10">
                  <span className="uppercase text-zinc-500 font-medium">Trajectory:</span>
                  <span className="text-zinc-200 font-medium">
                    Az {pass.riseAzimuthDeg}° &rarr; {pass.setAzimuthDeg}°
                  </span>
                </div>

                {/* Liquid Glass Interactive Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPass(pass);
                    onSelectSatId(pass.noradId);
                  }}
                  className={`w-full h-9 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer relative z-10 ${
                    isSelected
                      ? "bg-white text-black font-black shadow-[0_0_24px_rgba(255,255,255,0.5)]"
                      : "bg-white/[0.08] hover:bg-white/[0.18] text-white border border-white/20 hover:border-cyan-400/60"
                  }`}
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  <span>{isSelected ? "Tracking In Viewports" : "Track Satellite Pass"}</span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-6">
        {passes.slice(0, Math.min(passes.length, 12)).map((_, idx) => (
          <button
            key={`dot-${idx}`}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              currentIndex === idx ? "w-6 bg-[#00e5ff]" : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(Passes3DCarousel);
