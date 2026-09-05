"use client";

import { memo, useState } from "react";
import { Globe, Compass, Sparkles, Play, Pause, RotateCcw, Clock, Layers } from "lucide-react";
import dynamic from "next/dynamic";
import { SatelliteData } from "@/components/intelligence/store";
import { SatelliteVisibilityResult, ObserverTwilightInfo } from "@/lib/orbit/visibility";
import { ObserverConfig } from "@/components/intelligence/TrackMySkyDashboard";

const Satellite3DView = dynamic(() => import("@/components/intelligence/Satellite3DView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-cyan-400">
      INITIALIZING 3D ORBITAL GLOBE…
    </div>
  ),
});

const SkyDomeChart = dynamic(() => import("@/components/intelligence/SkyDomeChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-cyan-400">
      INITIALIZING POLAR INSTRUMENT…
    </div>
  ),
});

const StarGazeView = dynamic(() => import("@/components/intelligence/StarGazeView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-cyan-400">
      INITIALIZING PLANETARIUM DOME…
    </div>
  ),
});

interface LiveOrbitSectionProps {
  satellites: SatelliteData[];
  selectedSatId: number | null;
  selectedSat: SatelliteVisibilityResult | null;
  latestPositionsRef: React.RefObject<Float32Array | null>;
  observer: ObserverConfig;
  visibilityResults: SatelliteVisibilityResult[];
  allEvaluatedSats: SatelliteVisibilityResult[];
  twilight: ObserverTwilightInfo;
  uiTimeMs: number;
  isPaused: boolean;
  speed: number;
  formattedClock: string;
  onTogglePlay: () => void;
  onLiveSync: () => void;
  onSetSpeed: (spd: number) => void;
  onSelectSat: (id: number) => void;
}

export const LiveOrbitSection = memo(function LiveOrbitSection({
  satellites,
  selectedSatId,
  selectedSat,
  latestPositionsRef,
  observer,
  visibilityResults,
  allEvaluatedSats,
  twilight,
  uiTimeMs,
  isPaused,
  speed,
  formattedClock,
  onTogglePlay,
  onLiveSync,
  onSetSpeed,
  onSelectSat,
}: LiveOrbitSectionProps) {
  const [activeView, setActiveView] = useState<"3d" | "polar" | "stargaze">("3d");

  const speeds = [1, 2, 5, 10, 60];

  return (
    <section id="live-orbit" className="relative w-full py-20 px-4 sm:px-8 md:px-12 lg:px-16 bg-black select-none border-t border-white/[0.08]">
      <div className="max-w-[1720px] mx-auto space-y-8">
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/10">
          <div className="space-y-2">
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-cyan-400 uppercase font-semibold">
              02 // OBSERVATION STAGE
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extralight text-white uppercase tracking-tight">
              LIVE ORBIT
            </h2>
            <p className="text-xs sm:text-sm font-light text-slate-400 tracking-wide">
              REAL-TIME POSITION OF OBJECTS ABOVE YOUR HORIZON
            </p>
          </div>

          {/* Minimalist Viewport Toggle & Time Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Selector Buttons */}
            <div className="flex items-center border border-white/20 bg-white/[0.02] p-1">
              <button
                onClick={() => setActiveView("3d")}
                className={`px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition cursor-pointer ${
                  activeView === "3d" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                3D GLOBE
              </button>
              <button
                onClick={() => setActiveView("polar")}
                className={`px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition cursor-pointer ${
                  activeView === "polar" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                POLAR DOME
              </button>
              <button
                onClick={() => setActiveView("stargaze")}
                className={`px-3 py-1.5 font-mono text-xs tracking-wider uppercase transition cursor-pointer ${
                  activeView === "stargaze" ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                PLANETARIUM
              </button>
            </div>
          </div>
        </div>

        {/* Cinematic Main Observation Viewport */}
        <div className="relative w-full h-[640px] sm:h-[720px] lg:h-[800px] border border-white/10 bg-black/60 overflow-hidden">
          {/* 3D Globe Mode */}
          {activeView === "3d" && (
            <div className="w-full h-full relative">
              <Satellite3DView
                satellites={satellites}
                selectedSatId={selectedSatId}
                latestPositions={latestPositionsRef}
                lockCamera={false}
                observer={observer}
                onTrackSatellite={onSelectSat}
              />
            </div>
          )}

          {/* Polar Sky Dome Mode */}
          {activeView === "polar" && (
            <div className="w-full h-full relative p-4 flex items-center justify-center">
              <SkyDomeChart
                visibleSats={visibilityResults}
                allEvaluatedSats={allEvaluatedSats}
                twilight={twilight}
                observer={{ ...observer, name: observer.name || "Observer Site" }}
                timeMs={uiTimeMs}
                selectedSatId={selectedSatId}
                onSelectSat={onSelectSat}
              />
            </div>
          )}

          {/* Planetarium Stargaze 3D Dome Mode */}
          {activeView === "stargaze" && (
            <div className="w-full h-full relative">
              <StarGazeView observer={observer} />
            </div>
          )}

          {/* Floating Minimalist Telemetry HUD (Top-Left overlay) */}
          {selectedSat && (
            <div className="absolute top-6 left-6 z-20 pointer-events-none max-w-sm p-4 border border-white/15 bg-black/70 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  TARGET LOCK
                </span>
                <span>NORAD {selectedSat.satId}</span>
              </div>
              <div className="text-base font-light text-white tracking-wide truncate">
                {selectedSat.satName}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-white/10">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">ALTITUDE</span>
                  <span className="font-semibold text-white">{selectedSat.satAltKm} KM</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">ELEVATION</span>
                  <span className="font-semibold text-white">{selectedSat.elevationDeg}°</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">AZIMUTH</span>
                  <span className="font-semibold text-white">{selectedSat.azimuthDeg}°</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">SLANT RANGE</span>
                  <span className="font-semibold text-cyan-400">{selectedSat.slantRangeKm} KM</span>
                </div>
              </div>
            </div>
          )}

          {/* Floating Bottom Time Control Bar */}
          <div className="absolute bottom-6 inset-x-6 z-20 flex flex-wrap items-center justify-between gap-4 p-3 border border-white/10 bg-black/80 backdrop-blur-md">
            {/* Play/Pause & Live Sync */}
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlay}
                className="h-8 px-3 border border-white/20 hover:border-white bg-white/[0.05] hover:bg-white text-white hover:text-black font-mono text-xs tracking-wider uppercase transition cursor-pointer flex items-center gap-1.5"
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                <span>{isPaused ? "RESUME" : "PAUSE"}</span>
              </button>

              <button
                onClick={onLiveSync}
                className="h-8 px-3 border border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-black font-mono text-xs tracking-wider uppercase transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                <span>LIVE SYNC</span>
              </button>
            </div>

            {/* Current Simulation Clock Display */}
            <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-white">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>{formattedClock}</span>
            </div>

            {/* Speed Multiplier Buttons */}
            <div className="flex items-center border border-white/15 bg-white/[0.02]">
              {speeds.map((spd) => (
                <button
                  key={`spd-${spd}`}
                  onClick={() => onSetSpeed(spd)}
                  className={`px-2.5 py-1 text-[11px] font-mono tracking-wider transition cursor-pointer ${
                    speed === spd ? "bg-white text-black font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {spd}X
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default LiveOrbitSection;
