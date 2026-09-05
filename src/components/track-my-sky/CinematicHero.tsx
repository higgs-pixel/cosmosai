"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowDown, Radio, Sparkles, MapPin, Orbit } from "lucide-react";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

const CinematicHeroPlanet = dynamic(
  () => import("./CinematicHeroPlanet").then((m) => m.CinematicHeroPlanet),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-transparent" />,
  }
);

interface CinematicHeroProps {
  observer: ObserverCoords;
  visibleCount: number;
  nakedEyeCount: number;
  sunlitCount: number;
  activeSatName?: string;
  activeSatAltKm?: number;
  activeSatElDeg?: number;
  nextPassName?: string;
  nextPassTimeStr?: string;
  nextPassMaxEl?: number;
  onExploreClick: () => void;
}

export const CinematicHero = memo(function CinematicHero({
  observer,
  visibleCount,
  nakedEyeCount,
  sunlitCount,
  activeSatName = "ISS (ZARYA)",
  activeSatAltKm = 418,
  activeSatElDeg = 45.2,
  nextPassName = "ISS (ZARYA)",
  nextPassTimeStr = "IN 14m",
  nextPassMaxEl = 68,
  onExploreClick,
}: CinematicHeroProps) {
  return (
    <section className="relative w-full min-h-[85vh] lg:min-h-[92vh] flex flex-col justify-between pt-28 pb-8 px-4 sm:px-8 md:px-12 lg:px-16 overflow-hidden bg-black select-none">
      {/* 3D Celestial Planet Layer (Asymmetrically positioned on right side) */}
      <CinematicHeroPlanet />

      {/* Main Editorial Content (Left side with immense negative space) */}
      <div className="relative z-10 max-w-[1720px] mx-auto w-full flex-1 flex flex-col justify-between">
        <div className="max-w-xl lg:max-w-2xl pt-4 space-y-6">
          {/* Eyebrow Boxed Tag */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            className="inline-flex items-center gap-2.5 px-3 py-1 rounded-sm border border-white/20 bg-white/[0.02] backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-slate-300 uppercase font-semibold">
              ORBITAL INTELLIGENCE SYSTEM
            </span>
          </motion.div>

          {/* Large Editorial Display Typography */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
            className="space-y-1"
          >
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-tight text-white uppercase leading-[0.92]">
              TRACK
            </h1>
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-tight text-white uppercase leading-[0.92]">
              MY SKY
            </h1>
          </motion.div>

          {/* Refined Scientific Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
            className="text-sm sm:text-base md:text-lg text-slate-300/90 font-light leading-relaxed max-w-lg tracking-wide"
          >
            Real-time satellite visibility, orbital position,
            sky observation and pass intelligence.
          </motion.p>

          {/* Minimalist CTA and Live Status */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="pt-4 flex flex-wrap items-center gap-6"
          >
            <button
              onClick={onExploreClick}
              className="group inline-flex items-center gap-3 px-6 py-3 rounded-none border border-white/30 hover:border-white bg-white/[0.04] hover:bg-white text-white hover:text-black font-mono text-xs tracking-widest uppercase transition-all duration-300 cursor-pointer backdrop-blur-md"
            >
              <span>EXPLORE SKY</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>

            <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="text-slate-300 font-semibold">LIVE ORBITAL DATA</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Feature Teaser Cards (Reference 2 NASA Style) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="pt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl"
        >
          {/* Card 1: Next Observable Pass */}
          <div className="p-4 rounded-none border border-white/10 bg-black/40 backdrop-blur-md space-y-1.5 transition-colors hover:border-white/25">
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="h-3 w-3" />
                <span>NEXT TRANSIT</span>
              </span>
              <span className="font-bold text-white">{nextPassTimeStr}</span>
            </div>
            <div className="text-sm font-light text-white tracking-wide truncate">
              {nextPassName}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Peak Elevation: <span className="text-white font-semibold">{nextPassMaxEl}°</span> &bull; Optical Window
            </div>
          </div>

          {/* Card 2: Observer Ground Station */}
          <div className="p-4 rounded-none border border-white/10 bg-black/40 backdrop-blur-md space-y-1.5 transition-colors hover:border-white/25">
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="h-3 w-3 text-cyan-400" />
                <span>OBSERVER SITE</span>
              </span>
              <span className="text-[9px] text-emerald-400 font-bold">SYNCHRONIZED</span>
            </div>
            <div className="text-sm font-light text-white tracking-wide truncate">
              {observer.name}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {observer.lat.toFixed(2)}° N &bull; {observer.lon.toFixed(2)}° E &bull; {observer.altMeters}m
            </div>
          </div>

          {/* Card 3: Overhead Fleet Volume */}
          <div className="hidden lg:block p-4 rounded-none border border-white/10 bg-black/40 backdrop-blur-md space-y-1.5 transition-colors hover:border-white/25">
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Orbit className="h-3 w-3 text-cyan-400" />
                <span>FLEET OVERHEAD</span>
              </span>
              <span className="font-bold text-cyan-400">{visibleCount} OBJECTS</span>
            </div>
            <div className="text-sm font-light text-white tracking-wide">
              {nakedEyeCount} Naked-Eye Visible
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {sunlitCount} Sunlit Spacecraft Currently Above Horizon
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

export default CinematicHero;
