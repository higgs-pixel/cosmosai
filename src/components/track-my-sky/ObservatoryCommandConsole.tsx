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
  Compass,
  Activity,
  Crosshair,
  Gauge,
  Cpu,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { SpaceTechCard } from "@/components/ui/SpaceTechCard";
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
    <section id="console-section" className="w-full space-y-5 pt-4 font-sans">
      {/* Space-Tech Avionics Bay Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
            <Cpu className="h-4 w-4" />
            <span>01 // OBSERVATORY COMMAND AVIONICS BAY</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            Ground Station &amp; Orbital Simulation Console
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Dual-bay topocentric astrometry, high-frequency SGP4 temporal propagation, and geodetic coordinate calibration.
          </p>
        </div>

        {/* Global Hardware GPS Lock Status Indicator */}
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.1)]">
            <Radio className={`h-3.5 w-3.5 ${gpsStatus === "locating" ? "animate-spin text-amber-400" : "text-cyan-400"}`} />
            <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              GPS: {gpsStatus === "phone-paired" ? "COMPANION LINK" : gpsStatus === "locating" ? "ACQUIRING..." : "CALIBRATED"}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          </div>
        </div>
      </div>

      {/* DUAL AVIONICS BAY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
        {/* BAY ALPHA: Ground Station Navigation & Sensors */}
        <SpaceTechCard
          moduleTag="BAY-ALPHA // GROUND STATION ASTROMETRY"
          statusText={gpsStatus === "locating" ? "LOCKING COORDS..." : "SENSORS ONLINE"}
          statusColor={gpsStatus === "locating" ? "amber" : "cyan"}
          scanLine={gpsStatus === "locating"}
          tilt={false}
          className="p-5 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            {/* Active Observer Telemetry Header */}
            <div className="flex items-start justify-between gap-3 bg-slate-950/70 border border-white/[0.08] p-3 rounded-xl">
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">ACTIVE OBSERVATORY SITE</div>
                <div className="text-sm font-bold text-white tracking-wide">{observer.name}</div>
                <div className="text-xs font-mono text-cyan-300">
                  {observer.lat.toFixed(4)}°N, {observer.lon.toFixed(4)}°E &bull; {observer.altMeters}m ASL
                </div>
              </div>

              <GlassBadge tone={gpsStatus === "phone-paired" ? "purple" : "emerald"} dot>
                &plusmn;{observer.accuracyRadiusMeters || 25}m ({observer.source || "gps"})
              </GlassBadge>
            </div>

            {/* Controls: Preset City & Auto GPS */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Preset Selector */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Preset Observatories</label>
                <select
                  value={presetCities.some((c) => c.name === observer.name) ? observer.name : "custom"}
                  onChange={(e) => {
                    const found = presetCities.find((c) => c.name === e.target.value);
                    if (found) onSelectPresetCity(found);
                  }}
                  className="w-full h-9 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="custom">Preset Observatories…</option>
                  {presetCities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto GPS Trigger */}
              <div className="pt-5">
                <button
                  onClick={onDetectGps}
                  className="h-9 px-3.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                >
                  <Navigation className={`h-3.5 w-3.5 ${gpsStatus === "locating" ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                  <span>AUTO GPS</span>
                </button>
              </div>
            </div>

            {/* Manual Lat / Lon / Alt Input Bar */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Manual Geodetic Coordinates</label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <div className="flex-1 flex items-center gap-1 bg-slate-950 border border-white/10 px-2.5 py-1.5 rounded-xl font-mono text-xs">
                  <span className="text-[9px] text-cyan-400 font-bold">LAT</span>
                  <input
                    type="number"
                    value={customLat}
                    onChange={(e) => onCustomLatChange(e.target.value)}
                    className="w-full bg-transparent text-center text-white text-xs outline-none focus:text-cyan-300"
                    placeholder="Lat"
                  />
                  <span className="text-white/20">|</span>
                  <span className="text-[9px] text-cyan-400 font-bold">LON</span>
                  <input
                    type="number"
                    value={customLon}
                    onChange={(e) => onCustomLonChange(e.target.value)}
                    className="w-full bg-transparent text-center text-white text-xs outline-none focus:text-cyan-300"
                    placeholder="Lon"
                  />
                  <span className="text-white/20">|</span>
                  <span className="text-[9px] text-cyan-400 font-bold">ALT</span>
                  <input
                    type="number"
                    value={customAlt}
                    onChange={(e) => onCustomAltChange(e.target.value)}
                    className="w-16 bg-transparent text-center text-white text-xs outline-none focus:text-cyan-300"
                    placeholder="Alt"
                  />
                </div>

                <button
                  onClick={onApplyCustomCoords}
                  className="h-9 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-black transition cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.3)] shrink-0"
                >
                  SET COORDS
                </button>
              </div>
            </div>
          </div>

          {/* Observer Solar & Sky State Micro-Readout */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">SOLAR CONDITION:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1.5 ${
                  twilight.isDarkEnough
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {twilight.isDarkEnough ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                <span>{twilight.phase} ({twilight.sunAltitudeDeg.toFixed(1)}°)</span>
              </span>
            </div>

            <div className="text-cyan-400 font-bold text-[11px]">
              {aboveHorizonCount} OVERHEAD
            </div>
          </div>
        </SpaceTechCard>

        {/* BAY BETA: Temporal Simulation & Propagation Controller */}
        <SpaceTechCard
          moduleTag="BAY-BETA // TEMPORAL PROPAGATION ENGINE"
          statusText={isPaused ? "CLOCK PAUSED" : `${speed}X SIMULATION`}
          statusColor={isPaused ? "amber" : "emerald"}
          tilt={false}
          className="p-5 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            {/* Live Clock & Control Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-white/[0.08] p-3 rounded-xl">
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">SIMULATION TIME</div>
                <div className="text-sm font-mono font-black text-emerald-400 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>{formattedClock}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onTogglePlay}
                  className={`h-8 px-3 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isPaused
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {isPaused ? <Play className="h-3.5 w-3.5 text-emerald-400" /> : <Pause className="h-3.5 w-3.5 text-amber-400" />}
                  <span>{isPaused ? "RESUME" : "PAUSE"}</span>
                </button>

                <button
                  onClick={onLiveSync}
                  className="h-8 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-cyan-400" />
                  <span>LIVE SYNC</span>
                </button>
              </div>
            </div>

            {/* Speed Multipliers & Constellation Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Segmented Speed Bar */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Propagation Speed</label>
                <div className="flex items-center gap-1 bg-slate-950 border border-white/10 p-1 rounded-xl font-mono text-xs">
                  {[1, 5, 10, 30, 60].map((s) => (
                    <button
                      key={s}
                      onClick={() => onSetSpeed(s)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        speed === s
                          ? "bg-cyan-500 text-black shadow-md font-black"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Constellation Group */}
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Constellation Target Group</label>
                <select
                  value={skyCatalogGroup}
                  onChange={(e) => onSetSkyCatalogGroup(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-white/10 bg-slate-950 px-2.5 text-xs font-mono font-bold text-cyan-300 outline-none cursor-pointer"
                >
                  <option value="active" className="bg-slate-950 text-white">All Active Constellations</option>
                  <option value="visual" className="bg-slate-950 text-white">Bright &amp; Visual (ISS, Hubble)</option>
                  <option value="weather" className="bg-slate-950 text-white">Weather &amp; Earth Observation</option>
                  <option value="gnss" className="bg-slate-950 text-white">GNSS (GPS, Galileo, BeiDou)</option>
                  <option value="stations" className="bg-slate-950 text-white">Space Stations (ISS &amp; Tiangong)</option>
                </select>
              </div>
            </div>

            {/* Timezone Selector */}
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Observatory Timezone</label>
              <select
                value={selectedTz}
                onChange={(e) => onSelectTz(e.target.value)}
                className="w-full h-9 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-mono text-cyan-300 outline-none cursor-pointer"
              >
                {timezoneOptions.map((tz) => (
                  <option key={tz.id} value={tz.id} className="bg-slate-950 text-white">
                    {tz.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Temporal Scrubber Slider (±6 Hours) */}
          <div className="pt-3 border-t border-white/[0.08] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>TEMPORAL SCRUBBER (-6H)</span>
              <span className="text-cyan-400 font-bold">DELTA: {Math.round((timeMs - sliderBaseTime) / 60000)} MIN</span>
              <span>(+6H)</span>
            </div>
            <input
              type="range"
              min={sliderBaseTime - 6 * 3600 * 1000}
              max={sliderBaseTime + 6 * 3600 * 1000}
              step={1000}
              value={timeMs}
              onChange={(e) => onTimeScrubberChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </SpaceTechCard>
      </div>

      {/* FLIGHT DIRECTOR SCIENTIFIC ADVISORY HUD */}
      <SpaceTechCard
        moduleTag="DIRECTOR // SCIENTIFIC VISIBILITY PROTOCOL"
        statusText="ASTRONOMICAL POLICY"
        statusColor="cyan"
        tilt={false}
        className="p-4 sm:p-5"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              <Crosshair className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Topocentric 3-Condition Concurrent Naked-Eye Policy
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                A satellite is classified as <span className="text-cyan-300 font-bold font-mono">NAKED-EYE VISIBLE</span> strictly when 3 conditions concur:
                (1) Topocentric elevation &gt; 10° above horizon, (2) Spacecraft illuminated by Sun outside Earth&apos;s umbra, and (3) Observer site in astronomical twilight or night (Sun Alt &lt; -6°).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-center self-end lg:self-center">
            <div className="bg-slate-950 border border-white/10 px-4 py-2 rounded-xl">
              <div className="text-[9px] text-slate-400 uppercase">Above Horizon</div>
              <div className="text-lg font-black text-white">{aboveHorizonCount}</div>
            </div>
            <div className="bg-emerald-500/15 border border-emerald-400/30 px-4 py-2 rounded-xl">
              <div className="text-[9px] text-emerald-400 uppercase font-bold">Naked-Eye</div>
              <div className="text-lg font-black text-emerald-300">{nakedEyeCount}</div>
            </div>
          </div>
        </div>
      </SpaceTechCard>
    </section>
  );
}

export default ObservatoryCommandConsole;
