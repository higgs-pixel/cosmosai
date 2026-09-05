"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { SatelliteVisibilityResult } from "@/lib/orbit/visibility";
import { ObserverCoords, SatellitePass } from "@/components/intelligence/PassPredictor";

const SkyPassAnalytics = dynamic(() => import("@/components/intelligence/SkyPassAnalytics"), {
  ssr: false,
  loading: () => (
    <div className="w-full py-16 flex items-center justify-center font-mono text-xs text-cyan-400">
      COMPUTING ORBITAL TELEMETRY ANALYTICS…
    </div>
  ),
});

interface CinematicAnalyticsSectionProps {
  selectedSat: SatelliteVisibilityResult | null;
  visibleSats: SatelliteVisibilityResult[];
  observer: ObserverCoords;
  timeMs: number;
  selectedPass?: SatellitePass | null;
}

export const CinematicAnalyticsSection = memo(function CinematicAnalyticsSection({
  selectedSat,
  visibleSats,
  observer,
  timeMs,
  selectedPass,
}: CinematicAnalyticsSectionProps) {
  return (
    <section
      id="analytics"
      className="relative w-full py-20 px-4 sm:px-8 md:px-12 lg:px-16 bg-black select-none border-t border-white/[0.08]"
    >
      <div className="max-w-[1720px] mx-auto space-y-8">
        {/* Section Header */}
        <div className="space-y-2 pb-4 border-b border-white/10">
          <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-cyan-400 uppercase font-semibold">
            06 // ORBITAL ANALYTICS
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extralight text-white uppercase tracking-tight">
            ORBITAL ANALYTICS
          </h2>
          <p className="text-xs sm:text-sm font-light text-slate-400 tracking-wide">
            TOPOCENTRIC PASS ELEVATION CURVES & CELESTIAL FLEET SPECTRA
          </p>
        </div>

        {/* Large Transparent Analytical Surface */}
        <div className="w-full border border-white/10 bg-white/[0.01]">
          <SkyPassAnalytics
            selectedSat={selectedSat}
            visibleSats={visibleSats}
            observer={observer}
            timeMs={timeMs}
            selectedPass={selectedPass}
          />
        </div>
      </div>
    </section>
  );
});

export default CinematicAnalyticsSection;
