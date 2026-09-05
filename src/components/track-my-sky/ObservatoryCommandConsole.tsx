"use client";

import {
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Radio,
  Sun,
  Moon,
  Crosshair,
  SlidersHorizontal,
} from "lucide-react";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";
import { ObserverTwilightInfo } from "@/lib/orbit/visibility";

interface ObservatoryCommandConsoleProps {
  observer: ObserverCoords & { accuracyRadiusMeters?: number; source?: string };
  presetCities: ObserverCoords[];
  onSelectPresetCity: (city: ObserverCoords) => void;
  onDetectGps: () => void;
  gpsStatus: "locating" | "success" | "phone-paired";
  customLat: string;
  customLon: string;
  customAlt: string;
  onCustomLatChange: (val: string) => void;
  onCustomLonChange: (val: string) => void;
  onCustomAltChange: (val: string) => void;
  onApplyCustomCoords: () => void;
  // Simulation Clock
  isPaused: boolean;
  onTogglePlay: () => void;
  onLiveSync: () => void;
  speed: number;
  onSetSpeed: (s: number) => void;
  skyCatalogGroup: "active" | "visual" | "weather" | "gnss" | "stations";
  onSetSkyCatalogGroup: (g: "active" | "visual" | "weather" | "gnss" | "stations") => void;
  selectedTz: string;
  onSelectTz: (tz: string) => void;
  timezoneOptions: { id: string; name: string; code: string }[];
  totalSats: number;
  loadingSats: boolean;
  formattedClock: string;
  timeMs: number;
  sliderBaseTime: number;
  onTimeScrubberChange: (timeMs: number) => void;
  twilight: ObserverTwilightInfo;
  aboveHorizonCount: number;
  nakedEyeCount: number;
}

export function ObservatoryCommandConsole({
  observer,
  presetCities,
  onSelectPresetCity,
  onDetectGps,
  gpsStatus,
  customLat,
  customLon,
  customAlt,
  onCustomLatChange,
  onCustomLonChange,
  onCustomAltChange,
  onApplyCustomCoords,
  isPaused,
  onTogglePlay,
  onLiveSync,
  speed,
  onSetSpeed,
  skyCatalogGroup,
  onSetSkyCatalogGroup,
  selectedTz,
  onSelectTz,
  timezoneOptions,
  totalSats,
  loadingSats,
  formattedClock,
  timeMs,
  sliderBaseTime,
  onTimeScrubberChange,
  twilight,
  aboveHorizonCount,
  nakedEyeCount,
}: ObservatoryCommandConsoleProps) {
  return (
    <section id="console-section" className="w-full space-y-6 pt-6 font-sans">
      {/* Editorial Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
            Section 02 // Observatory Console
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase font-sans">
            Ground Station Astrometry &amp; Propagation Controls
          </h2>
          <p className="text-xs text-zinc-400 font-sans mt-1">
            Topocentric geodetic coordinate calibration, temporal simulation, and solar illumination analysis.
          </p>
        </div>

        {/* Minimal GPS Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-sans">
          <div className="px-3 py-1 bg-zinc-950 border border-zinc-800 flex items-center gap-2 text-zinc-300">
            <Radio className={`h-3 w-3 ${gpsStatus === "locating" ? "animate-spin text-amber-400" : "text-[#00e5ff]"}`} />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              GPS: {gpsStatus === "phone-paired" ? "COMPANION LINK" : gpsStatus === "locating" ? "ACQUIRING..." : "CALIBRATED"}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* DUAL EDITORIAL PANEL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Panel A: Ground Station Geodetic Position */}
        <div className="border border-zinc-850 bg-zinc-950 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Header & Active Site */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-900 pb-3">
              <div>
                <span className="border border-white/20 inline-block px-2 py-0.5 text-[9px] uppercase tracking-widest text-zinc-300 font-semibold mb-1">
                  Active Ground Station
                </span>
                <div className="text-base font-bold text-white tracking-wide">{observer.name}</div>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">
                  {observer.lat.toFixed(4)}°N, {observer.lon.toFixed(4)}°E &bull; {observer.altMeters}m ASL
                </div>
              </div>

              <span className="text-[10px] font-mono text-zinc-400 border border-zinc-800 px-2 py-1">
                &plusmn;{observer.accuracyRadiusMeters || 25}m ({observer.source || "gps"})
              </span>
            </div>

            {/* Controls: Preset City & Auto GPS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
                  Preset Observatories
                </label>
                <select
                  value={presetCities.some((c) => c.name === observer.name) ? observer.name : "custom"}
                  onChange={(e) => {
                    const found = presetCities.find((c) => c.name === e.target.value);
                    if (found) onSelectPresetCity(found);
                  }}
                  className="w-full h-8 border border-zinc-800 bg-black px-2.5 text-xs text-zinc-200 outline-none focus:border-zinc-500 font-sans cursor-pointer"
                >
                  <option value="custom">Select Observatory Preset…</option>
                  {presetCities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
                  Sensor Sync
                </label>
                <button
                  onClick={onDetectGps}
                  className="w-full h-8 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Navigation className={`h-3 w-3 ${gpsStatus === "locating" ? "animate-spin text-[#00e5ff]" : "text-zinc-400"}`} />
                  <span>Auto GPS</span>
                </button>
              </div>
            </div>

            {/* Manual Lat / Lon / Alt Coordinates */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 block font-semibold">
                Manual Coordinates
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <div className="flex-1 flex items-center gap-1 bg-black border border-zinc-800 px-3 py-1 font-mono text-xs">
                  <span className="text-[9px] text-zinc-500 font-bold">LAT</span>
                  <input
                    type="number"
                    value={customLat}
                    onChange={(e) => onCustomLatChange(e.target.value)}
                    className="w-full bg-transparent text-center text-white text-xs outline-none focus:text-[#00e5ff]"
                    placeholder="Lat"
                  />
                  <span className="text-zinc-800">|</span>
                  <span className="text-[9px] text-zinc-500 font-bold">LON</span>
                  <input
                    type="number"
                    value={customLon}
                    onChange={(e) => onCustomLonChange(e.target.value)}
                    className="w-full bg-transparent text-center text-white text-xs outline-none focus:text-[#00e5ff]"
                    placeholder="Lon"
                  />
                  <span className="text-zinc-800">|</span>
                  <span className="text-[9px] text-zinc-500 font-bold">ALT</span>
                  <input
                    type="number"
                    value={customAlt}
                    onChange={(e) => onCustomAltChange(e.target.value)}
                    className="w-16 bg-transparent text-center text-white text-xs outline-none focus:text-[#00e5ff]"
                    placeholder="Alt"
                  />
                </div>

                <button
                  onClick={onApplyCustomCoords}
                  className="h-8 px-4 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold uppercase tracking-wider transition cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Observer Twilight Status */}
          <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs font-sans">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-[11px] uppercase tracking-wider">Solar Horizon:</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1.5 border ${
                  twilight.isDarkEnough
                    ? "bg-zinc-900 text-emerald-400 border-emerald-500/40"
                    : "bg-zinc-900 text-amber-400 border-amber-500/40"
                }`}
              >
                {twilight.isDarkEnough ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                <span>{twilight.phase} ({twilight.sunAltitudeDeg.toFixed(1)}°)</span>
              </span>
            </div>

            <div className="text-zinc-300 font-mono text-[11px]">
              <span className="text-white font-bold">{aboveHorizonCount}</span> SATELLITES OVERHEAD
            </div>
          </div>
        </div>

        {/* Panel B: Temporal Simulation & Propagation Engine */}
        <div className="border border-zinc-850 bg-zinc-950 p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Clock Header & Play Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
              <div>
                <span className="border border-white/20 inline-block px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#00e5ff] font-semibold mb-1">
                  Temporal Propagation Engine
                </span>
                <div className="text-base font-mono font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#00e5ff]" />
                  <span>{formattedClock}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePlay}
                  className="h-8 px-3 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isPaused ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3 text-amber-400" />}
                  <span>{isPaused ? "Resume" : "Pause"}</span>
                </button>

                <button
                  onClick={onLiveSync}
                  className="h-8 px-3 border border-zinc-800 bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                  title="Reset clock to live real-time"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Live Sync</span>
                </button>
              </div>
            </div>

            {/* Speed Multipliers & Target Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
                  Simulation Speed
                </label>
                <div className="flex items-center border border-zinc-800 bg-black p-0.5 font-mono text-xs">
                  {[1, 5, 10, 30, 60].map((s) => (
                    <button
                      key={s}
                      onClick={() => onSetSpeed(s)}
                      className={`flex-1 py-1 text-xs font-semibold transition cursor-pointer ${
                        speed === s
                          ? "bg-white text-black font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
                  Constellation Target Group
                </label>
                <select
                  value={skyCatalogGroup}
                  onChange={(e) => onSetSkyCatalogGroup(e.target.value as any)}
                  className="w-full h-8 border border-zinc-800 bg-black px-2.5 text-xs text-zinc-200 outline-none focus:border-zinc-500 font-sans cursor-pointer"
                >
                  <option value="active">All Active Constellations</option>
                  <option value="visual">Bright &amp; Visual (ISS, Hubble)</option>
                  <option value="weather">Weather &amp; Earth Observation</option>
                  <option value="gnss">GNSS (GPS, Galileo, BeiDou)</option>
                  <option value="stations">Space Stations (ISS &amp; Tiangong)</option>
                </select>
              </div>
            </div>

            {/* Timezone Selector */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
                Timezone Format
              </label>
              <select
                value={selectedTz}
                onChange={(e) => onSelectTz(e.target.value)}
                className="w-full h-8 border border-zinc-800 bg-black px-2.5 text-xs text-zinc-200 outline-none focus:border-zinc-500 font-sans cursor-pointer"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Temporal Scrubber Slider (±6 Hours) */}
          <div className="pt-3 border-t border-zinc-900 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>SCRUBBER (-6H)</span>
              <span className="text-[#00e5ff] font-semibold">DELTA: {Math.round((timeMs - sliderBaseTime) / 60000)} MIN</span>
              <span>(+6H)</span>
            </div>
            <input
              type="range"
              min={sliderBaseTime - 6 * 3600 * 1000}
              max={sliderBaseTime + 6 * 3600 * 1000}
              step={1000}
              value={timeMs}
              onChange={(e) => onTimeScrubberChange(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-none appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      </div>

      {/* SCIENTIFIC VISIBILITY PROTOCOL FOOTER */}
      <div className="border border-zinc-850 bg-zinc-950 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Crosshair className="h-4 w-4 text-[#00e5ff] shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
            <strong className="text-white uppercase tracking-wider text-[11px] block">Topocentric 3-Condition Visibility Protocol:</strong>
            Spacecraft classified as naked-eye visible strictly when: (1) Elevation &gt; 10° above horizon, (2) Spacecraft illuminated outside Earth umbra, and (3) Observer site in astronomical twilight or darkness (Sun altitude &lt; -6°).
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-mono text-xs border-t sm:border-t-0 sm:border-l border-zinc-800 pt-3 sm:pt-0 sm:pl-4">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase block">Overhead</span>
            <span className="text-lg font-bold text-white">{aboveHorizonCount}</span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-400 uppercase block">Naked Eye</span>
            <span className="text-lg font-bold text-emerald-400">{nakedEyeCount}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ObservatoryCommandConsole;
