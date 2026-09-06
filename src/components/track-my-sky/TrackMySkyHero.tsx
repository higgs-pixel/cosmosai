"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Sparkles,
  Compass,
  Navigation,
  Eye,
  Radio,
  Target,
  ArrowDown,
  Activity,
  Globe,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

const HeroEarthScene = dynamic(
  () => import("./HeroEarthScene").then((m) => m.HeroEarthScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] grid place-items-center bg-black">
        <div className="flex flex-col items-center gap-2 text-zinc-400 font-mono text-xs">
          <Globe className="h-8 w-8 animate-spin text-zinc-500" />
          <span className="tracking-widest uppercase text-zinc-400">PROPAGATING 3D ORBITAL GLOBE…</span>
        </div>
      </div>
    ),
  }
);

// Decoupled, pure memoized 3D background layer — zero re-renders on telemetry count changes
const PureHeroEarthBackground = memo(function PureHeroEarthBackground() {
  return (
    <div className="absolute top-0 right-0 w-full lg:w-[68%] xl:w-[64%] h-full pointer-events-auto z-0 opacity-95">
      <HeroEarthScene />
    </div>
  );
});

interface TrackMySkyHeroProps {
  observer: ObserverCoords;
  visibleCount: number;
  nakedEyeCount: number;
  sunlitCount: number;
  totalFleetCount?: number;
  activeSatName?: string;
  activeSatAltKm?: number;
  activeSatElDeg?: number;
  activeSatAzDeg?: number;
  activeSatMag?: number;
  activeSatVelocityKmH?: number;
  activeSatCategory?: string;
  activeSatNoradId?: number;
  onDetectGps: () => void;
  onScrollToSection: (id: string) => void;
}

export function TrackMySkyHero({
  observer,
  visibleCount,
  nakedEyeCount,
  sunlitCount,
  totalFleetCount,
  activeSatName = "ISS (ZARYA)",
  activeSatAltKm = 418,
  activeSatElDeg = 45.2,
  activeSatAzDeg = 178,
  activeSatMag = -1.8,
  activeSatVelocityKmH = 27600,
  activeSatCategory = "Space Station",
  activeSatNoradId = 25544,
  onDetectGps,
  onScrollToSection,
}: TrackMySkyHeroProps) {
  return (
    <section className="relative w-full min-h-screen lg:min-h-[96vh] flex flex-col justify-between pt-24 pb-16 overflow-hidden bg-black border-b border-zinc-900">
      {/* Background 3D Earth Layer (Asymmetric placement right/center, dominant planetary visual) */}
      <PureHeroEarthBackground />

      {/* Subtle Editorial Contrast Gradients for Text Readability without destroying the void of space */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-black via-black/60 to-transparent w-full lg:w-3/5" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-36 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />

      {/* Hero Foreground Content */}
      <div className="relative z-20 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-between">
        
        {/* Top Floating Editorial Metadata */}
        <div className="pt-4 max-w-xl">
          <div className="flex items-center gap-3 text-[10px] font-sans uppercase tracking-[0.25em] text-zinc-400">
            {/* <span className="text-zinc-200 font-bold">NASA / SGP4 ASTRONOMICAL EPHEMERIS</span>
            <span className="text-zinc-700">&bull;</span> */}
            <span className="text-zinc-200 font-bold">TOPOCENTRIC SKY OBSERVATORY</span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            PLUTO-STYLE EDITORIAL OVERLAY: Exact layout matching reference image
            Small outline category badge + Large bordered headline box + Action link
            ───────────────────────────────────────────────────────────────────── */}
        <div className="max-w-2xl pt-20 pb-4">
          {/* Small Outlined Category Box */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="border border-white/30 bg-black/60 backdrop-blur-sm px-3 py-1.5 inline-block mb-3.5"
          >
            <span className="text-[10px] font-bold tracking-[0.22em] text-zinc-300 uppercase font-sans">
              Observation Target &bull; {activeSatCategory}
            </span>
          </motion.div>

          {/* Large Headline Box with Thin 1px Border & Pure Dark Surface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="border border-white/20 bg-black/80 backdrop-blur-md p-6 sm:p-8 mb-5 shadow-2xl space-y-4"
          >
            <div className="space-y-1">
              <span className="text-xs font-mono tracking-widest text-[#00e5ff] font-semibold uppercase block">
                NORAD ID {activeSatNoradId}
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-[0.95] font-sans">
                {activeSatName}
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed max-w-lg">
              Live orbital track propagated from WGS-84 coordinates relative to <span className="text-white font-medium">{observer.name}</span>.
              Real-time azimuth, elevation, and photometric visual pass predictions.
            </p>

            {/* Live Telemetry Data Row */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-sans text-zinc-300">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">Elevation</span>
                <span className="text-white font-bold text-sm">{activeSatElDeg.toFixed(1)}°</span>
              </div>
              <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
              <div>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">Azimuth</span>
                <span className="text-zinc-200 font-bold text-sm">{activeSatAzDeg.toFixed(1)}°</span>
              </div>
              <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
              <div>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">Altitude</span>
                <span className="text-[#00e5ff] font-bold text-sm">{Math.round(activeSatAltKm)} km</span>
              </div>
              <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
              <div>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">Visual Mag</span>
                <span className="text-emerald-400 font-bold text-sm">{activeSatMag > 0 ? `+${activeSatMag}` : activeSatMag} mᵥ</span>
              </div>
              <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
              <div>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block">Overhead Now</span>
                <span className="text-white font-bold text-sm">{visibleCount} Assets</span>
              </div>
            </div>
          </motion.div>

          {/* Understated Editorial Action Links (Pluto reference style: "See these images →") */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="flex flex-wrap items-center gap-6 text-xs font-sans font-semibold tracking-wider text-zinc-300"
          >
            <button
              onClick={() => onScrollToSection("satellite-info-section")}
              className="inline-flex items-center gap-2 hover:text-white transition group border-b border-zinc-700 hover:border-white pb-0.5 cursor-pointer uppercase text-[11px]"
            >
              <span>Explore Satellite Dossier</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onScrollToSection("viewports-section")}
              className="inline-flex items-center gap-1.5 hover:text-white transition group border-b border-transparent hover:border-zinc-500 pb-0.5 cursor-pointer text-zinc-400 uppercase text-[11px]"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Observation Viewports</span>
            </button>

            <button
              onClick={() => onScrollToSection("passes-section")}
              className="inline-flex items-center gap-1.5 hover:text-white transition group border-b border-transparent hover:border-zinc-500 pb-0.5 cursor-pointer text-zinc-400 uppercase text-[11px]"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
              <span>Upcoming Passes ({nakedEyeCount} Naked-Eye)</span>
            </button>

            <button
              onClick={onDetectGps}
              className="inline-flex items-center gap-1.5 hover:text-[#00e5ff] transition group cursor-pointer text-zinc-400 uppercase text-[11px]"
              title="Pinpoint Observer GPS Sensor"
            >
              <Navigation className="h-3.5 w-3.5 text-zinc-500 group-hover:text-[#00e5ff]" />
              <span>Detect GPS</span>
            </button>
          </motion.div>
        </div>

        {/* Bottom Editorial Content Row: Thumbnail/Summary Story Cards */}
        <div className="pt-8 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl text-left font-sans">
          <button
            onClick={() => onScrollToSection("fleet-table-section")}
            className="border-l border-zinc-800 pl-3 py-1 text-left group hover:border-white transition cursor-pointer"
          >
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">Catalog Fleet</span>
            <span className="text-xl font-bold text-white font-sans">
              {totalFleetCount && totalFleetCount > visibleCount ? totalFleetCount.toLocaleString() : visibleCount}
            </span>
            <span className="text-[11px] text-zinc-400 block truncate">
              {totalFleetCount && totalFleetCount > visibleCount ? "Active assets tracked" : "Overhead horizon"}
            </span>
          </button>

          <button
            onClick={() => onScrollToSection("passes-section")}
            className="border-l border-zinc-800 pl-3 py-1 text-left group hover:border-emerald-400 transition cursor-pointer"
          >
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">Naked Eye</span>
            <span className="text-xl font-bold text-emerald-400 font-sans">{nakedEyeCount}</span>
            <span className="text-[11px] text-zinc-400 block truncate">Visible to eye</span>
          </button>

          <button
            onClick={() => onScrollToSection("fleet-table-section")}
            className="border-l border-zinc-800 pl-3 py-1 text-left group hover:border-amber-400 transition cursor-pointer"
          >
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">Sunlit Targets</span>
            <span className="text-xl font-bold text-amber-400 font-sans">{sunlitCount}</span>
            <span className="text-[11px] text-zinc-400 block truncate">Illuminated</span>
          </button>

          <button
            onClick={() => onScrollToSection("console-section")}
            className="border-l border-zinc-800 pl-3 py-1 text-left group hover:border-cyan-400 transition cursor-pointer"
            title="Click to select any country or trigger GPS"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 block">Observer Site</span>
              <span className="text-[8px] px-1 rounded bg-cyan-500/10 text-cyan-400 uppercase font-semibold">Change</span>
            </div>
            <span className="text-sm font-bold text-white font-sans truncate block">{(observer.name || "Observer Site").split(",")[0]}</span>
            <span className="text-[11px] text-zinc-400 block">{observer.lat.toFixed(2)}°, {observer.lon.toFixed(2)}°</span>
          </button>
        </div>

      </div>

      {/* Subtle Scroll Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-[10px] font-sans text-zinc-600 uppercase tracking-widest pointer-events-none">
        <ArrowDown className="h-3 w-3 animate-bounce text-zinc-500" />
      </div>
    </section>
  );
}
