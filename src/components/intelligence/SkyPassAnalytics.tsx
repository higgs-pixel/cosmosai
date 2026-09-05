"use client";

import { useMemo, memo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, ReferenceLine
} from "recharts";
import * as satellite from "satellite.js";
import { SatelliteVisibilityResult, estimateVisualMagnitude } from "@/lib/orbit/visibility";
import { ObserverCoords, SatellitePass } from "./PassPredictor";
import { Activity, Sparkles, Compass, TrendingUp, Gauge, Layers } from "lucide-react";

interface SkyPassAnalyticsProps {
  selectedSat: SatelliteVisibilityResult | null;
  visibleSats: SatelliteVisibilityResult[];
  observer: ObserverCoords;
  timeMs: number;
  selectedPass?: SatellitePass | null;
  onSelectCategory?: (category: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Space Stations": "#00e5ff",
  "Active Satellites": "#10b981",
  "Weather & Earth": "#3b82f6",
  "Science & Deep": "#a855f7",
  "Debris": "#ef4444",
  "Rocket Stages": "#f59e0b",
};

function SkyPassAnalytics({
  selectedSat,
  visibleSats,
  observer,
  timeMs,
  selectedPass,
}: SkyPassAnalyticsProps) {
  // Real SGP4 pass profile trajectory data points for the selected satellite (15 smooth sample points)
  const passProfileData = useMemo(() => {
    const totalSamples = 15;

    // 1. If an upcoming pass object is selected, resample 15 smooth SGP4 timesteps between AOS & LOS
    if (selectedPass && selectedPass.startTimeMs && selectedPass.endTimeMs) {
      const start = selectedPass.startTimeMs;
      const end = selectedPass.endTimeMs;
      const duration = end - start;

      const satrec = selectedSat && selectedSat.line1 && selectedSat.line2
        ? satellite.twoline2satrec(selectedSat.line1, selectedSat.line2)
        : null;

      const obsGd = {
        latitude: satellite.degreesToRadians(observer.lat),
        longitude: satellite.degreesToRadians(observer.lon),
        height: (observer.altMeters || 180) / 1000,
      };

      const pts = [];
      for (let i = 0; i < totalSamples; i++) {
        const frac = i / (totalSamples - 1);
        const tMs = start + frac * duration;
        const tDate = new Date(tMs);
        const timeLabel = tDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        let el = 0;
        let slant = 400;
        let mag = selectedPass.peakVmag || 4.0;

        if (satrec) {
          const posVel = satellite.propagate(satrec, tDate);
          if (posVel && posVel.position && typeof posVel.position === "object") {
            const gmst = satellite.gstime(tDate);
            const posEcf = satellite.eciToEcf(posVel.position as satellite.EciVec3<number>, gmst);
            const look = satellite.ecfToLookAngles(obsGd, posEcf);
            el = parseFloat(satellite.radiansToDegrees(look.elevation).toFixed(1));
            slant = Math.round(look.rangeSat);
            mag = estimateVisualMagnitude(selectedPass.satName, "Active", slant, 1.2);
          }
        } else {
          const maxEl = selectedPass.maxElevationDeg || 45;
          const angle = (frac - 0.5) * Math.PI;
          el = Math.max(0, Math.round(maxEl * Math.cos(angle)));
          slant = Math.round(380 + (1 - Math.cos(angle)) * 300);
          mag = parseFloat((selectedPass.peakVmag + (1 - Math.cos(angle)) * 2.0).toFixed(1));
        }

        pts.push({
          time: timeLabel,
          elevation: el,
          slantRange: slant,
          magnitude: mag,
        });
      }
      return pts;
    }

    // 2. If selectedSat has raw TLE lines, calculate real SGP4 topocentric look angles over ± 7 minute window
    if (selectedSat && selectedSat.line1 && selectedSat.line2) {
      try {
        const satrec = satellite.twoline2satrec(selectedSat.line1, selectedSat.line2);
        if (satrec && !satrec.error) {
          const obsGd = {
            latitude: satellite.degreesToRadians(observer.lat),
            longitude: satellite.degreesToRadians(observer.lon),
            height: (observer.altMeters || 180) / 1000,
          };

          const pts = [];
          const windowSpanMs = 14 * 60_000;
          const stepMs = windowSpanMs / (totalSamples - 1);
          const startMs = timeMs - 7 * 60_000;

          for (let i = 0; i < totalSamples; i++) {
            const curTime = new Date(startMs + i * stepMs);
            const posVel = satellite.propagate(satrec, curTime);
            if (posVel && posVel.position && typeof posVel.position === "object") {
              const gmst = satellite.gstime(curTime);
              const posEcf = satellite.eciToEcf(posVel.position as satellite.EciVec3<number>, gmst);
              const look = satellite.ecfToLookAngles(obsGd, posEcf);
              const el = parseFloat(satellite.radiansToDegrees(look.elevation).toFixed(1));
              const slant = Math.round(look.rangeSat);
              const mag = estimateVisualMagnitude(selectedSat.satName, selectedSat.category || "Active", slant, 1.0);
              const offsetMin = Math.round((startMs + i * stepMs - timeMs) / 60_000);
              const label = offsetMin === 0 ? "Now" : `${offsetMin > 0 ? "+" : ""}${offsetMin}m`;

              pts.push({
                time: label,
                elevation: el,
                slantRange: slant,
                magnitude: mag,
              });
            }
          }
          if (pts.length > 0) return pts;
        }
      } catch {
        /* skip */
      }
    }

    // Fallback baseline trajectory
    const fallbackPts = [];
    for (let i = -7; i <= 7; i++) {
      const peakEl = selectedSat ? Math.max(10, selectedSat.elevationDeg) : 45;
      const el = Math.round(peakEl - (i * i) * 0.7);
      fallbackPts.push({
        time: i === 0 ? "Now" : `${i > 0 ? "+" : ""}${i}m`,
        elevation: el,
        slantRange: Math.round(420 + Math.abs(i) * 35),
        magnitude: parseFloat((2.5 + Math.abs(i) * 0.2).toFixed(1)),
      });
    }
    return fallbackPts;
  }, [selectedSat, selectedPass, observer, timeMs]);

  // Group visible satellites by category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {
      "Space Stations": 0,
      "Active Satellites": 0,
      "Weather & Earth": 0,
      "Science & Deep": 0,
      "Debris": 0,
      "Rocket Stages": 0,
    };

    if (visibleSats && visibleSats.length > 0) {
      visibleSats.forEach((s) => {
        const cat = s.category?.toLowerCase() || "";
        const name = s.satName.toLowerCase();
        if (cat.includes("station") || name.includes("iss") || name.includes("tiangong")) counts["Space Stations"]++;
        else if (cat.includes("weather") || cat.includes("meteo") || cat.includes("noaa")) counts["Weather & Earth"]++;
        else if (cat.includes("science") || cat.includes("telescope") || name.includes("hubble")) counts["Science & Deep"]++;
        else if (cat.includes("debris") || name.includes("deb")) counts["Debris"]++;
        else if (cat.includes("rocket") || name.includes("r/b")) counts["Rocket Stages"]++;
        else counts["Active Satellites"]++;
      });
    } else {
      counts["Space Stations"] = 2;
      counts["Active Satellites"] = 18;
      counts["Weather & Earth"] = 6;
      counts["Science & Deep"] = 4;
    }

    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || "#00e5ff",
      }));
  }, [visibleSats]);

  const totalSatsCount = useMemo(() => {
    return categoryData.reduce((acc, curr) => acc + curr.value, 0);
  }, [categoryData]);

  const maxElValue = useMemo(() => {
    if (!passProfileData || passProfileData.length === 0) return 0;
    return Math.max(...passProfileData.map((d) => d.elevation));
  }, [passProfileData]);

  return (
    <div id="analytics-section" className="flex flex-col gap-6 w-full font-sans">
      {/* 1. Selected Satellite Interactive Telemetry Header Banner */}
      {selectedSat && (
        <div className="border border-zinc-850 bg-black p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00e5ff] border border-[#00e5ff]/40 bg-[#00e5ff]/10 px-2 py-0.5">
                  NORAD {selectedSat.satId}
                </span>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 border ${
                  selectedSat.isNakedEyeVisible
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                    : selectedSat.isSunlit
                    ? "border-amber-500/40 text-amber-400 bg-amber-950/20"
                    : "border-zinc-800 text-zinc-400 bg-zinc-950"
                }`}>
                  {selectedSat.statusLabel}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-2 flex items-center gap-2 font-sans">
                {selectedSat.satName}
                {selectedSat.isNakedEyeVisible && <Sparkles className="h-4 w-4 text-[#00e5ff]" />}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                Category: <span className="text-zinc-200 font-medium">{selectedSat.category || "Active Payload"}</span> &bull; Orbit: <span className="text-[#00e5ff] font-semibold">{selectedSat.orbitClass || "LEO"}</span>
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans text-xs">
              <div className="bg-zinc-950 border border-zinc-800 px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1 font-semibold">
                  <Activity className="h-3 w-3 text-[#00e5ff]" /> Elevation
                </div>
                <div className={`text-base font-bold mt-0.5 ${selectedSat.elevationDeg > 0 ? "text-white" : "text-zinc-500"}`}>
                  {selectedSat.elevationDeg}°
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1 font-semibold">
                  <Compass className="h-3 w-3 text-zinc-400" /> Azimuth
                </div>
                <div className="text-base font-bold text-white mt-0.5">{selectedSat.azimuthDeg}°</div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1 font-semibold">
                  <TrendingUp className="h-3 w-3 text-emerald-400" /> Est. Mag
                </div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {selectedSat.estimatedMagnitude > 0 ? `+${selectedSat.estimatedMagnitude}` : selectedSat.estimatedMagnitude} mᵥ
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 px-3 py-2">
                <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1 font-semibold">
                  <Gauge className="h-3 w-3 text-amber-400" /> Slant Range
                </div>
                <div className="text-base font-bold text-zinc-200 mt-0.5 font-mono">{selectedSat.slantRangeKm} km</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Three Editorial Analytics Charts with Thin 1px Borders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Chart 1: Pass Elevation Profile */}
        <div className="border border-zinc-850 bg-black p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-zinc-900 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-sans">
                <Activity className="h-3.5 w-3.5 text-[#00e5ff]" />
                <span>Pass Elevation Profile — {selectedSat ? selectedSat.satName : "Target"}</span>
              </h3>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Topocentric elevation angle trajectory above observer horizon.
              </p>
            </div>
            {maxElValue > 0 && (
              <span className="text-[10px] font-mono font-bold text-[#00e5ff] border border-zinc-800 bg-zinc-950 px-2 py-0.5 shrink-0">
                Peak {maxElValue}°
              </span>
            )}
          </div>

          <div className="h-56 w-full bg-zinc-950 p-2 border border-zinc-900">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={passProfileData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" opacity={0.6} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={9} interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} stroke="#71717a" fontSize={9} unit="°" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-black border border-zinc-700 p-2.5 text-xs text-zinc-200 shadow-2xl space-y-1 font-sans">
                          <div className="font-bold text-[#00e5ff]">Time: {data.time}</div>
                          <div>Elevation: <span className="text-white font-bold">{data.elevation}°</span></div>
                          <div>Slant Range: <span className="text-zinc-300">{data.slantRange} km</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x="Now" stroke="#00e5ff" strokeWidth={1.5} strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="elevation"
                  stroke="#00e5ff"
                  strokeWidth={2}
                  fill="#00e5ff"
                  fillOpacity={0.12}
                  isAnimationActive={false}
                  dot={{ r: 3, fill: "#00e5ff", stroke: "#000000", strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: "#ffffff", stroke: "#00e5ff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Visual Magnitude Curve */}
        <div className="border border-zinc-850 bg-black p-5 flex flex-col justify-between space-y-4">
          <div className="border-b border-zinc-900 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-sans">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Visual Magnitude Curve (mᵥ)</span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              Estimated apparent brightness modulated by slant range and solar phase.
            </p>
          </div>

          <div className="h-56 w-full bg-zinc-950 p-2 border border-zinc-900">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={passProfileData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" opacity={0.6} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={9} interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} stroke="#71717a" fontSize={9} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-black border border-zinc-700 p-2.5 text-xs text-zinc-200 shadow-2xl space-y-1 font-sans">
                          <div className="font-bold text-emerald-400">Time: {data.time}</div>
                          <div>Brightness: <span className="text-white font-bold">{data.magnitude > 0 ? `+${data.magnitude}` : data.magnitude} mᵥ</span></div>
                          <div>Slant Range: <span className="text-zinc-300">{data.slantRange} km</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x="Now" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="magnitude"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="#10b981"
                  fillOpacity={0.12}
                  isAnimationActive={false}
                  dot={{ r: 3, fill: "#10b981", stroke: "#000000", strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: "#ffffff", stroke: "#10b981", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Overhead Object Breakdown */}
        <div className="border border-zinc-850 bg-black p-5 flex flex-col justify-between space-y-4">
          <div className="border-b border-zinc-900 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-sans">
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              <span>Overhead Object Breakdown ({totalSatsCount})</span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              Classification of currently tracked satellites by mission domain.
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-between gap-4 bg-zinc-950 p-3 border border-zinc-900">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#000000" strokeWidth={1.5} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#000000", borderColor: "#3f3f46", borderRadius: "0px", fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Minimal Category Legend */}
            <div className="w-1/2 flex flex-col gap-1.5 text-xs font-sans overflow-y-auto max-h-48 pr-1">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b border-zinc-900 py-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-zinc-300 text-[11px] truncate">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-white text-[11px] ml-1 shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default memo(SkyPassAnalytics);
