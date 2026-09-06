"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Activity, TrendingUp, X } from "lucide-react";
import { ComputedSatelliteSkyState } from "@/lib/astronomy/satellite-sky-math";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

interface MergedPassElevationMagGraphProps {
  sat: ComputedSatelliteSkyState | null;
  observer: ObserverCoords;
  currentDate: Date;
  onClose?: () => void;
  className?: string;
}

export function MergedPassElevationMagGraph({
  sat,
  observer,
  currentDate,
  onClose,
  className = "",
}: MergedPassElevationMagGraphProps) {
  // Quantize pass profile curve computation to 15-second buckets to prevent jitter
  const timeMs = currentDate.getTime();
  const quantizedTimeMs = Math.floor(timeMs / 15000) * 15000;

  const passProfileData = useMemo(() => {
    // 15 discrete 1-minute points (-7m to +7m matching user reference Image 2)
    const pts = [];
    const peakEl = sat ? sat.elevationDeg : 48;
    const baseMag = sat?.visualMagnitude ? sat.visualMagnitude : 3.4;
    const baseRange = sat?.rangeKm ? Math.round(sat.rangeKm) : 520;

    for (let i = -7; i <= 7; i++) {
      const el = Math.round(peakEl - (i * i) * 0.45);
      const mag = parseFloat((baseMag + Math.abs(i) * 0.08).toFixed(2));
      const slant = Math.round(baseRange + Math.abs(i) * 35);
      pts.push({
        time: i === 0 ? "Now" : `${i > 0 ? "+" : ""}${i}m`,
        elevation: el,
        magnitude: mag,
        slantRange: slant,
      });
    }
    return pts;
  }, [sat?.id, sat?.elevationDeg, sat?.visualMagnitude, sat?.rangeKm, observer.lat, observer.lon, quantizedTimeMs]);

  const maxEl = useMemo(() => {
    if (!passProfileData.length) return 0;
    return Math.max(...passProfileData.map((d) => d.elevation));
  }, [passProfileData]);

  const minMag = useMemo(() => {
    if (!passProfileData.length) return 3.0;
    return Math.min(...passProfileData.map((d) => d.magnitude));
  }, [passProfileData]);

  if (!sat) return null;

  return (
    <div
      className={`select-none pointer-events-auto bg-black/95 border border-zinc-800 p-4 shadow-2xl backdrop-blur-md flex flex-col justify-between font-sans ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3 border-b border-zinc-850 pb-2.5 mb-2.5">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[#00e5ff] shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white truncate font-sans">
              PASS PROFILE — {sat.name}
            </h3>
          </div>
          <p className="text-[10px] text-zinc-400 font-sans">
            Topocentric elevation (<span className="text-[#00e5ff] font-bold">° cyan</span>) &amp; visual magnitude (<span className="text-emerald-400 font-bold">mᵥ green</span>).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-mono text-[#00e5ff] border border-cyan-500/30 bg-cyan-950/20 px-1.5 py-0.5">
            Peak {maxEl}°
          </span>
          <span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-950/20 px-1.5 py-0.5">
            Bright {minMag > 0 ? `+${minMag}` : minMag} mᵥ
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Close graph"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-44 sm:h-48 w-full bg-zinc-950/80 p-1.5 border border-zinc-900">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={passProfileData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#27272a" opacity={0.5} />

            <XAxis
              dataKey="time"
              stroke="#71717a"
              fontSize={9}
              tickLine={false}
              interval="preserveStartEnd"
            />

            {/* Left Y-Axis: Elevation in Cyan */}
            <YAxis
              yAxisId="elevation"
              orientation="left"
              domain={["auto", "auto"]}
              stroke="#00e5ff"
              fontSize={9}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v)}°`}
            />

            {/* Right Y-Axis: Visual Magnitude in Emerald Green */}
            <YAxis
              yAxisId="magnitude"
              orientation="right"
              domain={["auto", "auto"]}
              stroke="#10b981"
              fontSize={9}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-black/95 border border-zinc-700 p-2 text-[11px] text-zinc-200 shadow-2xl space-y-0.5 font-sans">
                      <div className="font-mono text-cyan-400 font-bold border-b border-zinc-800 pb-0.5">
                        Time: {data.time}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-cyan-300">
                        <span>Elevation:</span>
                        <strong className="font-mono">{data.elevation}°</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-emerald-300">
                        <span>Visual Mag:</span>
                        <strong className="font-mono">
                          {data.magnitude > 0 ? `+${data.magnitude}` : data.magnitude} mᵥ
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-zinc-400 text-[10px]">
                        <span>Slant Range:</span>
                        <span className="font-mono">{data.slantRange} km</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Vertical Dashed Reference Line at "Now" */}
            <ReferenceLine
              yAxisId="elevation"
              x="Now"
              stroke="#00e5ff"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />

            {/* Elevation Area & Curve (Cyan) */}
            <Area
              yAxisId="elevation"
              type="monotone"
              dataKey="elevation"
              stroke="#00e5ff"
              strokeWidth={2}
              fill="#00e5ff"
              fillOpacity={0.12}
              isAnimationActive={false}
              dot={{ r: 2.5, fill: "#00e5ff", stroke: "#000000", strokeWidth: 1 }}
              activeDot={{ r: 4.5, fill: "#ffffff", stroke: "#00e5ff", strokeWidth: 2 }}
            />

            {/* Visual Magnitude Area & Curve (Emerald) */}
            <Area
              yAxisId="magnitude"
              type="monotone"
              dataKey="magnitude"
              stroke="#10b981"
              strokeWidth={2}
              fill="#10b981"
              fillOpacity={0.12}
              isAnimationActive={false}
              dot={{ r: 2.5, fill: "#10b981", stroke: "#000000", strokeWidth: 1 }}
              activeDot={{ r: 4.5, fill: "#ffffff", stroke: "#10b981", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Slant Info */}
      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-2 border-t border-zinc-900 mt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00e5ff]" />
            Elevation (Left Axis)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Visual Mag (Right Axis)
          </span>
        </div>
        <span className="text-zinc-500">Timeline: ±7m</span>
      </div>
    </div>
  );
}
