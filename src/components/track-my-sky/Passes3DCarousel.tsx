"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Compass,
  Target,
  Eye,
  TrendingUp,
  Activity,
  Layers,
  Crosshair,
} from "lucide-react";
import { SatellitePass } from "@/components/intelligence/PassPredictor";
import { GlassBadge } from "@/components/glass/GlassBadge";

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

// Interactive 3D Holographic Pass Card with Mouse Tilt Physics
function Pass3DCard({
  pass,
  isSelected,
  isActiveCenter,
  onSelect,
}: {
  pass: SatellitePass;
  isSelected: boolean;
  isActiveCenter: boolean;
  onSelect: () => void;
}) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isActiveCenter) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 16;
    const rotateX = (0.5 - y) * 16;
    setTilt({ rotateX, rotateY });
    setGlare({ x: x * 100, y: y * 100, opacity: 0.25 });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  const relativeTime = getRelativeTimeStr(pass.startTimeMs);
  const isNow = relativeTime === "ACTIVE NOW";

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      style={{
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
      }}
      className={`
        relative w-[340px] sm:w-[380px] h-[380px] rounded-3xl p-5
        bg-[#050914]/90 backdrop-blur-2xl
        border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between
        ${
          isSelected
            ? "border-cyan-400 shadow-[0_0_40px_rgba(0,229,255,0.3)] ring-1 ring-cyan-400"
            : isActiveCenter
            ? "border-cyan-500/40 shadow-[0_0_30px_rgba(0,229,255,0.15)] hover:border-cyan-400"
            : "border-white/10 opacity-70 hover:opacity-95"
        }
      `}
    >
      {/* Dynamic Specular Glare Reflection */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(0,229,255,${glare.opacity}), transparent 60%)`,
        }}
      />

      {/* Laser-etched HUD corner brackets */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <span className="block w-2.5 h-[1.5px] bg-cyan-400/80" />
        <span className="block w-[1.5px] h-2.5 -mt-[1.5px] bg-cyan-400/80" />
      </div>
      <div className="absolute top-3 right-3 pointer-events-none flex flex-col items-end">
        <span className="block w-2.5 h-[1.5px] bg-cyan-400/80" />
        <span className="block w-[1.5px] h-2.5 -mt-[1.5px] bg-cyan-400/80" />
      </div>
      <div className="absolute bottom-3 left-3 pointer-events-none flex flex-col justify-end">
        <span className="block w-[1.5px] h-2.5 bg-cyan-400/80" />
        <span className="block w-2.5 h-[1.5px] bg-cyan-400/80" />
      </div>
      <div className="absolute bottom-3 right-3 pointer-events-none flex flex-col items-end justify-end">
        <span className="block w-[1.5px] h-2.5 bg-cyan-400/80" />
        <span className="block w-2.5 h-[1.5px] bg-cyan-400/80" />
      </div>

      {/* Card Header */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 uppercase tracking-widest">
              NORAD {pass.noradId}
            </span>
            {pass.isVisibleToEye && (
              <GlassBadge tone="emerald" dot pulse>
                NAKED-EYE
              </GlassBadge>
            )}
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 ${
              isNow
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 animate-pulse"
                : "bg-white/[0.06] text-slate-300 border border-white/10"
            }`}
          >
            <Clock className="h-3 w-3 text-cyan-400" />
            {relativeTime}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2 truncate">
            {pass.satName}
          </h3>
          <p className="text-[11px] font-mono text-slate-400">
            Pass Window: {new Date(pass.startTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — {new Date(pass.endTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Middle Holographic Trajectory Dial & Elevation Sparkline */}
      <div className="relative z-10 my-2 bg-slate-950/70 border border-white/[0.08] rounded-2xl p-3 flex items-center justify-between gap-3">
        {/* Left: Elevation Peak Gauge */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            {/* SVG circular progress for peak elevation */}
            <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="19"
                fill="none"
                stroke="#1e293b"
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r="19"
                fill="none"
                stroke="#00e5ff"
                strokeWidth="3"
                strokeDasharray={`${(pass.maxElevationDeg / 90) * 119.3} 119.3`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono font-black text-white">{pass.maxElevationDeg}°</span>
              <span className="text-[7px] font-mono text-cyan-400 uppercase tracking-tighter">PEAK</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase">DURATION</div>
            <div className="text-sm font-mono font-bold text-white">
              {Math.round(pass.durationSec / 60)} MIN
            </div>
            <div className="text-[10px] font-mono text-cyan-400">
              {pass.durationSec}s Total Pass
            </div>
          </div>
        </div>

        {/* Right: Estimated Visual Magnitude Pill */}
        <div className="text-right space-y-0.5">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center justify-end gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            EST MAG
          </div>
          <div className="text-sm font-mono font-bold text-emerald-400">
            {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mᵥ
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {pass.peakVmag < 2 ? "Bright Target" : "Faint Optical"}
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Matrix & Aim Trigger */}
      <div className="relative z-10 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/[0.03] border border-white/[0.06] p-2 rounded-xl text-slate-300">
          <div>
            <span className="text-slate-400 text-[10px]">AOS AZ: </span>
            <span className="font-bold text-white">{pass.riseAzimuthDeg}°</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[10px]">LOS AZ: </span>
            <span className="font-bold text-white">{pass.setAzimuthDeg}°</span>
          </div>
        </div>

        {/* 1-Click Track Button with Target Reticle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`
            w-full h-10 rounded-xl font-mono text-xs font-bold tracking-wider uppercase
            flex items-center justify-center gap-2 transition-all duration-200
            ${
              isSelected
                ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(0,229,255,0.4)]"
                : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400"
            }
          `}
        >
          <Crosshair className={`h-4 w-4 ${isSelected ? "animate-spin" : ""}`} />
          <span>{isSelected ? "TARGET LOCKED" : "AIM RETICLE & LOCK"}</span>
        </button>
      </div>
    </div>
  );
}

export function Passes3DCarousel({
  passes,
  selectedPass,
  onSelectPass,
  onSelectSatId,
}: Passes3DCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Sync activeIndex if selectedPass changes from outside
  useEffect(() => {
    if (selectedPass && passes.length > 0) {
      const idx = passes.findIndex(
        (p) => p.noradId === selectedPass.noradId && p.startTimeMs === selectedPass.startTimeMs
      );
      if (idx !== -1) {
        setActiveIndex(idx);
      }
    }
  }, [selectedPass, passes]);

  const handleNext = useCallback(() => {
    if (passes.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % passes.length);
  }, [passes.length]);

  const handlePrev = useCallback(() => {
    if (passes.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + passes.length) % passes.length);
  }, [passes.length]);

  // Touch & Pointer Drag Swipe Gesture Handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const hasDraggedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    hasDraggedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.touches[0].clientX;
    const diffY = touchStartY.current - e.touches[0].clientY;
    if (Math.abs(diffX) > 10) {
      hasDraggedRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    const SWIPE_THRESHOLD = 35;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Skip if clicking a navigation button or action button
    if ((e.target as HTMLElement).closest("button")) return;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    hasDraggedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    const diffX = pointerStartX.current - e.clientX;
    if (Math.abs(diffX) > 10) {
      hasDraggedRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    const diffX = pointerStartX.current - e.clientX;
    const diffY = (pointerStartY.current || 0) - e.clientY;

    const DRAG_THRESHOLD = 40;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > DRAG_THRESHOLD) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    pointerStartX.current = null;
    pointerStartY.current = null;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  // Keyboard navigation (ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  if (passes.length === 0) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-center font-mono space-y-3">
        <Activity className="h-8 w-8 text-cyan-400/60 animate-pulse" />
        <div className="text-sm text-slate-300 uppercase tracking-widest font-bold">
          NO SATELLITE PASSES PREDICTED IN TIMEFRAME
        </div>
        <p className="text-xs text-slate-500 max-w-md">
          Try expanding your timeframe filter to 24 hours or unchecking "Naked-Eye Visible Only" to view all orbital passes.
        </p>
      </div>
    );
  }

  // Active pass at index
  const currentPass = passes[activeIndex] || passes[0];

  return (
    <div
      className="relative w-full overflow-hidden select-none py-6 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Top Carousel Status Readout */}
      <div className="flex items-center justify-between px-4 mb-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-400">
          <Crosshair className="h-3.5 w-3.5 animate-spin" />
          <span className="font-bold tracking-wider uppercase">
            TARGET {activeIndex + 1} OF {passes.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <span>SWIPE OR USE</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">→</kbd>
        </div>
      </div>

      {/* 3D Spatial Carousel Stage */}
      <div
        className="relative w-full h-[420px] flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ perspective: 1200 }}
      >
        <div
          className="relative w-full max-w-4xl h-full flex items-center justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {passes.map((pass, idx) => {
            const offset = idx - activeIndex;
            // Only render cards within distance of 2 to maintain smooth 60fps
            if (Math.abs(offset) > 2) return null;

            const isCenter = offset === 0;
            const translateX = offset * 260;
            const translateZ = -Math.abs(offset) * 160;
            const rotateY = offset * -18;
            const scale = isCenter ? 1 : 0.88;
            const opacity = isCenter ? 1 : Math.abs(offset) === 1 ? 0.65 : 0.25;
            const zIndex = 30 - Math.abs(offset) * 10;

            const isSelected =
              selectedPass?.noradId === pass.noradId &&
              selectedPass?.startTimeMs === pass.startTimeMs;

            return (
              <motion.div
                key={`3d-pass-${pass.noradId}-${pass.startTimeMs}`}
                animate={{
                  x: translateX,
                  z: translateZ,
                  rotateY,
                  scale,
                  opacity,
                }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 24,
                }}
                style={{
                  position: "absolute",
                  zIndex,
                  transformStyle: "preserve-3d",
                }}
              >
                <Pass3DCard
                  pass={pass}
                  isSelected={isSelected}
                  isActiveCenter={isCenter}
                  onSelect={() => {
                    if (hasDraggedRef.current) return;
                    setActiveIndex(idx);
                    onSelectPass(pass);
                    onSelectSatId(pass.noradId);
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Tactile Left Navigation Arrow */}
        <button
          onClick={handlePrev}
          aria-label="Previous Satellite Pass"
          className="absolute left-2 sm:left-6 z-40 w-11 h-11 rounded-2xl bg-black/60 hover:bg-cyan-500 text-white hover:text-black border border-cyan-500/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Tactile Right Navigation Arrow */}
        <button
          onClick={handleNext}
          aria-label="Next Satellite Pass"
          className="absolute right-2 sm:right-6 z-40 w-11 h-11 rounded-2xl bg-black/60 hover:bg-cyan-500 text-white hover:text-black border border-cyan-500/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Carousel Position Indicator Pills */}
      <div className="flex items-center justify-center gap-1.5 pt-4">
        {passes.slice(0, 16).map((_, i) => (
          <button
            key={`dot-${i}`}
            onClick={() => setActiveIndex(i)}
            aria-label={`Jump to pass ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-8 bg-cyan-400 shadow-[0_0_10px_#00e5ff]"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default Passes3DCarousel;
