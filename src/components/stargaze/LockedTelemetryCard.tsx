"use client";

import { Radio, X, Target, Eye, Sun, Moon, Compass, Gauge } from "lucide-react";
import { ComputedSatelliteSkyState } from "@/lib/astronomy/satellite-sky-math";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

function getCardinalText(azDeg: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(azDeg / 22.5) % 16;
  return directions[index];
}

interface LockedTelemetryCardProps {
  sat: ComputedSatelliteSkyState | null;
  observer: ObserverCoords;
  isAimLocked: boolean;
  onToggleAimLock: () => void;
  onClose?: () => void;
  className?: string;
}

export function LockedTelemetryCard({
  sat,
  observer,
  isAimLocked,
  onToggleAimLock,
  onClose,
  className = "",
}: LockedTelemetryCardProps) {
  if (!sat) return null;

  return (
    <div
      className={`select-none pointer-events-auto bg-black/95 border border-zinc-800 p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between font-sans ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-white font-mono">
            LIVE TELEMETRY DOSSIER
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 border border-emerald-500/40 text-emerald-300 bg-emerald-950/30">
            NORAD #{sat.id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Identity & Mission */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div>
          <h3 className="text-base font-black text-white tracking-tight leading-tight">
            {sat.name}
          </h3>
          <p className="text-[10px] font-mono text-cyan-400 tracking-wider">
            {sat.category}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[9px] font-mono shrink-0">
          <span
            className={`px-1.5 py-0.5 border ${
              sat.isAboveHorizon
                ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                : "border-zinc-800 text-zinc-500"
            }`}
          >
            {sat.isAboveHorizon ? "OVERHEAD" : "BELOW HORIZON"}
          </span>

          <span
            className={`px-1.5 py-0.5 border flex items-center gap-1 ${
              sat.isSunlit
                ? "border-amber-500/40 text-amber-300 bg-amber-950/20"
                : "border-purple-500/40 text-purple-300 bg-purple-950/20"
            }`}
          >
            {sat.isSunlit ? (
              <>
                <Sun className="h-2.5 w-2.5 text-amber-400" />
                SUNLIT
              </>
            ) : (
              <>
                <Moon className="h-2.5 w-2.5 text-purple-400" />
                ECLIPSED
              </>
            )}
          </span>
        </div>
      </div>

      {/* Telemetry Data Grid */}
      <div className="grid grid-cols-3 gap-2 bg-zinc-950/80 p-2.5 border border-zinc-900 mb-3 text-xs font-mono">
        <div>
          <span className="text-[9px] text-zinc-500 block uppercase">Elevation</span>
          <span className="text-emerald-400 font-bold text-sm">
            {sat.elevationDeg.toFixed(1)}°
          </span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 block uppercase">Azimuth</span>
          <span className="text-white font-bold text-sm">
            {Math.round(sat.azimuthDeg)}° ({getCardinalText(sat.azimuthDeg)})
          </span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 block uppercase">Visual Mag</span>
          <span className="text-amber-400 font-bold text-sm">
            {sat.visualMagnitude
              ? sat.visualMagnitude > 0
                ? `+${sat.visualMagnitude.toFixed(1)}`
                : sat.visualMagnitude.toFixed(1)
              : "+2.5"} mᵥ
          </span>
        </div>

        <div>
          <span className="text-[9px] text-zinc-500 block uppercase">Altitude</span>
          <span className="text-cyan-300 font-bold">
            {Math.round(sat.satAltitudeKm)} km
          </span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 block uppercase">Inclination</span>
          <span className="text-purple-300 font-bold">
            {sat.inclinationDeg.toFixed(1)}°
          </span>
        </div>
        <div>
          <span className="text-[9px] text-zinc-500 block uppercase">Range</span>
          <span className="text-zinc-300 font-bold">
            {Math.round(sat.rangeKm || sat.satAltitudeKm * 1.3)} km
          </span>
        </div>

        <div className="col-span-3 pt-1.5 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-400">
          <span>RA: <strong className="text-zinc-200">{sat.coordsEq?.raStr || "18h 42m"}</strong></span>
          <span>DEC: <strong className="text-zinc-200">{sat.coordsEq?.decStr || "+12° 24'"}</strong></span>
          <span>Site: <strong className="text-zinc-200">{observer.lat.toFixed(2)}°N</strong></span>
        </div>
      </div>

      {/* Lock / Unlock Sight Action Button */}
      <button
        onClick={onToggleAimLock}
        className={`w-full py-2 text-xs font-mono font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer border ${
          isAimLocked
            ? "border-amber-400 bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            : "border-cyan-500 bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]"
        }`}
      >
        <Target className="h-3.5 w-3.5" />
        <span>{isAimLocked ? "UNLOCK SIGHT" : "AIM / LOCK SIGHT →"}</span>
      </button>
    </div>
  );
}
