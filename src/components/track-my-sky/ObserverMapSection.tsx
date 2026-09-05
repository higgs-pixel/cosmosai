"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation, Compass, Crosshair, Search } from "lucide-react";
import { ObserverConfig } from "@/components/intelligence/TrackMySkyDashboard";
import { SatellitePass } from "@/components/intelligence/PassPredictor";
import { SatelliteVisibilityResult } from "@/lib/orbit/visibility";

const Observer2DMap = dynamic(() => import("@/components/intelligence/Observer2DMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-emerald-400">
      INITIALIZING 2D SATELLITE RADAR…
    </div>
  ),
});

interface ObserverMapSectionProps {
  observer: ObserverConfig;
  selectedSat: SatelliteVisibilityResult | null;
  selectedPass: SatellitePass | null;
  uiTimeMs: number;
  presetCities: { name?: string; lat: number; lon: number; altMeters?: number }[];
  gpsStatus: string;
  customLat: string;
  customLon: string;
  onSelectPresetCity: (city: { name?: string; lat: number; lon: number; altMeters?: number }) => void;
  onDetectGps: () => void;
  onCustomLatChange: (val: string) => void;
  onCustomLonChange: (val: string) => void;
  onApplyCustomCoords: () => void;
}

export const ObserverMapSection = memo(function ObserverMapSection({
  observer,
  selectedSat,
  selectedPass,
  uiTimeMs,
  presetCities,
  gpsStatus,
  customLat,
  customLon,
  onSelectPresetCity,
  onDetectGps,
  onCustomLatChange,
  onCustomLonChange,
  onApplyCustomCoords,
}: ObserverMapSectionProps) {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <section id="observer-map" className="relative w-full py-20 px-4 sm:px-8 md:px-12 lg:px-16 bg-black select-none border-t border-white/[0.08]">
      <div className="max-w-[1720px] mx-auto space-y-8">
        {/* Section Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/10">
          <div className="space-y-2">
            <div className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-emerald-400 uppercase font-semibold">
              03 // GEOSPATIAL INTELLIGENCE
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extralight text-white uppercase tracking-tight">
              OBSERVER MAP
            </h2>
            <p className="text-xs sm:text-sm font-light text-slate-400 tracking-wide">
              TOPOCENTRIC GROUND TRACK & SATELLITE FOOTPRINT
            </p>
          </div>

          {/* Location Actions Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={onDetectGps}
              className="px-4 py-2 border border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-black font-mono text-xs tracking-wider uppercase transition cursor-pointer flex items-center gap-2"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>{gpsStatus === "locating" ? "LOCATING…" : "DETECT GPS"}</span>
            </button>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-4 py-2 border border-white/20 hover:border-white bg-white/[0.04] hover:bg-white text-white hover:text-black font-mono text-xs tracking-wider uppercase transition cursor-pointer"
            >
              {showConfig ? "HIDE LOCATION TOOLBAR" : "CHANGE LOCATION"}
            </button>
          </div>
        </div>

        {/* Expandable Ground Station Configuration Strip */}
        {showConfig && (
          <div className="p-4 border border-white/15 bg-black/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            {/* Quick City Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mr-1">
                PRESETS:
              </span>
              {presetCities.slice(0, 7).map((city, idx) => (
                <button
                  key={`city-${city.name || idx}`}
                  onClick={() => onSelectPresetCity(city)}
                  className="px-2.5 py-1 text-xs font-mono border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {(city.name || "Station").split(",")[0]}
                </button>
              ))}
            </div>

            {/* Custom Coordinates Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customLat}
                onChange={(e) => onCustomLatChange(e.target.value)}
                placeholder="LAT"
                className="w-20 px-2 py-1 text-xs font-mono bg-black border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                value={customLon}
                onChange={(e) => onCustomLonChange(e.target.value)}
                placeholder="LON"
                className="w-20 px-2 py-1 text-xs font-mono bg-black border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={onApplyCustomCoords}
                className="px-3 py-1 text-xs font-mono bg-white text-black font-bold uppercase transition hover:opacity-80 cursor-pointer"
              >
                APPLY
              </button>
            </div>
          </div>
        )}

        {/* Large Observation Map Viewport */}
        <div className="relative w-full h-[540px] sm:h-[640px] border border-white/10 bg-black overflow-hidden">
          <Observer2DMap
            observer={observer}
            selectedPass={selectedPass}
            timeMs={uiTimeMs}
            simPoint={
              selectedSat
                ? {
                    lat: selectedSat.satLat,
                    lon: selectedSat.satLon,
                    satName: selectedSat.satName,
                    elDeg: selectedSat.elevationDeg,
                    line1: selectedSat.line1,
                    line2: selectedSat.line2,
                  }
                : null
            }
          />

          {/* Minimal Glass Overlay inspired by NASA Mission Control */}
          <div className="absolute top-6 left-6 z-20 pointer-events-none max-w-sm p-5 border border-white/15 bg-black/75 backdrop-blur-md space-y-3">
            <div className="space-y-0.5">
              <div className="font-mono text-[9px] tracking-[0.2em] text-slate-400 uppercase">
                OBSERVER LOCATION
              </div>
              <div className="text-sm font-light text-white tracking-wide truncate">
                {observer.name}
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="font-mono text-[9px] tracking-[0.2em] text-slate-400 uppercase">
                LIVE COORDINATES
              </div>
              <div className="font-mono text-xs text-emerald-400 font-semibold">
                {observer.lat.toFixed(4)}° N &bull; {observer.lon.toFixed(4)}° E
              </div>
            </div>

            {selectedSat && (
              <div className="space-y-0.5 pt-2 border-t border-white/10">
                <div className="font-mono text-[9px] tracking-[0.2em] text-cyan-400 uppercase flex items-center gap-1.5">
                  <Crosshair className="h-3 w-3" />
                  <span>GROUND TRACK TARGET</span>
                </div>
                <div className="text-sm font-light text-white truncate">
                  {selectedSat.satName}
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  Sub-point: {selectedSat.satLat.toFixed(2)}°, {selectedSat.satLon.toFixed(2)}°
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

export default ObserverMapSection;
