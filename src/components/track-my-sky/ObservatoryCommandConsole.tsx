"use client";

import { useState, useMemo } from "react";
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
  Globe,
  Search,
  X,
  Check,
  MapPin,
  Sparkles,
} from "lucide-react";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";
import { ObserverTwilightInfo } from "@/lib/orbit/visibility";
import { WORLD_COUNTRIES, WorldCountry } from "@/lib/orbit/countries";

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
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("All");

  const filteredCountries = useMemo(() => {
    return WORLD_COUNTRIES.filter((c) => {
      if (selectedRegion !== "All" && c.region !== selectedRegion) return false;
      if (!countrySearch.trim()) return true;
      const q = countrySearch.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
      );
    });
  }, [countrySearch, selectedRegion]);

  const handleCountrySelect = (c: WorldCountry) => {
    onSelectPresetCity({
      name: `${c.flag} ${c.name} (${c.capital})`,
      lat: c.lat,
      lon: c.lon,
      altMeters: c.altMeters,
    });
    setIsCountryModalOpen(false);
  };

  return (
    <section id="console-section" className="w-full space-y-6 font-sans">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
            Section 03 // Observatory Workbench
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase font-sans">
            Ground Station Astrometry &amp; Time Propagation
          </h2>
          <p className="text-xs text-zinc-400 font-sans mt-1">
            Calibrate ground station coordinates across 195+ countries or via live GPS to observe topocentric satellites and upcoming passes.
          </p>
        </div>

        {/* Minimal GPS Status Readout */}
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

      {/* Unified Horizontal Astrometry Workbench */}
      <div className="border border-zinc-850 bg-black divide-y divide-zinc-900">
        {/* ROW 1: Geodetic Observer Calibration */}
        <div className="p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* Active Geodetic Location Info */}
          <div className="space-y-1 min-w-[280px]">
            <span className="border border-white/20 inline-block px-2 py-0.5 text-[9px] uppercase tracking-widest text-zinc-300 font-semibold">
              Active Ground Station
            </span>
            <div className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#00e5ff] shrink-0" />
              <span className="truncate">{observer.name}</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              {observer.lat.toFixed(4)}°N, {observer.lon.toFixed(4)}°E &bull; {observer.altMeters}m ASL &bull; &plusmn;{observer.accuracyRadiusMeters || 25}m
            </div>
          </div>

          {/* Quick Dropdown + Explore All Countries Modal Trigger + Auto GPS */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1 max-w-xl">
            <div className="flex-1 min-w-[180px]">
              <label className="text-[9px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
                Quick Ground Station
              </label>
              <select
                value={observer.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const city = presetCities.find((c) => c.name === val);
                  if (city) {
                    onSelectPresetCity(city);
                    return;
                  }
                  const country = WORLD_COUNTRIES.find((c) => `${c.flag} ${c.name} (${c.capital})` === val || c.name === val);
                  if (country) {
                    handleCountrySelect(country);
                  }
                }}
                className="w-full h-8 border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-zinc-200 outline-none focus:border-zinc-500 font-sans cursor-pointer"
              >
                <option value={observer.name}>{observer.name}</option>
                <optgroup label="Preset Space Observatories">
                  {presetCities.map((c) => (
                    <option key={`preset-${c.name}`} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Americas">
                  {WORLD_COUNTRIES.filter((c) => c.region === "Americas").map((c) => (
                    <option key={`am-${c.code}`} value={`${c.flag} ${c.name} (${c.capital})`}>
                      {c.flag} {c.name} — {c.capital}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Europe">
                  {WORLD_COUNTRIES.filter((c) => c.region === "Europe").map((c) => (
                    <option key={`eu-${c.code}`} value={`${c.flag} ${c.name} (${c.capital})`}>
                      {c.flag} {c.name} — {c.capital}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Asia">
                  {WORLD_COUNTRIES.filter((c) => c.region === "Asia").map((c) => (
                    <option key={`as-${c.code}`} value={`${c.flag} ${c.name} (${c.capital})`}>
                      {c.flag} {c.name} — {c.capital}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Africa">
                  {WORLD_COUNTRIES.filter((c) => c.region === "Africa").map((c) => (
                    <option key={`af-${c.code}`} value={`${c.flag} ${c.name} (${c.capital})`}>
                      {c.flag} {c.name} — {c.capital}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Oceania">
                  {WORLD_COUNTRIES.filter((c) => c.region === "Oceania").map((c) => (
                    <option key={`oc-${c.code}`} value={`${c.flag} ${c.name} (${c.capital})`}>
                      {c.flag} {c.name} — {c.capital}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={() => setIsCountryModalOpen(true)}
                className="h-8 px-3 border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-900/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                title="Search all 195+ countries in the world"
              >
                <Globe className="h-3.5 w-3.5 text-[#00e5ff]" />
                <span className="hidden sm:inline">All Countries</span>
              </button>

              <button
                onClick={onDetectGps}
                className="h-8 px-3 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                title="Detect precise observer location via GPS sensor"
              >
                <Navigation className={`h-3 w-3 ${gpsStatus === "locating" ? "animate-spin text-[#00e5ff]" : "text-zinc-400"}`} />
                <span>Auto GPS</span>
              </button>
            </div>
          </div>

          {/* Manual Lat / Lon / Alt Bar */}
          <div className="flex-1 max-w-md">
            <label className="text-[9px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
              Manual Geodetic Coordinates
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2.5 py-1 font-mono text-xs">
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
                className="h-8 px-3 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold uppercase tracking-wider transition cursor-pointer shrink-0"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Global Countries Explorer Modal */}
        {isCountryModalOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setIsCountryModalOpen(false)}
          >
            <div
              className="relative w-full max-w-4xl max-h-[85vh] bg-[#050814] border border-cyan-500/40 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_60px_rgba(0,229,255,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-[#00e5ff]" />
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider font-sans">
                      Select Ground Station Observatory
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans">
                      Choose any country in the world to calculate overhead satellites and upcoming passes over its horizon.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCountryModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Controls: Search & Region Tabs */}
              <div className="p-4 border-b border-zinc-850 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country or capital…"
                    autoFocus
                    className="w-full h-9 pl-9 pr-3 bg-zinc-950 border border-zinc-800 text-xs font-sans text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 rounded-lg transition"
                  />
                  {countrySearch && (
                    <button
                      onClick={() => setCountrySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Region Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
                  {["All", "Americas", "Europe", "Asia", "Africa", "Oceania"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedRegion(r)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                        selectedRegion === r
                          ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country Cards Grid */}
              <div className="p-5 overflow-y-auto max-h-[55vh] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 scrollbar-thin scrollbar-thumb-zinc-800">
                {filteredCountries.map((c) => {
                  const isActive =
                    (observer.name && observer.name.includes(c.name)) ||
                    (Math.abs(observer.lat - c.lat) < 0.05 && Math.abs(observer.lon - c.lon) < 0.05);

                  return (
                    <div
                      key={c.code}
                      onClick={() => handleCountrySelect(c)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                        isActive
                          ? "border-[#00e5ff] bg-cyan-950/40 shadow-[0_0_20px_rgba(0,229,255,0.2)] text-white"
                          : "border-zinc-800/80 bg-zinc-950/80 hover:border-cyan-500/40 hover:bg-zinc-900/60 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{c.flag}</span>
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {isActive && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500 text-black font-black uppercase">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 font-sans">{c.capital}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span>{c.lat.toFixed(2)}°, {c.lon.toFixed(2)}°</span>
                        <span className="text-cyan-400 font-semibold">{c.region}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredCountries.length === 0 && (
                  <div className="col-span-full py-12 text-center text-zinc-500 text-xs uppercase tracking-widest font-sans">
                    No countries matching &ldquo;{countrySearch}&rdquo; in {selectedRegion}.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 font-mono px-5">
                <span>Total Global Observatories: {WORLD_COUNTRIES.length} Countries</span>
                <span>Select any country to recalibrate live satellite field</span>
              </div>
            </div>
          </div>
        )}

        {/* ROW 2: Temporal Simulation & Propagation Controls */}
        <div className="p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* Formatted Clock & Playback Toggle */}
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-zinc-400 block mb-0.5 font-semibold">
                Simulation Ephemeris Time
              </span>
              <div className="text-base font-mono font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#00e5ff]" />
                <span>{formattedClock}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
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
                title="Reset simulation to real-time"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Live Sync</span>
              </button>
            </div>
          </div>

          {/* Speed Multipliers */}
          <div>
            <label className="text-[9px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
              Simulation Rate
            </label>
            <div className="flex items-center border border-zinc-800 bg-zinc-950 p-0.5 font-mono text-xs">
              {[1, 5, 10, 30, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => onSetSpeed(s)}
                  className={`px-3 py-1 text-xs font-semibold transition cursor-pointer ${
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

          {/* Constellation Filter Dropdown */}
          <div className="min-w-[200px]">
            <label className="text-[9px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
              Target Catalog Group
            </label>
            <select
              value={skyCatalogGroup}
              onChange={(e) => onSetSkyCatalogGroup(e.target.value as any)}
              className="w-full h-8 border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500 font-sans cursor-pointer"
            >
              <option value="active">All Active Constellations</option>
              <option value="visual">Bright &amp; Visual (ISS, Hubble)</option>
              <option value="weather">Weather &amp; Climate</option>
              <option value="gnss">GNSS (GPS, Galileo, BeiDou)</option>
              <option value="stations">Space Stations (ISS &amp; Tiangong)</option>
            </select>
          </div>

          {/* Timezone Selector */}
          <div className="min-w-[160px]">
            <label className="text-[9px] uppercase tracking-widest text-zinc-400 block mb-1 font-semibold">
              Timezone
            </label>
            <select
              value={selectedTz}
              onChange={(e) => onSelectTz(e.target.value)}
              className="w-full h-8 border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500 font-sans cursor-pointer"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz.id} value={tz.id}>
                  {tz.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 3: Temporal Scrubber Slider & Twilight Lighting Readout */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>TEMPORAL SCRUBBER (-6H)</span>
              <span className="text-[#00e5ff] font-semibold">
                TIME OFFSET: {Math.round((timeMs - sliderBaseTime) / 60000)} MIN
              </span>
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

          <div className="flex items-center gap-4 shrink-0 font-sans text-xs border-t sm:border-t-0 sm:border-l border-zinc-800 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-[11px] uppercase tracking-wider">Solar Illumination:</span>
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
              <span className="text-white font-bold">{aboveHorizonCount}</span> OVERHEAD &bull;{" "}
              <span className="text-emerald-400 font-bold">{nakedEyeCount}</span> NAKED EYE
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ObservatoryCommandConsole;
