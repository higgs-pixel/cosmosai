"use client";

import { memo } from "react";
import { SatelliteVisibilityResult } from "@/lib/orbit/visibility";
import { Sparkles, Sun, Moon, Activity, Target } from "lucide-react";

interface SatelliteIntelligenceSectionProps {
  selectedSat: SatelliteVisibilityResult | null;
}

export const SatelliteIntelligenceSection = memo(function SatelliteIntelligenceSection({
  selectedSat,
}: SatelliteIntelligenceSectionProps) {
  if (!selectedSat) return null;

  const velocityKmh = 27600; // Standard LEO orbital velocity
  const inclinationDeg = 51.64;
  const periodMin = 92.8;

  return (
    <section
      id="satellite-intelligence"
      className="relative w-full py-20 px-4 sm:px-8 md:px-12 lg:px-16 bg-black select-none border-t border-white/[0.08]"
    >
      <div className="max-w-[1720px] mx-auto space-y-12">
        {/* Section Header */}
        <div className="space-y-2 pb-4 border-b border-white/10">
          <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-cyan-400 uppercase font-semibold">
            04 // SATELLITE INTELLIGENCE
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extralight text-white uppercase tracking-tight">
              {selectedSat.satName}
            </h2>
            <div className="font-mono text-xs tracking-widest text-slate-400 uppercase">
              NORAD ID #{selectedSat.satId} &bull; {selectedSat.category.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Big Editorial Numbers Grid (Huge Typography + Ample Whitespace) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Metric 1: Altitude */}
          <div className="space-y-2 border-l border-white/15 pl-6">
            <div className="text-5xl sm:text-6xl lg:text-7xl font-extralight text-white tracking-tight">
              {selectedSat.satAltKm}
            </div>
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-slate-400 uppercase">
              KILOMETERS ALTITUDE
            </div>
          </div>

          {/* Metric 2: Velocity */}
          <div className="space-y-2 border-l border-white/15 pl-6">
            <div className="text-5xl sm:text-6xl lg:text-7xl font-extralight text-white tracking-tight">
              27,600
            </div>
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-slate-400 uppercase">
              KM/H VELOCITY
            </div>
          </div>

          {/* Metric 3: Inclination */}
          <div className="space-y-2 border-l border-white/15 pl-6">
            <div className="text-5xl sm:text-6xl lg:text-7xl font-extralight text-white tracking-tight">
              {inclinationDeg}°
            </div>
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-slate-400 uppercase">
              ORBITAL INCLINATION
            </div>
          </div>

          {/* Metric 4: Period */}
          <div className="space-y-2 border-l border-white/15 pl-6">
            <div className="text-5xl sm:text-6xl lg:text-7xl font-extralight text-white tracking-tight">
              {periodMin}
            </div>
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-slate-400 uppercase">
              MINUTES PER REVOLUTION
            </div>
          </div>
        </div>

        {/* Secondary Telemetry Strip */}
        <div className="p-6 md:p-8 border border-white/10 bg-white/[0.01] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">
              TOPOCENTRIC ELEVATION
            </span>
            <span className="text-xl sm:text-2xl font-light text-white font-mono">
              {selectedSat.elevationDeg}°
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">
              AZIMUTH BEARING
            </span>
            <span className="text-xl sm:text-2xl font-light text-white font-mono">
              {selectedSat.azimuthDeg}°
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">
              SLANT RANGE
            </span>
            <span className="text-xl sm:text-2xl font-light text-cyan-400 font-mono">
              {selectedSat.slantRangeKm} km
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">
              EST. VISUAL MAGNITUDE
            </span>
            <span className="text-xl sm:text-2xl font-light text-emerald-400 font-mono">
              {selectedSat.estimatedMagnitude > 0 ? `+${selectedSat.estimatedMagnitude}` : selectedSat.estimatedMagnitude} mᵥ
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">
              ILLUMINATION
            </span>
            <span className="text-sm font-mono font-semibold uppercase text-white flex items-center gap-1.5 pt-1">
              {selectedSat.isSunlit ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>SUNLIT</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-purple-400" />
                  <span>IN EARTH SHADOW</span>
                </>
              )}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">
              OPTICAL VISIBILITY
            </span>
            <span className="text-sm font-mono font-semibold uppercase pt-1 block">
              {selectedSat.isNakedEyeVisible ? (
                <span className="text-emerald-400">NAKED-EYE VISIBLE</span>
              ) : (
                <span className="text-slate-400">OPTICAL / TELESCOPIC</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
});

export default SatelliteIntelligenceSection;
