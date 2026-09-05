"use client";

import {
  MapPin,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Radio,
  Sliders,
  Sun,
  Moon,
  Info,
  Layers,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassInput } from "@/components/glass/GlassInput";
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
    <section id="console-section" className="w-full space-y-4 pt-4">
      {/* Main Glass Console Panel */}
      <GlassPanel level={2} className="p-4 sm:p-6 space-y-5 shadow-2xl">
        {/* ROW 1: Ground Station Positioning Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              <MapPin className="h-3.5 w-3.5" />
              <span>01 // GROUND STATION OBSERVATORY</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
              <span className="font-bold text-white text-sm">{observer.name}</span>
              <span className="text-white/20">•</span>
              <span className="font-mono text-cyan-300">
                {observer.lat.toFixed(4)}°N, {observer.lon.toFixed(4)}°E
              </span>
              <span className="text-white/20">•</span>
              <span className="font-mono text-slate-400">{observer.altMeters}m ASL</span>
              <GlassBadge
                tone={gpsStatus === "phone-paired" ? "purple" : "emerald"}
                dot
              >
                ± {observer.accuracyRadiusMeters || 25}m ({observer.source || "gps"})
              </GlassBadge>
            </div>
          </div>

          {/* Location Configuration Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-white/[0.02] border border-white/[0.08] p-1.5 rounded-2xl backdrop-blur-xl">
            {/* Preset City Dropdown */}
            <select
              value={presetCities.some((c) => c.name === observer.name) ? observer.name : "custom"}
              onChange={(e) => {
                const found = presetCities.find((c) => c.name === e.target.value);
                if (found) onSelectPresetCity(found);
              }}
              className="h-9 rounded-xl border border-white/10 bg-slate-950/80 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="custom">Preset Observatories…</option>
              {presetCities.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Auto GPS Detection Button */}
            <GlassButton
              size="sm"
              variant="default"
              onClick={onDetectGps}
              title="Detect my exact geolocation"
            >
              <Navigation className={`h-3.5 w-3.5 text-cyan-400 ${gpsStatus === "locating" ? "animate-spin" : ""}`} />
              <span className="font-mono text-xs">Auto GPS</span>
            </GlassButton>

            <div className="hidden sm:block w-px h-5 bg-white/10 mx-1" />

            {/* Manual Lat / Lon / Alt Inputs */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-white/10 px-2 py-1 rounded-xl font-mono text-xs">
              <span className="text-[9px] text-slate-500 font-bold">LAT</span>
              <input
                type="number"
                value={customLat}
                onChange={(e) => onCustomLatChange(e.target.value)}
                className="w-16 h-6 bg-transparent text-center text-white text-xs outline-none focus:text-cyan-400"
                placeholder="Lat"
              />
              <span className="text-white/20">/</span>
              <span className="text-[9px] text-slate-500 font-bold">LON</span>
              <input
                type="number"
                value={customLon}
                onChange={(e) => onCustomLonChange(e.target.value)}
                className="w-16 h-6 bg-transparent text-center text-white text-xs outline-none focus:text-cyan-400"
                placeholder="Lon"
              />
              <span className="text-white/20">/</span>
              <span className="text-[9px] text-slate-500 font-bold">ALT(m)</span>
              <input
                type="number"
                value={customAlt}
                onChange={(e) => onCustomAltChange(e.target.value)}
                className="w-12 h-6 bg-transparent text-center text-white text-xs outline-none focus:text-cyan-400"
                placeholder="Alt"
              />
            </div>

            <GlassButton size="sm" variant="primary" onClick={onApplyCustomCoords}>
              Set
            </GlassButton>
          </div>
        </div>

        {/* ROW 2: Live Time Simulation Engine & Multipliers */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Play / Pause Toggle */}
            <GlassButton
              size="sm"
              variant={isPaused ? "success" : "default"}
              onClick={onTogglePlay}
            >
              {isPaused ? <Play className="h-3.5 w-3.5 text-emerald-400" /> : <Pause className="h-3.5 w-3.5 text-amber-400" />}
              <span className="font-mono text-xs">{isPaused ? "Resume" : "Pause"}</span>
            </GlassButton>

            {/* Live Real-Time Sync */}
            <GlassButton size="sm" variant="default" onClick={onLiveSync} title="Reset to current moment">
              <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-mono text-xs">Live Sync</span>
            </GlassButton>

            {/* Speed Multipliers */}
            <div className="flex items-center gap-0.5 bg-slate-950/80 border border-white/10 p-0.5 rounded-xl font-mono text-xs">
              {[1, 5, 10, 30, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => onSetSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    speed === s
                      ? "bg-cyan-500 text-slate-950 shadow-md font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Constellation Group Selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-white/10 px-2.5 py-1 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">GROUP:</span>
              <select
                value={skyCatalogGroup}
                onChange={(e) => onSetSkyCatalogGroup(e.target.value as any)}
                className="bg-transparent text-xs font-mono font-bold text-cyan-300 outline-none cursor-pointer"
              >
                <option value="active" className="bg-slate-950 text-white">All Active Constellations</option>
                <option value="visual" className="bg-slate-950 text-white">Bright &amp; Visual (ISS, Hubble)</option>
                <option value="weather" className="bg-slate-950 text-white">Weather &amp; Earth Observation</option>
                <option value="gnss" className="bg-slate-950 text-white">GNSS (GPS, Galileo, BeiDou)</option>
                <option value="stations" className="bg-slate-950 text-white">Space Stations (ISS &amp; Tiangong)</option>
              </select>
            </div>

            {/* Timezone Selector */}
            <select
              value={selectedTz}
              onChange={(e) => onSelectTz(e.target.value)}
              className="h-8 rounded-xl border border-white/10 bg-slate-950/80 px-2.5 text-xs font-mono text-cyan-300 outline-none cursor-pointer max-w-[170px]"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz.id} value={tz.id} className="bg-slate-950 text-white">
                  {tz.name}
                </option>
              ))}
            </select>
          </div>

          {/* Right Status Counters */}
          <div className="flex items-center gap-2.5 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 flex items-center gap-1.5">
              <span>Catalog:</span>
              <span className="text-cyan-400 font-bold">{totalSats} Sats</span>
              {loadingSats && <span className="text-amber-400 animate-pulse text-[10px] ml-1">(fetching…)</span>}
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>{formattedClock}</span>
            </div>
          </div>
        </div>

        {/* ROW 3: Interactive Timeline Scrubber Slider (±6 Hours) */}
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase shrink-0">-6 Hours</span>
          <input
            type="range"
            min={sliderBaseTime - 6 * 3600 * 1000}
            max={sliderBaseTime + 6 * 3600 * 1000}
            step={1000}
            value={timeMs}
            onChange={(e) => onTimeScrubberChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase shrink-0">+6 Hours</span>
        </div>

        {/* ROW 4: Observer Twilight & Solar State Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sky Conditions:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-xs flex items-center gap-1.5 ${
                twilight.isDarkEnough
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              {twilight.isDarkEnough ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              <span>
                {twilight.phase} (Sun Alt: {twilight.sunAltitudeDeg.toFixed(1)}°)
              </span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">Above Horizon: </span>
              <strong className="text-white">{aboveHorizonCount}</strong>
            </div>
            <div>
              <span className="text-slate-400">Naked-Eye Visible: </span>
              <strong className="text-emerald-400">{nakedEyeCount}</strong>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Scientific 3-Condition Advisory Banner */}
      <GlassPanel
        level={1}
        className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-cyan-500/20 text-xs shadow-xl"
      >
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold text-white uppercase tracking-wider text-xs font-mono">
              Scientific Naked-Eye Visibility Policy (3-Condition Concurrent Test)
            </div>
            <p className="text-slate-300 mt-0.5 leading-relaxed">
              A satellite is classified as <span className="text-cyan-300 font-bold">Naked-Eye Visible</span> ONLY when 3 physical conditions hold simultaneously:
              (1) Topocentric Elevation &gt; 10° above horizon, (2) Spacecraft illuminated by the Sun (outside Earth&apos;s umbral shadow), and (3) Observer site located in astronomical/nautical twilight or night (Sun Alt &lt; -6°). Visual magnitudes are derived from photometric RCS models.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-center">
          <div className="bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-xl">
            <div className="text-[9px] text-slate-400 uppercase">Above Horizon</div>
            <div className="text-base font-black text-white">{aboveHorizonCount}</div>
          </div>
          <div className="bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-1.5 rounded-xl">
            <div className="text-[9px] text-emerald-400 uppercase font-bold">Naked Eye</div>
            <div className="text-base font-black text-emerald-300">{nakedEyeCount}</div>
          </div>
        </div>
      </GlassPanel>
    </section>
  );
}
