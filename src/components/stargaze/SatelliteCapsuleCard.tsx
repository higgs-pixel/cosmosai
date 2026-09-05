"use client";

import { motion } from "framer-motion";
import {
  Target,
  Sun,
  Moon,
  Eye,
  Crosshair,
  Compass,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassButton } from "@/components/glass/GlassButton";
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <GlassPanel
        level={isSelected ? 3 : 2}
        interactive
        onClick={() => onSelectSat(sat)}
        className={`p-3 transition-all duration-300 cursor-pointer ${
          isSelected
            ? "border-cyan-400/80 bg-slate-900/80 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)]"
            : "hover:border-white/[0.18]"
        }`}
      >
        {/* Top Header: Category, Name & Illumination Status */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: catStyle.colorHex }}
            />
            <span className="font-extrabold text-xs text-white tracking-wide truncate">
              {sat.name}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold tracking-wider ${catStyle.badgeClass}`}
            >
              {catStyle.label}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {sat.isNakedEyeVisible && (
              <GlassBadge tone="amber">
                <Eye className="h-2.5 w-2.5" />
                <span>NAKED EYE</span>
              </GlassBadge>
            )}

            <GlassBadge
              tone={
                sat.isAboveHorizon
                  ? sat.isSunlit
                    ? sat.isObserverDark
                      ? "amber"
                      : "cyan"
                    : "purple"
                  : "cyan"
              }
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
                "PASS IN 24H"
              )}
            </GlassBadge>
          </div>
        </div>

        {/* Technical Aerospace Monospace Matrix: Altitude, Elevation, Azimuth, Magnitude */}
        <div className="grid grid-cols-4 gap-1.5 bg-slate-950/50 p-2 rounded-xl border border-white/[0.06] mb-2.5 font-mono text-center">
          <div>
            <div className="text-[8px] text-slate-500 uppercase">Elevation</div>
            <div className="text-[11px] font-bold text-emerald-300">
              {sat.elevationDeg.toFixed(1)}°
            </div>
          </div>
          <div>
            <div className="text-[8px] text-slate-500 uppercase">Azimuth</div>
            <div className="text-[11px] font-bold text-cyan-300">
              {Math.round(sat.azimuthDeg)}°
            </div>
          </div>
          <div>
            <div className="text-[8px] text-slate-500 uppercase">Altitude</div>
            <div className="text-[11px] font-bold text-amber-300">
              {Math.round(sat.satAltitudeKm)} km
            </div>
          </div>
          <div>
            <div className="text-[8px] text-slate-500 uppercase">Mag</div>
            <div className="text-[11px] font-bold text-purple-300">
              {sat.visualMagnitude ? (sat.visualMagnitude > 0 ? `+${sat.visualMagnitude.toFixed(1)}` : sat.visualMagnitude.toFixed(1)) : "+2.5"}
            </div>
          </div>
        </div>

        {/* Action Buttons: Primary AIM / TRACK & Secondary Focus */}
        <div className="flex items-center gap-1.5">
          <GlassButton
            size="xs"
            variant={isSelected ? "primary" : "default"}
            isActive={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onAimTrackSat(sat);
            }}
            className="flex-1 justify-center py-1.5 font-mono font-bold tracking-wider"
          >
            <Target className="h-3 w-3" />
            <span>{isSelected ? "SIGHT LOCKED" : "AIM / TRACK"}</span>
          </GlassButton>

          <GlassButton
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSat(sat);
            }}
            className="px-2.5 py-1.5 font-mono text-[10px]"
            title="Focus camera & view detailed telemetry"
          >
            <Crosshair className="h-3 w-3 text-slate-400" />
            <span className="hidden sm:inline">FOCUS</span>
          </GlassButton>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
