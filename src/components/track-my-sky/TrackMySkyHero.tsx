"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Compass,
  Navigation,
  Eye,
  Radio,
  Target,
  ArrowDown,
  Layers,
  Activity,
  Globe,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassButton } from "@/components/glass/GlassButton";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

const HeroEarthScene = dynamic(
  () => import("./HeroEarthScene").then((m) => m.HeroEarthScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[420px] grid place-items-center bg-[#02040a]">
        <div className="flex flex-col items-center gap-2 text-cyan-400 font-mono text-xs">
          <Globe className="h-8 w-8 animate-spin" />
          <span>INITIALIZING 3D ORBITAL GLOBE…</span>
        </div>
      </div>
    ),
  }
);

// Decoupled, pure memoized 3D background layer — zero re-renders on telemetry count changes
const PureHeroEarthBackground = memo(function PureHeroEarthBackground() {
  return (
    <div className="absolute top-0 right-0 w-full lg:w-[62%] h-full pointer-events-auto z-0 opacity-90 lg:opacity-100">
      <HeroEarthScene />
    </div>
  );
});

interface TrackMySkyHeroProps {
  observer: ObserverCoords;
  visibleCount: number;
  nakedEyeCount: number;
  sunlitCount: number;
  activeSatName?: string;
  activeSatAltKm?: number;
  activeSatElDeg?: number;
  activeSatAzDeg?: number;
  onDetectGps: () => void;
  onScrollToSection: (id: string) => void;
}

export function TrackMySkyHero({
  observer,
  visibleCount,
  nakedEyeCount,
  sunlitCount,
  activeSatName = "ISS (ZARYA)",
  activeSatAltKm = 418,
  activeSatElDeg = 45.2,
  activeSatAzDeg = 178,
  onDetectGps,
  onScrollToSection,
}: TrackMySkyHeroProps) {
  return (
    <section className="relative w-full min-h-[85vh] lg:min-h-[92vh] flex flex-col justify-between pt-24 pb-12 overflow-hidden">
      {/* Background 3D Earth Layer (Asymmetric placement right/center) */}
      <PureHeroEarthBackground />

      {/* Hero Foreground Content */}
      <div className="relative z-10 max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-between">
        {/* Top Header Tags */}
        <div className="space-y-4 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2.5 flex-wrap"
          >
            <GlassBadge tone="cyan" dot pulse>
              LIVE ORBITAL DATA
            </GlassBadge>
            <span className="text-white/20">•</span>
            <GlassBadge tone="slate">SGP4 / TLE PROPAGATION</GlassBadge>
            <span className="text-white/20">•</span>
            <GlassBadge tone="amber">3-CONDITION VISIBILITY</GlassBadge>
          </motion.div>

          {/* Large Editorial Typography */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="space-y-3"
          >
            <span className="font-mono text-xs sm:text-sm tracking-[0.25em] text-cyan-400 font-bold uppercase block">
              ORBITAL INTELLIGENCE SYSTEM
            </span>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white uppercase leading-[0.92] select-none">
              TRACK
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                MY SKY
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl font-sans leading-relaxed pt-2">
              Real-time topocentric satellite intelligence and orbital awareness.
              Compute naked-eye visual passes, inspect 3D celestial trajectories, and
              track passing spacecraft from your precise ground station coordinates.
            </p>
          </motion.div>

          {/* Quick Action Navigation Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="flex items-center gap-3 pt-3 flex-wrap"
          >
            <Link href="/stargaze">
              <GlassButton variant="primary" size="md">
                <Sparkles className="h-4 w-4 text-cyan-300 animate-pulse" />
                <span>Launch 3D Planetarium</span>
              </GlassButton>
            </Link>

            <GlassButton
              variant="default"
              size="md"
              onClick={() => onScrollToSection("viewports-section")}
            >
              <Compass className="h-4 w-4 text-slate-300" />
              <span>Observation Viewports</span>
            </GlassButton>

            <GlassButton
              variant="ghost"
              size="md"
              onClick={onDetectGps}
              title="Acquire browser GPS sensor"
            >
              <Navigation className="h-4 w-4 text-cyan-400" />
              <span>Detect GPS</span>
            </GlassButton>
          </motion.div>
        </div>

        {/* Bottom Floating Telemetry Matrix Modules (Overlapping the Earth Scene) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="pt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl"
        >
          {/* Module 1: Overhead Satellites */}
          <GlassPanel
            level={2}
            className="p-4 flex flex-col justify-between min-h-[110px] cursor-pointer hover:border-cyan-400/40 transition"
            onClick={() => onScrollToSection("fleet-table-section")}
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider">
              <span>OVERHEAD NOW</span>
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {visibleCount}
            </div>
            <div className="text-[10px] font-mono text-cyan-400">
              Above Local Horizon
            </div>
          </GlassPanel>

          {/* Module 2: Naked-Eye Visible */}
          <GlassPanel
            level={2}
            className="p-4 flex flex-col justify-between min-h-[110px] cursor-pointer hover:border-emerald-400/40 transition"
            onClick={() => onScrollToSection("fleet-table-section")}
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider">
              <span>NAKED EYE</span>
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono tracking-tight">
              {nakedEyeCount}
            </div>
            <div className="text-[10px] font-mono text-emerald-400/80">
              Photometrically Visible
            </div>
          </GlassPanel>

          {/* Module 3: Sunlit Satellites */}
          <GlassPanel
            level={2}
            className="p-4 flex flex-col justify-between min-h-[110px]"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider">
              <span>SUNLIT TARGETS</span>
              <Radio className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
              {sunlitCount}
            </div>
            <div className="text-[10px] font-mono text-amber-400/80">
              Outside Earth Umbra
            </div>
          </GlassPanel>

          {/* Module 4: Active Tracked Spacecraft */}
          <GlassPanel
            level={2}
            className="p-4 flex flex-col justify-between min-h-[110px] border-cyan-400/30"
          >
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase tracking-wider">
              <span>ACTIVE TARGET</span>
              <Target className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            </div>
            <div className="text-sm sm:text-base font-black text-white font-mono truncate">
              {activeSatName}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
              <span>{activeSatAltKm} km</span>
              <span className="text-cyan-400">{activeSatElDeg.toFixed(1)}° EL</span>
            </div>
          </GlassPanel>
        </motion.div>
      </div>

      {/* Subtle Scroll Down Prompt */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-[10px] font-mono text-slate-500 uppercase tracking-widest pointer-events-none">
        <ArrowDown className="h-3.5 w-3.5 animate-bounce text-cyan-400/70" />
      </div>
    </section>
  );
}
