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

function StarfieldGlitterCanvas() {
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Passes 3D Cover Flow Carousel Component
// ─────────────────────────────────────────────────────────────────────────────
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

function getPassDescription(pass: SatellitePass): string {
  if (pass.isVisibleToEye) {
    return `Prime naked-eye observation window. Reaching a peak elevation of ${pass.maxElevationDeg}° with exceptionally high visual brightness (${pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mᵥ) traversing from azimuth ${pass.riseAzimuthDeg}° to ${pass.setAzimuthDeg}°. 🛰️⚡`;
  }
  return `Topocentric orbital crossing reaching ${pass.maxElevationDeg}° altitude above your ground station. Slant range geometry yields an apparent magnitude of ${pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mᵥ across a ${Math.round(pass.durationSec / 60)} minute pass window. 📡`;
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

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  if (passes.length === 0) return null;

  // Build 5-card 3D perspective fan (Cover Flow)
  const offsets = [-2, -1, 0, 1, 2];
  const total = passes.length;
  const visibleCards = offsets.map((offset) => {
    let idx = (currentIndex + offset) % total;
    if (idx < 0) idx += total;
    return { pass: passes[idx], index: idx, offset };
  });

  return (
    <div className="relative w-full py-8 overflow-hidden font-sans select-none rounded-2xl bg-black border border-zinc-850">
      {/* 1. Dynamic Glittering Starfield Background Canvas */}
      <StarfieldGlitterCanvas />

      {/* 2. Top Header Information & Counter */}
      <div className="relative z-10 flex items-center justify-between mb-8 px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#00e5ff]">
            Topocentric Passes ({passes.length})
          </span>
          <span className="text-zinc-700">&bull;</span>
          <span className="text-xs text-zinc-400">
            Object <strong className="text-white font-semibold">{currentIndex + 1}</strong> of {passes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider hidden sm:inline">
            Use arrows or drag to navigate
          </span>
        </div>
      </div>

      {/* 3. 3D Cover Flow Stage */}
      <div className="relative z-10 w-full flex items-center justify-center min-h-[460px] sm:min-h-[500px]">
        {/* Left Navigation Chevron Arrow */}
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:left-6 z-50 p-2 text-white/60 hover:text-white transition-all transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none drop-shadow-[0_0_16px_rgba(255,255,255,0.6)]"
          title="Previous (Left Arrow)"
          aria-label="Previous Pass"
        >
          <ChevronLeft className="w-9 h-9 sm:w-12 sm:h-12 stroke-[2]" />
        </button>

        {/* Right Navigation Chevron Arrow */}
        <button
          onClick={handleNext}
          className="absolute right-2 sm:right-6 z-50 p-2 text-white/60 hover:text-white transition-all transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none drop-shadow-[0_0_16px_rgba(255,255,255,0.6)]"
          title="Next (Right Arrow)"
          aria-label="Next Pass"
        >
          <ChevronRight className="w-9 h-9 sm:w-12 sm:h-12 stroke-[2]" />
        </button>

        {/* 3D Perspective Card Track */}
        <div
          ref={containerRef}
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
            const xOffset = offset * (absOffset === 1 ? 175 : 305);
            const rotateY = offset === 0 ? 0 : -Math.sign(offset) * (absOffset === 1 ? 46 : 56);
            const scale = offset === 0 ? 1 : absOffset === 1 ? 0.86 : 0.74;
            const zIndex = offset === 0 ? 40 : absOffset === 1 ? 25 : 10;
            const opacity = offset === 0 ? 1 : absOffset === 1 ? 0.65 : 0.28;
            const blur = offset === 0 ? 0 : absOffset === 1 ? 0.8 : 2.5;

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
                  duration: 0.45,
                  ease: [0.25, 1, 0.5, 1],
                }}
                drag={isCenter ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 45) handlePrev();
                  else if (info.offset.x < -45) handleNext();
                }}
                onClick={() => {
                  if (!isCenter) {
                    setCurrentIndex(index);
                  }
                  onSelectPass(pass);
                  onSelectSatId(pass.noradId);
                }}
                className={`
                  absolute w-[280px] sm:w-[320px] md:w-[340px] h-[400px] sm:h-[430px]
                  rounded-3xl p-6 sm:p-7 cursor-pointer
                  flex flex-col justify-between select-none
                  transition-shadow duration-300
                  ${
                    isCenter
                      ? "bg-white text-zinc-900 shadow-[0_25px_65px_rgba(0,0,0,0.95),0_0_55px_rgba(255,255,255,0.22)] ring-1 ring-white/70"
                      : "bg-white/85 text-zinc-800 backdrop-blur-md shadow-[0_15px_40px_rgba(0,0,0,0.85)] hover:bg-white/95"
                  }
                `}
                style={{
                  transformStyle: "preserve-3d",
                  backfaceVisibility: "hidden",
                }}
              >
                {/* Upper Section: Title & Tags */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                      NORAD {pass.noradId}
                    </span>

                    <span
                      className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        pass.isVisibleToEye
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {pass.isVisibleToEye && <Sparkles className="h-3 w-3 text-emerald-600" />}
                      <span>{pass.isVisibleToEye ? "Naked Eye" : "Radar Visible"}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-[28px] font-black tracking-tight text-zinc-950 font-sans leading-tight line-clamp-2">
                      {pass.satName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1 font-sans">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-bold text-zinc-800">{relativeTime}</span>
                      <span className="text-zinc-300">&bull;</span>
                      <span>Duration {Math.round(pass.durationSec / 60)} min</span>
                    </div>
                  </div>

                  {/* Informative Paragraph / Narrative */}
                  <p className="text-xs sm:text-[13px] text-zinc-600 leading-relaxed line-clamp-4 pt-1">
                    {description}
                  </p>
                </div>

                {/* Bottom Section: Metrics Strip & Interactive Action */}
                <div className="space-y-4 pt-3 border-t border-zinc-100">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-50 rounded-xl p-2">
                      <span className="text-[9px] uppercase text-zinc-400 block font-semibold">Peak Elev</span>
                      <span className="text-sm font-black text-zinc-900">{pass.maxElevationDeg}°</span>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-2">
                      <span className="text-[9px] uppercase text-zinc-400 block font-semibold">Est. Mag</span>
                      <span className="text-sm font-black text-emerald-600">
                        {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag}
                      </span>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-2">
                      <span className="text-[9px] uppercase text-zinc-400 block font-semibold">AOS Time</span>
                      <span className="text-xs font-bold text-zinc-900">
                        {new Date(pass.startTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPass(pass);
                      onSelectSatId(pass.noradId);
                    }}
                    className={`w-full h-10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-black text-white shadow-md font-black"
                        : isCenter
                        ? "bg-zinc-950 hover:bg-black text-white"
                        : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                    }`}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>{isSelected ? "Tracking Active" : "Track Satellite"}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 4. Pagination Dots Indicator */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pt-6">
        {passes.slice(0, Math.min(passes.length, 14)).map((_, idx) => (
          <button
            key={`dot-${idx}`}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              currentIndex === idx ? "w-6 bg-white" : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(Passes3DCarousel);
