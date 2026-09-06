"use client";

import { useState, useMemo } from "react";
import { Compass, Eye, Satellite as SatIcon, Sparkles } from "lucide-react";
import { ComputedSatelliteSkyState } from "@/lib/astronomy/satellite-sky-math";

interface Planisphere2DRadarProps {
  satellites: ComputedSatelliteSkyState[];
  selectedSat: ComputedSatelliteSkyState | null;
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
  className?: string;
}

type RadarFilter = "visible" | "naked" | "overhead";

export function Planisphere2DRadar({
  satellites,
  selectedSat,
  onSelectSat,
  className = "",
}: Planisphere2DRadarProps) {
  const [filter, setFilter] = useState<RadarFilter>("visible");
  const [hoveredSat, setHoveredSat] = useState<ComputedSatelliteSkyState | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Radar geometry
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 14; // margin for N/S/E/W labels

  const filteredSats = useMemo(() => {
    return satellites.filter((sat) => {
      if (!sat.isAboveHorizon) return false;
      if (filter === "naked") return sat.isNakedEyeVisible;
      if (filter === "overhead") return sat.elevationDeg >= 40;
      return true;
    });
  }, [satellites, filter]);

  const counts = useMemo(() => {
    const above = satellites.filter((s) => s.isAboveHorizon);
    return {
      visible: above.length,
      naked: above.filter((s) => s.isNakedEyeVisible).length,
      overhead: above.filter((s) => s.elevationDeg >= 40).length,
    };
  }, [satellites]);

  return (
    <div
      className={`select-none pointer-events-auto flex flex-col items-center bg-black/90 border border-zinc-800 backdrop-blur-md p-2.5 shadow-2xl ${className}`}
    >
      {/* Header & Filter Tabs */}
      <div className="w-full flex items-center justify-between border-b border-zinc-800/80 pb-1.5 mb-2 gap-1">
        <div className="flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300">
            PLANISPHERE
          </span>
        </div>

        {/* 3 Filters: Visible, Naked-Eye, Overhead */}
        <div className="flex items-center gap-1 bg-zinc-950 p-0.5 border border-zinc-850">
          <button
            onClick={() => setFilter("visible")}
            title="All satellites currently above horizon"
            className={`px-1.5 py-0.5 text-[9px] font-mono transition cursor-pointer ${
              filter === "visible"
                ? "bg-cyan-500 text-black font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Vis ({counts.visible})
          </button>
          <button
            onClick={() => setFilter("naked")}
            title="Naked-Eye visible satellites"
            className={`px-1.5 py-0.5 text-[9px] font-mono transition cursor-pointer ${
              filter === "naked"
                ? "bg-amber-400 text-black font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Naked ({counts.naked})
          </button>
          <button
            onClick={() => setFilter("overhead")}
            title="High-elevation satellites (≥40°)"
            className={`px-1.5 py-0.5 text-[9px] font-mono transition cursor-pointer ${
              filter === "overhead"
                ? "bg-emerald-400 text-black font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Zenith ({counts.overhead})
          </button>
        </div>
      </div>

      {/* 2D Planisphere Radar Graphic (SVG) */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="overflow-visible"
          onMouseLeave={() => {
            setHoveredSat(null);
            setHoverPos(null);
          }}
        >
          {/* Outer Ring: Horizon (0° El) */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="#030712"
            stroke="#27272a"
            strokeWidth="1.5"
          />

          {/* 30° Elevation Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius * (2 / 3)}
            fill="none"
            stroke="#18181b"
            strokeDasharray="2 3"
            strokeWidth="1"
          />

          {/* 60° Elevation Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius * (1 / 3)}
            fill="none"
            stroke="#18181b"
            strokeDasharray="2 3"
            strokeWidth="1"
          />

          {/* Crosshair: North-South & East-West */}
          <line
            x1={cx}
            y1={cy - radius}
            x2={cx}
            y2={cy + radius}
            stroke="#27272a"
            strokeWidth="1"
          />
          <line
            x1={cx - radius}
            y1={cy}
            x2={cx + radius}
            y2={cy}
            stroke="#27272a"
            strokeWidth="1"
          />

          {/* Cardinal Directions */}
          <text
            x={cx}
            y={cy - radius + 9}
            textAnchor="middle"
            className="text-[8px] font-mono font-black fill-cyan-400"
          >
            N
          </text>
          <text
            x={cx + radius - 7}
            y={cy + 3}
            textAnchor="middle"
            className="text-[8px] font-mono font-bold fill-zinc-500"
          >
            E
          </text>
          <text
            x={cx}
            y={cy + radius - 3}
            textAnchor="middle"
            className="text-[8px] font-mono font-bold fill-zinc-500"
          >
            S
          </text>
          <text
            x={cx - radius + 7}
            y={cy + 3}
            textAnchor="middle"
            className="text-[8px] font-mono font-bold fill-zinc-500"
          >
            W
          </text>

          {/* Zenith Center Indicator */}
          <circle cx={cx} cy={cy} r={2} fill="#71717a" />

          {/* Satellite Beacons */}
          {filteredSats.map((sat) => {
            // Polar projection:
            // 90° el is center (r=0), 0° el is horizon (r=radius)
            const r = (1 - Math.max(0, Math.min(90, sat.elevationDeg)) / 90) * radius;
            // Azimuth 0° is North (top), 90° East (right)
            const azRad = ((sat.azimuthDeg - 90) * Math.PI) / 180;
            const px = cx + r * Math.cos(azRad);
            const py = cy + r * Math.sin(azRad);

            const isSelected = selectedSat?.id === sat.id;

            // Dot coloring based on type
            let dotColor = "#00e5ff"; // default cyan
            if (
              sat.name.toLowerCase().includes("iss") ||
              sat.name.toLowerCase().includes("tiangong") ||
              sat.name.toLowerCase().includes("hubble")
            ) {
              dotColor = "#fbbf24"; // amber/yellow for prominent stations
            } else if (sat.isNakedEyeVisible) {
              dotColor = "#38bdf8"; // bright sky cyan
            } else if (sat.name.toLowerCase().includes("starlink")) {
              dotColor = "#10b981"; // emerald for starlink
            }

            return (
              <g
                key={sat.id}
                className="cursor-pointer transition-transform hover:scale-125"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSat(sat);
                }}
                onMouseEnter={(e) => {
                  setHoveredSat(sat);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoverPos({ x: rect.left + 10, y: rect.top - 10 });
                }}
              >
                {isSelected && (
                  <>
                    <circle
                      cx={px}
                      cy={py}
                      r={7}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      className="animate-ping"
                      opacity={0.7}
                    />
                    <circle
                      cx={px}
                      cy={py}
                      r={5}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                    />
                  </>
                )}
                <circle
                  cx={px}
                  cy={py}
                  r={isSelected ? 3.5 : sat.isNakedEyeVisible ? 2.8 : 2}
                  fill={isSelected ? "#f59e0b" : dotColor}
                  stroke="#000"
                  strokeWidth="0.8"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredSat && (
          <div
            className="absolute z-50 pointer-events-none -top-12 left-1/2 -translate-x-1/2 bg-black/95 border border-cyan-500/60 px-2.5 py-1 text-[10px] font-mono text-white shadow-2xl flex flex-col gap-0.5 whitespace-nowrap min-w-[140px]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-0.5 font-bold text-cyan-300">
              <span className="truncate max-w-[100px]">{hoveredSat.name}</span>
              <span>{Math.round(hoveredSat.elevationDeg)}° El</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-zinc-400 text-[9px]">
              <span>{hoveredSat.category}</span>
              <span>{Math.round(hoveredSat.azimuthDeg)}° Az</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="w-full text-center text-[8px] font-mono text-zinc-500 pt-1 border-t border-zinc-900 mt-1">
        Click beacon to lock sight
      </div>
    </div>
  );
}
