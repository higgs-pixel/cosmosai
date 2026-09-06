"use client";

import { motion } from "framer-motion";
import {
  Target,
  Sun,
  Moon,
  Eye,
  Crosshair,
} from "lucide-react";
import { ComputedSatelliteSkyState } from "@/lib/astronomy/satellite-sky-math";
import { getSatelliteCategoryStyle } from "@/components/intelligence/StarGazeView";

interface SatelliteCapsuleCardProps {
  sat: ComputedSatelliteSkyState;
  isSelected: boolean;
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
  onAimTrackSat: (sat: ComputedSatelliteSkyState) => void;
}

export function SatelliteCapsuleCard({
  sat,
  isSelected,
  onSelectSat,
  onAimTrackSat,
}: SatelliteCapsuleCardProps) {
  const catStyle = getSatelliteCategoryStyle(sat.category, sat.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      onClick={() => onSelectSat(sat)}
      className={`p-3.5 sm:p-4 border transition-all duration-200 cursor-pointer select-none font-sans ${
        isSelected
          ? "border-cyan-400 bg-zinc-900/90 shadow-[0_0_20px_rgba(0,229,255,0.15)]"
          : "border-zinc-850 bg-zinc-950 hover:border-zinc-700"
      }`}
    >
      {/* Top Header: Category, Name & Illumination Status */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: catStyle.colorHex }}
          />
          <span className="font-extrabold text-xs text-white tracking-wide truncate font-sans">
            {sat.name}
          </span>
          <span
            className={`px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider border border-zinc-800 ${catStyle.badgeClass}`}
          >
            {catStyle.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[9px] font-mono">
          {sat.isNakedEyeVisible && (
            <span className="px-1.5 py-0.5 border border-amber-500/40 bg-amber-950/30 text-amber-300 font-bold flex items-center gap-1">
              <Eye className="h-2.5 w-2.5 text-amber-400" />
              <span>NAKED EYE</span>
            </span>
          )}

          <span
            className={`px-1.5 py-0.5 border font-semibold flex items-center gap-1 ${
              sat.isAboveHorizon
                ? sat.isSunlit
                  ? sat.isObserverDark
                    ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
                    : "border-cyan-500/40 bg-cyan-950/20 text-cyan-300"
                  : "border-purple-500/40 bg-purple-950/20 text-purple-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            {sat.isAboveHorizon ? (
              sat.isSunlit ? (
                sat.isObserverDark ? (
                  <>
                    <Sun className="h-2.5 w-2.5 text-amber-400" />
                    <span>SUNLIT</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-2.5 w-2.5 text-cyan-300" />
                    <span>SUNLIT (DAY)</span>
                  </>
                )
              ) : (
                <>
                  <Moon className="h-2.5 w-2.5 text-purple-300" />
                  <span>ECLIPSED</span>
                </>
              )
            ) : sat.maxPassElevationDeg ? (
              `PEAK ${sat.maxPassElevationDeg}°`
            ) : (
              "IN 24H"
            )}
          </span>
        </div>
      </div>

      {/* Technical Monospace Matrix: Altitude, Elevation, Azimuth, Magnitude */}
      <div className="grid grid-cols-4 gap-1 bg-black p-2 border border-zinc-850 mb-3 font-mono text-center">
        <div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-widest">Elevation</div>
          <div className="text-xs font-bold text-emerald-400">
            {sat.elevationDeg.toFixed(1)}°
          </div>
        </div>
        <div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-widest">Azimuth</div>
          <div className="text-xs font-bold text-cyan-300">
            {Math.round(sat.azimuthDeg)}°
          </div>
        </div>
        <div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-widest">Altitude</div>
          <div className="text-xs font-bold text-zinc-200">
            {Math.round(sat.satAltitudeKm)} km
          </div>
        </div>
        <div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-widest">Mag</div>
          <div className="text-xs font-bold text-amber-300">
            {sat.visualMagnitude ? (sat.visualMagnitude > 0 ? `+${sat.visualMagnitude.toFixed(1)}` : sat.visualMagnitude.toFixed(1)) : "+2.5"}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAimTrackSat(sat);
          }}
          className={`flex-1 py-1.5 px-3 border transition flex items-center justify-center gap-1.5 font-bold cursor-pointer uppercase ${
            isSelected
              ? "border-cyan-400 bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,229,255,0.4)]"
              : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-white"
          }`}
        >
          <Target className="h-3 w-3" />
          <span>{isSelected ? "Sight Locked" : "Aim / Track"}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectSat(sat);
          }}
          className="py-1.5 px-3 border border-zinc-800 bg-black text-zinc-400 hover:text-white hover:border-zinc-600 transition cursor-pointer flex items-center gap-1 uppercase"
          title="Inspect telemetry"
        >
          <Crosshair className="h-3 w-3" />
          <span className="hidden sm:inline">Details</span>
        </button>
      </div>
    </motion.div>
  );
}
