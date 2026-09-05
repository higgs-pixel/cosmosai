"use client";

import { useMemo, memo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, ReferenceLine
} from "recharts";
import * as satellite from "satellite.js";
import { SatelliteVisibilityResult, estimateVisualMagnitude } from "@/lib/orbit/visibility";
import { ObserverCoords, SatellitePass } from "./PassPredictor";
import { Activity, Sparkles, Clock, Layers, TrendingUp, Compass, Orbit, Gauge, Eye, Zap } from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";

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
        const timeLabel = tDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

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
          // Synthetic parabolic pass curve between AOS & LOS
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
        const obsGd = {
          latitude: satellite.degreesToRadians(observer.lat),
          longitude: satellite.degreesToRadians(observer.lon),
          height: (observer.altMeters || 180) / 1000,
        };

        const pts = [];
        for (let i = -7; i <= 7; i++) {
          const targetTime = new Date(timeMs + i * 60 * 1000);
          const posVel = satellite.propagate(satrec, targetTime);
          if (posVel && posVel.position && typeof posVel.position === "object") {
            const gmst = satellite.gstime(targetTime);
            const posEcf = satellite.eciToEcf(posVel.position as satellite.EciVec3<number>, gmst);
            const look = satellite.ecfToLookAngles(obsGd, posEcf);
            const elDeg = parseFloat(satellite.radiansToDegrees(look.elevation).toFixed(1));
            const range = Math.round(look.rangeSat);
            const mag = estimateVisualMagnitude(selectedSat.satName, selectedSat.category || "Active", range, 1.2);

            pts.push({
              time: `${i >= 0 ? "+" : ""}${i}m`,
              elevation: elDeg,
              slantRange: range,
              magnitude: mag,
            });
          }
        }
        if (pts.length > 0) return pts;
      } catch {
        /* fallback */
      }
    }

    // 3. Synthetic smooth curve fallback based on selectedSat current metrics
    if (selectedSat) {
      const pts = [];
      const peakEl = Math.max(25, selectedSat.elevationDeg);
      const baseRange = selectedSat.slantRangeKm > 0 ? selectedSat.slantRangeKm : 500;
      const baseMag = selectedSat.estimatedMagnitude;

      for (let i = -7; i <= 7; i++) {
        const angle = (i / 7) * (Math.PI / 2);
        const el = Math.round(peakEl * Math.cos(angle));
        const dist = Math.round(baseRange + (1 - Math.cos(angle)) * 320);
        const mag = parseFloat((baseMag + (1 - Math.cos(angle)) * 2.0).toFixed(1));
        pts.push({
          time: `${i >= 0 ? "+" : ""}${i}m`,
          elevation: el,
          slantRange: dist,
          magnitude: mag,
        });
      }
      return pts;
    }

    // 4. Default fallback baseline if no satellite is available
    return Array.from({ length: 15 }, (_, i) => {
      const mins = i - 7;
      return {
        time: `${mins >= 0 ? "+" : ""}${mins}m`,
        elevation: Math.max(0, Math.round(45 * Math.cos((mins / 7) * (Math.PI / 2)))),
        slantRange: Math.round(420 + Math.abs(mins) * 35),
        magnitude: parseFloat((3.2 + Math.abs(mins) * 0.3).toFixed(1)),
      };
    });
  }, [selectedSat, selectedPass, observer, timeMs]);

  // Object breakdown by category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {
      "Space Stations": 0,
      "Active Satellites": 0,
      "Weather & Earth": 0,
      "Science & Deep": 0,
      "Debris": 0,
      "Rocket Stages": 0,
    };

    if (!visibleSats || visibleSats.length === 0) {
      counts["Active Satellites"] = 12;
      counts["Space Stations"] = 2;
      counts["Debris"] = 4;
    } else {
      visibleSats.forEach((s) => {
        const name = s.satName.toUpperCase();
        if (name.includes("ISS") || name.includes("TIANGONG") || name.includes("CSS") || name.includes("ZARYA")) {
          counts["Space Stations"]++;
        } else if (name.includes("DEB") || name.includes("DEBRIS")) {
          counts["Debris"]++;
        } else if (name.includes("R/B") || name.includes("ROCKET")) {
          counts["Rocket Stages"]++;
        } else if (name.includes("NOAA") || name.includes("GOES") || name.includes("METEOSAT") || name.includes("SENTINEL")) {
          counts["Weather & Earth"]++;
        } else if (name.includes("HUBBLE") || name.includes("HST") || name.includes("JWST") || name.includes("KEPLER")) {
          counts["Science & Deep"]++;
        } else {
          counts["Active Satellites"]++;
        }
      });
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

  // Max elevation peak calculation for callout badge
  const maxElValue = useMemo(() => {
    if (!passProfileData || passProfileData.length === 0) return 0;
    return Math.max(...passProfileData.map((d) => d.elevation));
  }, [passProfileData]);

  return (
    <div id="analytics-section" className="flex flex-col gap-6 w-full font-sans pt-4">
      {/* 1. Selected Satellite Interactive Telemetry Header Card */}
      {selectedSat ? (
        <GlassPanel level={2} className="p-5 border-cyan-400/30 shadow-[0_0_25px_rgba(0,229,255,0.12)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00e5ff] bg-[#00e5ff]/15 px-2.5 py-0.5 rounded border border-[#00e5ff]/30">
                  NORAD {selectedSat.satId}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${selectedSat.isNakedEyeVisible ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : selectedSat.isSunlit ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-slate-800 text-slate-300"}`}>
                  {selectedSat.statusLabel}
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1.5 flex items-center gap-2">
                {selectedSat.satName}
                {selectedSat.isNakedEyeVisible && <Sparkles className="h-5 w-5 text-[#00e5ff] animate-pulse" />}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Category: <span className="text-slate-200 font-semibold">{selectedSat.category || "Active Payload"}</span> | Orbit: <span className="text-[#00e5ff] font-semibold">{selectedSat.orbitClass || "LEO"}</span>
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                  <Activity className="h-3 w-3 text-[#00e5ff]" /> Elevation
                </div>
                <div className={`text-sm font-bold mt-0.5 ${selectedSat.elevationDeg > 0 ? "text-[#00e5ff]" : "text-slate-400"}`}>
                  {selectedSat.elevationDeg}°
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                  <Compass className="h-3 w-3 text-purple-400" /> Azimuth
                </div>
                <div className="text-sm font-bold text-white mt-0.5">{selectedSat.azimuthDeg}°</div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" /> Est. Mag
                </div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {selectedSat.estimatedMagnitude > 0 ? `+${selectedSat.estimatedMagnitude}` : selectedSat.estimatedMagnitude} mᵥ
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-amber-400" /> Slant Range
                </div>
                <div className="text-sm font-bold text-white mt-0.5">{selectedSat.slantRangeKm} km</div>
              </div>
            </div>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel level={1} className="p-4 text-xs font-mono text-slate-400 flex items-center justify-between">
          <span>Click any satellite on the Sky Dome, 3D Globe, or 2D Map to inspect live telemetry &amp; pass trajectories.</span>
          <span className="text-[#00e5ff] font-bold">Interactive Telemetry Enabled</span>
        </GlassPanel>
      )}

      {/* 2. Three High-Aesthetics Recharts Visual Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        
        {/* Chart 1: Pass Elevation Profile */}
        <GlassPanel level={2} className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-[#00e5ff]" />
                Pass Elevation Profile — {selectedSat ? selectedSat.satName : "Target Satellite"}
              </h3>
              <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                Topocentric elevation angle trajectory above horizon during pass window.
              </p>
            </div>
            {maxElValue > 0 && (
              <span className="text-xs font-mono font-bold text-[#00e5ff] bg-[#00e5ff]/15 border border-[#00e5ff]/40 px-2 py-1 rounded">
                Peak: {maxElValue}°
              </span>
            )}
          </div>

          <div className="h-56 w-full mt-2 bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={passProfileData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} fontFamily="monospace" interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} stroke="#94a3b8" fontSize={9} fontFamily="monospace" unit="°" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-[#00e5ff] rounded-xl p-3 text-xs font-mono text-slate-200 shadow-2xl space-y-1">
                          <div className="font-bold text-[#00e5ff]">Time: {data.time}</div>
                          <div>Elevation: <span className="text-white font-bold">{data.elevation}°</span></div>
                          <div>Slant Range: <span className="text-white">{data.slantRange} km</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x="0m" stroke="#00e5ff" strokeWidth={2} strokeDasharray="3 3" label={{ value: "NOW", fill: "#00e5ff", fontSize: 9, fontWeight: "bold" }} />
                <Area
                  type="monotone"
                  dataKey="elevation"
                  stroke="#00e5ff"
                  strokeWidth={3}
                  fill="#00e5ff"
                  fillOpacity={0.25}
                  isAnimationActive={false}
                  dot={{ r: 4, fill: "#00e5ff", stroke: "#ffffff", strokeWidth: 1.5 }}
                  activeDot={{ r: 7, fill: "#ffffff", stroke: "#00e5ff", strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        {/* Chart 2: Visual Magnitude Brightness Curve */}
        <GlassPanel level={2} className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Visual Magnitude Curve (mᵥ) — Brighter at Peak
            </h3>
            <p className="text-xs text-slate-400 mb-2 leading-relaxed">
              Estimated apparent brightness (mᵥ) modulated by slant range and solar phase angle.
            </p>
          </div>

          <div className="h-56 w-full mt-2 bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={passProfileData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} fontFamily="monospace" interval="preserveStartEnd" />
                <YAxis domain={["auto", "auto"]} stroke="#94a3b8" fontSize={9} fontFamily="monospace" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-emerald-500 rounded-xl p-3 text-xs font-mono text-slate-200 shadow-2xl space-y-1">
                          <div className="font-bold text-emerald-400">Time: {data.time}</div>
                          <div>Apparent Brightness: <span className="text-white font-bold">{data.magnitude > 0 ? `+${data.magnitude}` : data.magnitude} mᵥ</span></div>
                          <div>Slant Range: <span className="text-white">{data.slantRange} km</span></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x="0m" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ value: "NOW", fill: "#10b981", fontSize: 9, fontWeight: "bold" }} />
                <Area
                  type="monotone"
                  dataKey="magnitude"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="#10b981"
                  fillOpacity={0.25}
                  isAnimationActive={false}
                  dot={{ r: 4, fill: "#10b981", stroke: "#ffffff", strokeWidth: 1.5 }}
                  activeDot={{ r: 7, fill: "#ffffff", stroke: "#10b981", strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        {/* Chart 3: Overhead Object Category Breakdown Donut */}
        <GlassPanel level={2} className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-purple-400" />
              Overhead Object Breakdown ({totalSatsCount})
            </h3>
            <p className="text-xs text-slate-400 mb-2 leading-relaxed">
              Classification of currently active or illuminated satellites by mission domain.
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-between gap-2 bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#090d16" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#090d16", borderColor: "#1e293b", borderRadius: "8px", fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Interactive Legend Badges */}
            <div className="w-1/2 flex flex-col gap-1.5 font-mono text-[11px] overflow-y-auto max-h-48 pr-1">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between bg-slate-950 border border-slate-800/80 px-2 py-1 rounded">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-white ml-1 shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

      </div>
    </div>
  );
}

export default memo(SkyPassAnalytics);
