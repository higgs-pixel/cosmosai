"use client";

import { useState, useRef, useCallback, memo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Crosshair,
} from "lucide-react";
import { SatellitePass } from "@/components/intelligence/PassPredictor";

// ─────────────────────────────────────────────────────────────────────────────
// High-Performance Sparkling / Glittering Starfield Canvas
// Replicates the deep space glitter stars seen in the reference visual
// ─────────────────────────────────────────────────────────────────────────────
interface GlitterStar {
  x: number;
  y: number;
  baseRadius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  flare: boolean;
  color: string;
  depth: number;
}

const StarfieldGlitterCanvas = memo(function StarfieldGlitterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let stars: GlitterStar[] = [];
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const COLORS = [
      "rgba(255, 255, 255,",
      "rgba(255, 255, 255,",
      "rgba(255, 255, 255,",
      "rgba(207, 250, 254,", // soft cyan-blue
      "rgba(224, 231, 255,", // soft lavender
      "rgba(254, 243, 199,", // warm gold
    ];

    const initStars = (w: number, h: number) => {
      // High star count to reproduce the dense glittering starlight in the reference
      const count = Math.min(1100, Math.max(550, Math.floor((w * h) / 750)));
      const newStars: GlitterStar[] = [];

      for (let i = 0; i < count; i++) {
        const isBright = Math.random() > 0.88;
        const radius = isBright
          ? 1.5 + Math.random() * 1.3
          : 0.5 + Math.random() * 0.9;

        newStars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          baseRadius: radius,
          baseAlpha: isBright ? 0.65 + Math.random() * 0.35 : 0.2 + Math.random() * 0.6,
          twinkleSpeed: 0.0018 + Math.random() * 0.004,
          phase: Math.random() * Math.PI * 2,
          flare: isBright && Math.random() > 0.45,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          depth: 0.3 + Math.random() * 1.2,
        });
      }
      stars = newStars;
    };

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars(width, height);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = ((e.clientX - rect.left) / width - 0.5) * 2;
      targetMouseY = ((e.clientY - rect.top) / height - 0.5) * 2;
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(time - lastTime, 64);
      lastTime = time;

      // Smooth mouse interpolation for parallax
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      // Deep space black void background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Subtle atmospheric celestial glow in center
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.7
      );
      grad.addColorStop(0, "rgba(8, 14, 30, 0.45)");
      grad.addColorStop(0.6, "rgba(2, 4, 10, 0.85)");
      grad.addColorStop(1, "rgba(0, 0, 0, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render glittering stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Twinkle oscillation
        const flicker = Math.sin(time * star.twinkleSpeed + star.phase);
        const alpha = Math.max(0.08, Math.min(1.0, star.baseAlpha + flicker * 0.42));

        // Subtle 3D mouse parallax
        const px = (star.x + mouseX * star.depth * 18 + width) % width;
        const py = (star.y + mouseY * star.depth * 18 + height) % height;

        const currentRadius = star.baseRadius * (0.8 + alpha * 0.28);

        // Core star point
        ctx.fillStyle = `${star.color} ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Star diffraction spikes / glitter flare for prominent sparkling stars
        if (star.flare && alpha > 0.72) {
          const flareLen = star.baseRadius * (3.8 + Math.sin(time * 0.006 + star.phase) * 1.5);
          const flareAlpha = (alpha - 0.72) * 2.8;

          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(flareAlpha, 0.85).toFixed(3)})`;
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          // Horizontal spike
          ctx.moveTo(px - flareLen, py);
          ctx.lineTo(px + flareLen, py);
          // Vertical spike
          ctx.moveTo(px, py - flareLen);
          ctx.lineTo(px, py + flareLen);
          ctx.stroke();

          // Subtle diagonal micro-cross
          const microFlare = flareLen * 0.5;
          ctx.strokeStyle = `rgba(207, 250, 254, ${(flareAlpha * 0.5).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(px - microFlare, py - microFlare);
          ctx.lineTo(px + microFlare, py + microFlare);
          ctx.moveTo(px - microFlare, py + microFlare);
          ctx.lineTo(px + microFlare, py - microFlare);
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl z-0"
      style={{ display: "block" }}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Passes 3D Cover Flow Carousel Component (Space-Tech Liquid Glass)
// ─────────────────────────────────────────────────────────────────────────────
interface Passes3DCarouselProps {
  passes: SatellitePass[];
  selectedPass: SatellitePass | null;
  onSelectPass: (pass: SatellitePass) => void;
  onSelectSatId: (id: number) => void;
}

function getRelativeTimeStr(targetTimeMs: number): string {
  const diffMs = targetTimeMs - Date.now();
  if (diffMs <= 0) return "ACTIVE OVERHEAD";
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `IN ${diffMins} MINS`;
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  return remMins > 0 ? `IN ${diffHours}H ${remMins}M` : `IN ${diffHours} HOURS`;
}

function getPassDescription(pass: SatellitePass): string {
  if (pass.isVisibleToEye) {
    return `Prime naked-eye visual pass. Spacecraft achieves peak elevation of ${pass.maxElevationDeg}° with high photometric reflectivity (${pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mᵥ) traversing from azimuth ${pass.riseAzimuthDeg}° to ${pass.setAzimuthDeg}°.`;
  }
  return `Topocentric orbital crossing reaching ${pass.maxElevationDeg}° above local horizon. Slant range geometry yields apparent magnitude ${pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mᵥ across a ${Math.round(pass.durationSec / 60)} minute pass window.`;
}

export function Passes3DCarousel({
  passes,
  selectedPass,
  onSelectPass,
  onSelectSatId,
}: Passes3DCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const mouseStartXRef = useRef<number | null>(null);

  // Sync index if external selectedPass changes
  useEffect(() => {
    if (selectedPass && passes.length > 0) {
      const idx = passes.findIndex(
        (p) => p.noradId === selectedPass.noradId && p.startTimeMs === selectedPass.startTimeMs
      );
      if (idx !== -1 && idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    }
  }, [selectedPass, passes, currentIndex]);

  // Keep index in bounds if passes list changes
  useEffect(() => {
    if (currentIndex >= passes.length && passes.length > 0) {
      setCurrentIndex(0);
    }
  }, [passes.length, currentIndex]);

  const selectIndex = useCallback((nextIdx: number) => {
    if (passes.length === 0) return;
    const bounded = (nextIdx + passes.length) % passes.length;
    setCurrentIndex(bounded);
    const pass = passes[bounded];
    if (pass) {
      onSelectPass(pass);
      onSelectSatId(pass.noradId);
    }
  }, [passes, onSelectPass, onSelectSatId]);

  const handlePrev = useCallback(() => {
    selectIndex(currentIndex - 1);
  }, [currentIndex, selectIndex]);

  const handleNext = useCallback(() => {
    selectIndex(currentIndex + 1);
  }, [currentIndex, selectIndex]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  // Touch Swipe Handlers for mobile & trackpad
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff > 45) handlePrev();
    else if (diff < -45) handleNext();
    touchStartXRef.current = null;
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseStartXRef.current = e.clientX;
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (mouseStartXRef.current === null) return;
    const diff = e.clientX - mouseStartXRef.current;
    if (diff > 50) handlePrev();
    else if (diff < -50) handleNext();
    mouseStartXRef.current = null;
  };

  if (passes.length === 0) {
    return (
      <div className="relative w-full py-16 overflow-hidden font-sans select-none rounded-2xl bg-black border border-zinc-850 text-center">
        <StarfieldGlitterCanvas />
        <div className="relative z-10 space-y-2">
          <p className="text-white text-sm font-bold uppercase tracking-wider">No Upcoming Passes in Current Window</p>
          <p className="text-xs text-zinc-400">Expand the observation timeframe or choose a different ground station.</p>
        </div>
      </div>
    );
  }

  // Deduplicated offset generation for smooth Cover Flow
  const total = passes.length;
  let offsets: number[] = [0];
  if (total === 2) {
    offsets = [-1, 0];
  } else if (total === 3) {
    offsets = [-1, 0, 1];
  } else if (total === 4) {
    offsets = [-1, 0, 1, 2];
  } else if (total >= 5) {
    offsets = [-2, -1, 0, 1, 2];
  }

  const visibleCards = offsets.map((offset) => {
    let idx = (currentIndex + offset) % total;
    if (idx < 0) idx += total;
    return { pass: passes[idx], index: idx, offset };
  });

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="relative w-full py-8 overflow-hidden font-sans select-none rounded-2xl bg-black border border-zinc-850"
    >
      {/* 1. Deep Space Glitter Starfield Background */}
      <StarfieldGlitterCanvas />

      {/* 2. Header Bar: Counter & Quick Controls */}
      <div className="relative z-10 flex items-center justify-between mb-8 px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#00e5ff] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />
            Topocentric Passes ({passes.length})
          </span>
          <span className="text-zinc-700">&bull;</span>
          <span className="text-xs text-zinc-400 font-mono">
            TARGET <strong className="text-white font-bold">{currentIndex + 1}</strong> OF {passes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest hidden sm:inline font-mono">
            SWIPE / USE ARROWS TO ROTATE
          </span>
        </div>
      </div>

      {/* 3. 3D Cylindrical Perspective Stage */}
      <div className="relative z-10 w-full flex items-center justify-center min-h-[460px] sm:min-h-[500px]">
        {/* Left Arrow Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-2 sm:left-6 z-50 p-2 text-zinc-400 hover:text-[#00e5ff] transition-all transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none drop-shadow-[0_0_15px_rgba(0,229,255,0.6)]"
          title="Previous Pass (Left Arrow)"
          aria-label="Previous Pass"
        >
          <ChevronLeft className="w-9 h-9 sm:w-12 sm:h-12 stroke-[2.5]" />
        </button>

        {/* Right Arrow Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-2 sm:right-6 z-50 p-2 text-zinc-400 hover:text-[#00e5ff] transition-all transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none drop-shadow-[0_0_15px_rgba(0,229,255,0.6)]"
          title="Next Pass (Right Arrow)"
          aria-label="Next Pass"
        >
          <ChevronRight className="w-9 h-9 sm:w-12 sm:h-12 stroke-[2.5]" />
        </button>

        {/* 3D Perspective Track */}
        <div
          className="relative w-full h-[420px] sm:h-[450px] flex items-center justify-center"
          style={{ perspective: 1100, transformStyle: "preserve-3d" }}
        >
          {visibleCards.map(({ pass, index, offset }) => {
            const isCenter = offset === 0;
            const isSelected =
              selectedPass?.noradId === pass.noradId &&
              selectedPass?.startTimeMs === pass.startTimeMs;
            const relativeTime = getRelativeTimeStr(pass.startTimeMs);
            const description = getPassDescription(pass);

            const absOffset = Math.abs(offset);
            const xOffset = offset * (absOffset === 1 ? 185 : 315);
            const rotateY = offset === 0 ? 0 : -Math.sign(offset) * (absOffset === 1 ? 42 : 54);
            const scale = offset === 0 ? 1 : absOffset === 1 ? 0.86 : 0.72;
            const zIndex = offset === 0 ? 40 : absOffset === 1 ? 25 : 10;
            const opacity = offset === 0 ? 1 : absOffset === 1 ? 0.65 : 0.25;
            const blur = offset === 0 ? 0 : absOffset === 1 ? 0.6 : 2.0;

            return (
              <motion.div
                key={`coverflow-card-${pass.noradId}-${pass.startTimeMs}-${offset}`}
                animate={{
                  x: xOffset,
                  rotateY: rotateY,
                  scale: scale,
                  opacity: opacity,
                  filter: `blur(${blur}px)`,
                  zIndex: zIndex,
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 1, 0.5, 1],
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectIndex(index);
                }}
                className={`
                  absolute w-[290px] sm:w-[330px] md:w-[350px] h-[410px] sm:h-[435px]
                  rounded-3xl p-6 sm:p-7 cursor-pointer
                  flex flex-col justify-between select-none
                  transition-all duration-300
                  ${
                    isCenter
                      ? "bg-[#060a17]/95 backdrop-blur-2xl text-white border-2 border-cyan-400/80 shadow-[0_25px_65px_rgba(0,0,0,0.95),0_0_50px_rgba(0,229,255,0.22)] ring-1 ring-cyan-400/50"
                      : "bg-[#040714]/80 backdrop-blur-xl text-zinc-300 border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.8)] hover:border-cyan-500/40"
                  }
                `}
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                }}
              >
                {/* Liquid Glass Subtle Sheen Overlay */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

                {/* Upper Section: Title, NORAD & Status Tag */}
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#00e5ff] uppercase">
                      NORAD {pass.noradId}
                    </span>

                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                        pass.isVisibleToEye
                          ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                          : "bg-zinc-900 border-zinc-700 text-zinc-300"
                      }`}
                    >
                      {pass.isVisibleToEye && <Sparkles className="h-3 w-3 text-emerald-400 animate-pulse" />}
                      <span>{pass.isVisibleToEye ? "Naked Eye" : "Above Horizon"}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans leading-tight line-clamp-2 uppercase">
                      {pass.satName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 font-sans">
                      <Clock className="h-3.5 w-3.5 text-[#00e5ff]" />
                      <span className="font-bold text-[#00e5ff]">{relativeTime}</span>
                      <span className="text-zinc-600">&bull;</span>
                      <span className="text-zinc-400">Duration {Math.round(pass.durationSec / 60)} min</span>
                    </div>
                  </div>

                  {/* Informative Pass Description */}
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4 pt-1 font-sans">
                    {description}
                  </p>
                </div>

                {/* Bottom Section: Astrometric Grid & Action CTA */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80 relative z-10">
                  <div className="grid grid-cols-3 gap-2 text-center font-sans">
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                      <span className="text-[9px] uppercase text-zinc-500 block font-semibold">Peak Elev</span>
                      <span className="text-sm font-black text-white">{pass.maxElevationDeg}°</span>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                      <span className="text-[9px] uppercase text-zinc-500 block font-semibold">Visual Mag</span>
                      <span className="text-sm font-black text-emerald-400">
                        {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mᵥ
                      </span>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2">
                      <span className="text-[9px] uppercase text-zinc-500 block font-semibold">AOS Time</span>
                      <span className="text-xs font-bold text-zinc-200">
                        {new Date(pass.startTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Track Satellite Action CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPass(pass);
                      onSelectSatId(pass.noradId);
                    }}
                    className={`w-full h-9 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#00e5ff] text-black shadow-[0_0_20px_rgba(0,229,255,0.4)] font-black"
                        : isCenter
                        ? "bg-white hover:bg-[#00e5ff] text-black font-bold"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                    }`}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>{isSelected ? "Tracking Active" : "Track Target Orbit"}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4. Pagination Dots Indicator */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pt-6">
        {passes.slice(0, Math.min(passes.length, 16)).map((_, idx) => (
          <button
            key={`dot-${idx}`}
            onClick={(e) => {
              e.stopPropagation();
              selectIndex(idx);
            }}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              currentIndex === idx ? "w-7 bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(Passes3DCarousel);
