"use client";

import { memo } from "react";
import { SatelliteVisibilityResult } from "@/lib/orbit/visibility";
import { Sparkles, Orbit, ShieldCheck, Activity, Award, Compass } from "lucide-react";

interface MissionDossierSectionProps {
  selectedSat: SatelliteVisibilityResult | null;
}

export const MissionDossierSection = memo(function MissionDossierSection({
  selectedSat,
}: MissionDossierSectionProps) {
  const satName = selectedSat?.satName || "INTERNATIONAL SPACE STATION";
  const isIss = satName.includes("ISS") || satName.includes("ZARYA");
  const isTiangong = satName.includes("TIANGONG") || satName.includes("CSS");
  const isHubble = satName.includes("HST") || satName.includes("HUBBLE");

  return (
    <section
      id="mission-dossier"
      className="relative w-full py-24 px-4 sm:px-8 md:px-12 lg:px-16 bg-black select-none border-t border-white/[0.08]"
    >
      <div className="max-w-[1720px] mx-auto space-y-12">
        {/* Section Header */}
        <div className="space-y-2 pb-4 border-b border-white/10">
          <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-cyan-400 uppercase font-semibold">
            08 // MISSION ARCHIVE
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extralight text-white uppercase tracking-tight">
            MISSION DOSSIER
          </h2>
          <p className="text-xs sm:text-sm font-light text-slate-400 tracking-wide">
            TECHNICAL SPECIFICATIONS & ORBITAL EXPEDITION RECORD
          </p>
        </div>

        {/* NASA Feature Article Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Mission Schematic & Visual Focal Point */}
          <div className="lg:col-span-5 space-y-6">
            <div className="relative w-full h-[400px] sm:h-[480px] border border-white/10 bg-white/[0.01] flex flex-col items-center justify-center p-8 overflow-hidden">
              {/* Outer Reticle Ring */}
              <div className="absolute inset-8 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-16 rounded-full border border-cyan-500/20 pointer-events-none" />

              {/* Wireframe Satellite Schematic representation */}
              <div className="relative z-10 flex flex-col items-center space-y-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-cyan-400/40 flex items-center justify-center bg-cyan-500/5">
                  <Orbit className="h-12 w-12 sm:h-16 sm:w-16 text-cyan-400 animate-spin" style={{ animationDuration: "35s" }} />
                </div>
                <div className="text-center space-y-1">
                  <div className="font-mono text-xs tracking-widest text-white uppercase font-bold">
                    {satName}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    SGP4 ACTIVE &bull; NORAD #{selectedSat?.satId || 25544}
                  </div>
                </div>
              </div>

              {/* Laser Corner Brackets */}
              <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-white/40" />
              <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-white/40" />
              <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-white/40" />
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-white/40" />
            </div>

            {/* Quick Status Pill */}
            <div className="p-4 border border-white/10 bg-white/[0.02] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-widest text-[10px]">OPERATIONAL STATUS</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                NOMINAL / FLIGHT ACTIVE
              </span>
            </div>
          </div>

          {/* Right Column: In-Depth Editorial Article Content */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <div className="font-mono text-xs tracking-[0.2em] text-cyan-400 uppercase">
                EXPEDITION OVERVIEW
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-light text-white tracking-tight leading-snug">
                {isIss
                  ? "A Microgravity Laboratory Pioneering the Future of Deep Space Exploration"
                  : isTiangong
                  ? "Permanent Chinese Orbital Outpost Advancing Space Station Science"
                  : isHubble
                  ? "Over Three Decades of Deep Space Astronomical Discovery"
                  : `Orbital Intelligence Profile for ${satName}`}
              </h3>
              <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed">
                {isIss
                  ? "The International Space Station is the largest modular space station in low Earth orbit. A collaborative project between NASA, Roscosmos, JAXA, ESA, and CSA, it serves as a continuous human outpost and cutting-edge orbital research facility examining astrophysics, astrobiology, materials science, and human physiology."
                  : isTiangong
                  ? "Tiangong, meaning 'Palace in the Sky', is China's permanently crewed space station operating in low Earth orbit at an altitude between 340 and 450 km. It hosts scientific experiment racks and regular taikonaut rotation crews."
                  : isHubble
                  ? "The Hubble Space Telescope has revolutionized our understanding of the cosmos, determining the rate of cosmic expansion, observing distant galaxies across billions of light-years, and providing iconic imagery of stellar nurseries."
                  : `Real-time topocentric ephemeris and orbital state tracking for spacecraft ${satName}. Position propagated using SGP4 perturbation theories based on daily CelesTrak two-line element sets.`}
              </p>
            </div>

            {/* Technical Specifications Matrix */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="font-mono text-xs tracking-[0.2em] text-slate-400 uppercase">
                TECHNICAL SPECIFICATIONS
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 font-mono text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">MASS AT LAUNCH</span>
                  <span className="text-white font-semibold">{isIss ? "419,725 KG" : isTiangong ? "66,000 KG" : isHubble ? "11,110 KG" : "CLASSIFIED"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">SOLAR ARRAY SPAN</span>
                  <span className="text-white font-semibold">{isIss ? "109 METERS" : isTiangong ? "58 METERS" : isHubble ? "13.2 METERS" : "DUAL WING"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">ORBIT APOGEE</span>
                  <span className="text-white font-semibold">{isIss ? "422 KM" : isTiangong ? "390 KM" : isHubble ? "540 KM" : "LEO STANDARD"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">ORBIT PERIGEE</span>
                  <span className="text-white font-semibold">{isIss ? "418 KM" : isTiangong ? "385 KM" : isHubble ? "535 KM" : "LEO STANDARD"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">INCLINATION</span>
                  <span className="text-white font-semibold">{isIss ? "51.64°" : isTiangong ? "41.47°" : isHubble ? "28.47°" : "55.0°"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase block">COMMUNICATIONS</span>
                  <span className="text-cyan-400 font-semibold">S-BAND / KU-BAND</span>
                </div>
              </div>
            </div>

            {/* Scientific Accomplishments */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="font-mono text-xs tracking-[0.2em] text-slate-400 uppercase flex items-center gap-2">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                <span>EXPEDITION MILESTONES</span>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300 font-light list-disc list-inside">
                <li>Continuous human presence in low Earth orbit spanning over two decades</li>
                <li>Over 3,000 scientific investigations conducted from 108 participating nations</li>
                <li>Pioneering deep-space life support systems, water recycling and ion propulsion testing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default MissionDossierSection;
