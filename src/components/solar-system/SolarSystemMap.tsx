"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { PlanetState, getSolarSystemState } from "@/lib/solar-system/ephemeris";
import {
  Activity,
  Calendar,
  Compass,
  Cpu,
  Globe,
  Info,
  Maximize2,
  Navigation,
  Orbit,
  Play,
  RotateCcw,
} from "lucide-react";

const SolarSystem3D = dynamic(
  () => import("./SolarSystem3D").then((m) => m.SolarSystem3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] w-full items-center justify-center rounded-xl border border-white/5 bg-[#060c18] font-mono text-[10px] uppercase tracking-wider text-gray-500">
        Initializing orbital renderer…
      </div>
    )
  }
);


const PLANET_COLORS: Record<string, { core: string; orbit: string }> = {
  Sun: { core: "#f59e0b", orbit: "rgba(245, 158, 11, 0.2)" },
  Mercury: { core: "#9ca3af", orbit: "rgba(156, 163, 175, 0.15)" },
  Venus: { core: "#f59e0b", orbit: "rgba(245, 158, 11, 0.15)" },
  Earth: { core: "#3b82f6", orbit: "rgba(59, 130, 246, 0.18)" },
  Moon: { core: "#e5e7eb", orbit: "rgba(229, 231, 235, 0.15)" },
  Mars: { core: "#ef4444", orbit: "rgba(239, 68, 68, 0.15)" },
  Jupiter: { core: "#f97316", orbit: "rgba(249, 115, 22, 0.15)" },
  Saturn: { core: "#fbbf24", orbit: "rgba(251, 191, 36, 0.15)" },
  Uranus: { core: "#22d3ee", orbit: "rgba(34, 211, 238, 0.15)" },
  Neptune: { core: "#6366f1", orbit: "rgba(99, 102, 241, 0.15)" },
  Pluto: { core: "#a78bfa", orbit: "rgba(167, 139, 250, 0.12)" },
};

export function SolarSystemMap() {
  const [isLive, setIsLive] = useState(true);
  const [isRealTime, setIsRealTime] = useState(false); // Default to false so it visibly animates immediately!
  const [timeMultiplier, setTimeMultiplier] = useState(15); // days per second
  const [selectedDateMs, setSelectedDateMs] = useState<number>(Date.now());
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>("Earth");

  // Interactive Pan / Zoom states
  const [visualScale, setVisualScale] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);
  // Time slider bounds: +/- 5 years
  const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
  const sliderMin = useMemo(() => Date.now() - FIVE_YEARS_MS, []);
  const sliderMax = useMemo(() => Date.now() + FIVE_YEARS_MS, []);

  // Update loop for real-time calculations
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      if (isRealTime) {
        setSelectedDateMs(Date.now());
      } else {
        // Advance by (timeMultiplier / 10) days per 100ms tick
        const stepMs = timeMultiplier * 0.1 * 24 * 60 * 60 * 1000;
        setSelectedDateMs((prev) => {
          const next = prev + stepMs;
          if (next > sliderMax) {
            return sliderMin; // Wrap around to timeline start
          }
          return next;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLive, isRealTime, timeMultiplier, sliderMin, sliderMax]);

  // Compute ephemeris data
  const ephemerisData = useMemo(() => {
    return getSolarSystemState(new Date(selectedDateMs));
  }, [selectedDateMs]);

  const selectedPlanet = useMemo(() => {
    return ephemerisData[selectedPlanetId] || ephemerisData["Earth"];
  }, [ephemerisData, selectedPlanetId]);

  const resetView = () => {
    setResetTrigger((prev) => prev + 1);
  };

  if (!selectedPlanet) {
    return (
      <div className="grid min-h-[480px] place-items-center rounded-2xl border border-white/10 bg-[#0f1526] text-gray-500 text-xs font-mono">
        Initializing Orbital Ephemeris calculations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Map visualization layout */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#060c18] p-1 shadow-2xl">
        {/* Overlay header controls */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400">
            Heliocentric Orbital Engine (VSOP87)
          </span>
        </div>

        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={() => setVisualScale(!visualScale)}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-[#0f1526]/80 px-2.5 font-mono text-[9px] font-semibold text-gray-300 transition hover:bg-white/[0.08]"
            title="Toggle Visual / True Scale"
          >
            <Cpu className="h-3.5 w-3.5" />
            {visualScale ? "Visual Scale" : "True Scale"}
          </button>
          
          <button
            type="button"
            onClick={resetView}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-[#0f1526]/80 px-2.5 font-mono text-[9px] font-semibold text-gray-300 transition hover:bg-white/[0.08]"
            title="Reset Map Pan/Zoom"
          >
            <RotateCcw className="h-3 w-3" />
            Reset View
          </button>
        </div>

        {/* Required Attribution overlay */}
        <div className="absolute bottom-4 left-4 z-20 font-mono text-[8px] text-gray-500 uppercase tracking-wider">
          Planet textures © Solar System Scope, CC BY 4.0
        </div>

        <div className="absolute bottom-4 right-4 z-20 font-mono text-[8px] text-gray-500 uppercase tracking-wider hidden sm:block">
          Drag to orbit • Scroll to zoom • Right-click to pan
        </div>

        {/* 3D WebGL solar system viewer */}
        <SolarSystem3D
          selectedPlanetId={selectedPlanetId}
          onSelectPlanet={setSelectedPlanetId}
          ephemerisData={ephemerisData}
          resetTrigger={resetTrigger}
          visualScale={visualScale}
        />
      </div>

      {/* Date-scrubbing controls panel */}
      <div className="rounded-xl border border-white/10 bg-[#0f1526] p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsLive(!isLive);
                if (!isLive) {
                  setIsRealTime(false); // Default to speed orbit simulation when resuming
                }
              }}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition ${
                isLive && !isRealTime
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.08]"
              }`}
            >
              <Play className={`h-3 w-3 ${isLive && !isRealTime ? "fill-emerald-400" : ""}`} />
              {isLive && !isRealTime ? "ORBITING" : "PLAY"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRealTime(true);
                setIsLive(true);
              }}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition ${
                isLive && isRealTime
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                  : "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.08]"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              LOCK LIVE
            </button>

            {/* Speed Multipliers */}
            {!isRealTime && (
              <div className="flex items-center gap-1 rounded-lg bg-white/[0.02] border border-white/5 p-0.5">
                {[
                  { label: "5d/s", value: 5 },
                  { label: "15d/s", value: 15 },
                  { label: "60d/s", value: 60 },
                  { label: "180d/s", value: 180 },
                ].map((speed) => (
                  <button
                    key={speed.value}
                    type="button"
                    onClick={() => {
                      setTimeMultiplier(speed.value);
                      setIsLive(true);
                    }}
                    className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase transition ${
                      timeMultiplier === speed.value && isLive
                        ? "bg-blue-500/20 text-blue-400"
                        : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                    }`}
                  >
                    {speed.label}
                  </button>
                ))}
              </div>
            )}
            
            <span className="font-mono text-xs text-gray-300 ml-2">
              {new Date(selectedDateMs).toUTCString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400/80" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-gray-400">Time Warp Dial</span>
          </div>
        </div>

        {/* Input slider */}
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          value={selectedDateMs}
          onChange={(e) => {
            setIsLive(false);
            setIsRealTime(false);
            setSelectedDateMs(Number(e.target.value));
          }}
          className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 outline-none accent-blue-500"
        />
        <div className="mt-2 flex justify-between font-mono text-[8px] text-gray-500 uppercase tracking-wider">
          <span>5 Years Ago</span>
          <span>Today (Now)</span>
          <span>5 Years Ahead</span>
        </div>
      </div>

      {/* Details Card for Selected Planet */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Core telemetry details */}
        <div className="rounded-2xl border border-white/10 bg-[#0f1526] p-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Orbit className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {selectedPlanet.name} Coordinates
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="flex flex-col border-b border-white/5 pb-1">
              <span className="text-[10px] uppercase text-gray-400">Heliocentric X</span>
              <span className="font-mono text-sm text-gray-200">{selectedPlanet.x.toFixed(5)} AU</span>
            </div>
            <div className="flex flex-col border-b border-white/5 pb-1">
              <span className="text-[10px] uppercase text-gray-400">Heliocentric Y</span>
              <span className="font-mono text-sm text-gray-200">{selectedPlanet.y.toFixed(5)} AU</span>
            </div>
            <div className="flex flex-col border-b border-white/5 pb-1">
              <span className="text-[10px] uppercase text-gray-400">Distance from Sun</span>
              <span className="font-mono text-sm text-gray-200">{selectedPlanet.distanceSun.toFixed(5)} AU</span>
            </div>
            <div className="flex flex-col border-b border-white/5 pb-1">
              <span className="text-[10px] uppercase text-gray-400">Distance from Earth</span>
              <span className="font-mono text-sm text-gray-200">{selectedPlanet.distanceEarth.toFixed(5)} AU</span>
            </div>
            <div className="flex flex-col border-b border-white/5 pb-1">
              <span className="text-[10px] uppercase text-gray-400">Right Ascension</span>
              <span className="font-mono text-sm text-gray-200">{selectedPlanet.raHours.toFixed(4)} hrs</span>
            </div>
            <div className="flex flex-col border-b border-white/5 pb-1">
              <span className="text-[10px] uppercase text-gray-400">Declination</span>
              <span className="font-mono text-sm text-gray-200">{selectedPlanet.decDeg.toFixed(4)}°</span>
            </div>
          </div>
        </div>

        {/* Space dynamics and orbital timelines */}
        <div className="rounded-2xl border border-white/10 bg-[#0f1526] p-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Info className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Orbital Characteristics</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="flex flex-col border-b border-white/5 pb-1">
              <span className="text-[10px] uppercase text-gray-400">Orbital Velocity</span>
              <span className="font-mono text-sm text-gray-200">
                {selectedPlanet.speedKms > 0 ? `${selectedPlanet.speedKms.toFixed(3)} km/s` : "—"}
              </span>
            </div>
            <div className="flex flex-col border-b border-white/5 pb-1">
              <span className="text-[10px] uppercase text-gray-400">Orbital Period</span>
              <span className="font-mono text-sm text-gray-200">
                {selectedPlanet.periodDays > 0
                  ? selectedPlanet.periodDays >= 365
                    ? `${(selectedPlanet.periodDays / 365).toFixed(2)} Earth yrs`
                    : `${selectedPlanet.periodDays.toFixed(1)} Earth days`
                  : "—"}
              </span>
            </div>
            
            {selectedPlanet.nextPerihelion && (
              <div className="col-span-2 flex flex-col border-b border-white/5 pb-1 pt-1">
                <span className="text-[10px] uppercase text-gray-400">Next Perihelion (Closest)</span>
                <span className="font-mono text-xs text-gray-300">
                  {new Date(selectedPlanet.nextPerihelion).toUTCString()}
                </span>
              </div>
            )}
            
            {selectedPlanet.nextAphelion && (
              <div className="col-span-2 flex flex-col pt-1">
                <span className="text-[10px] uppercase text-gray-400">Next Aphelion (Farthest)</span>
                <span className="font-mono text-xs text-gray-300">
                  {new Date(selectedPlanet.nextAphelion).toUTCString()}
                </span>
              </div>
            )}

            {!selectedPlanet.nextPerihelion && (
              <div className="col-span-2 text-center py-4 text-xs text-gray-500 italic">
                Apsis dates not applicable (e.g. Earth barycenter barycentric solver fallback, Sun, or Moon).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
