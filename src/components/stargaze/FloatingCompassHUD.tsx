"use client";

import { useMemo } from "react";
import { Compass, Navigation } from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { ComputedSatelliteSkyState } from "@/lib/astronomy/satellite-sky-math";

interface FloatingCompassHUDProps {
  headingAzimuth: number;
  pitch: number;
  selectedSat: ComputedSatelliteSkyState | null;
  className?: string;
}

export function FloatingCompassHUD({
  headingAzimuth,
  pitch,
  selectedSat,
  className = "",
}: FloatingCompassHUDProps) {
  // Compass cardinal points
  const cardinals = [
    { label: "N", deg: 0 },
    { label: "NE", deg: 45 },
    { label: "E", deg: 90 },
    { label: "SE", deg: 135 },
    { label: "S", deg: 180 },
    { label: "SW", deg: 225 },
    { label: "W", deg: 270 },
    { label: "NW", deg: 315 },
  ];

  // Compute satellite relative bearing to observer sight
  const satRelativeAngle = useMemo(() => {
    if (!selectedSat) return null;
    return (selectedSat.azimuthDeg - headingAzimuth + 360) % 360;
  }, [selectedSat, headingAzimuth]);

  return (
    <div
      className={`pointer-events-none select-none flex flex-col items-center gap-1.5 ${className}`}
    >
      <GlassPanel
        level={1}
        className="p-2.5 flex flex-col items-center shadow-2xl relative w-32 h-32 rounded-full border border-white/[0.14]"
      >
        {/* Dial ring with subtle ticks */}
        <div className="absolute inset-2 rounded-full border border-white/[0.08] flex items-center justify-center">
          {/* Subtle crosshairs */}
          <div className="absolute inset-x-0 h-px bg-white/[0.06]" />
          <div className="absolute inset-y-0 w-px bg-white/[0.06]" />

          {/* Rotating Compass Ring */}
          <div
            className="absolute inset-0 transition-transform duration-200 ease-out"
            style={{ transform: `rotate(${-headingAzimuth}deg)` }}
          >
            {cardinals.map((c) => {
              const rad = (c.deg * Math.PI) / 180;
              const r = 44; // radius
              const x = Math.sin(rad) * r;
              const y = -Math.cos(rad) * r;

              const isNorth = c.label === "N";

              return (
                <span
                  key={c.label}
                  className={`absolute text-[8px] font-mono font-black transform -translate-x-1/2 -translate-y-1/2 ${
                    isNorth ? "text-cyan-400 font-extrabold" : "text-slate-400"
                  }`}
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  {c.label}
                </span>
              );
            })}
          </div>

          {/* Selected Satellite Bearing Glowing Reticle Indicator */}
          {satRelativeAngle !== null && (
            <div
              className="absolute inset-0 transition-transform duration-300 pointer-events-none"
              style={{ transform: `rotate(${satRelativeAngle}deg)` }}
            >
              <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(245,158,11,1)]" />
              </div>
            </div>
          )}

          {/* Center Observer Sight Reticle */}
          <div className="relative z-10 flex flex-col items-center justify-center p-1.5 rounded-full bg-slate-950/80 border border-white/20 text-cyan-300 shadow-inner">
            <Navigation className="h-3.5 w-3.5 text-cyan-400 rotate-45" />
          </div>
        </div>

        {/* Bottom Bearing Numeric Badge */}
        <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-950/90 border border-cyan-400/40 text-cyan-300 font-mono text-[9px] font-extrabold shadow-md">
          {Math.round(headingAzimuth)}° AZ
        </div>
      </GlassPanel>
    </div>
  );
}
