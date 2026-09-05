"use client";

import { useState, useMemo, memo } from "react";
import { getPosition as getSunPosition, getMoonPosition } from "suncalc";


import { SatelliteVisibilityResult, ObserverTwilightInfo } from "@/lib/orbit/visibility";
import { Compass, Sun, Moon, Sparkles, Eye, Info, MapPin, Target, Layers, Filter } from "lucide-react";

interface SkyDomeChartProps {
  visibleSats: SatelliteVisibilityResult[];
  allEvaluatedSats?: SatelliteVisibilityResult[];
  twilight: ObserverTwilightInfo;
  observer: { lat: number; lon: number; altMeters: number; name: string };
  timeMs: number;
  selectedSatId: number | null;
  onSelectSat: (id: number) => void;
}

function SkyDomeChart({
  visibleSats,
  allEvaluatedSats = [],
  twilight,
  observer,
  timeMs,
  selectedSatId,
  onSelectSat,
}: SkyDomeChartProps) {
  const [hoveredSatId, setHoveredSatId] = useState<number | null>(null);
  const [showApproaching, setShowApproaching] = useState(false);
  const [showObserverTooltip, setShowObserverTooltip] = useState(false);
  const [labelDensity, setLabelDensity] = useState<"smart" | "selected" | "all">("smart");

  const SVG_SIZE = 520;
  const CENTER = SVG_SIZE / 2;
  const RADIUS = 210; // Outer horizon radius (0° elevation)

  // Determine satellite set to render on Sky Chart
  const renderSats = useMemo(() => {
    const base = showApproaching && allEvaluatedSats.length > 0 ? allEvaluatedSats : visibleSats;
    if (base.length > 0) return base;
    return visibleSats;
  }, [showApproaching, allEvaluatedSats, visibleSats]);

  // Set of satellite IDs that should have visible text labels (prevents label collisions and lag)
  const labeledSatIds = useMemo(() => {
    const set = new Set<number>();
    if (selectedSatId) set.add(selectedSatId);
    if (hoveredSatId) set.add(hoveredSatId);

    if (labelDensity === "selected") {
      return set;
    }

    // Smart declutter: show top 10 highest elevation or brightest satellites
    const maxLabels = labelDensity === "all" ? 30 : 10;
    const sorted = [...renderSats].sort((a, b) => {
      if (a.isNakedEyeVisible && !b.isNakedEyeVisible) return -1;
      if (!a.isNakedEyeVisible && b.isNakedEyeVisible) return 1;
      return b.elevationDeg - a.elevationDeg;
    });

    for (let i = 0; i < Math.min(sorted.length, maxLabels); i++) {
      set.add(sorted[i].satId);
    }

    return set;
  }, [renderSats, selectedSatId, hoveredSatId, labelDensity]);

  const hoveredSat = useMemo(() => {
    if (!hoveredSatId) return null;
    return renderSats.find((s) => s.satId === hoveredSatId) || null;
  }, [renderSats, hoveredSatId]);

  // Calculate Sun and Moon polar coordinates on Sky Chart
  const date = useMemo(() => new Date(timeMs), [timeMs]);
  
  const sunPos = useMemo(() => {
    try {
      const p = getSunPosition(date, observer.lat, observer.lon);
      const altDeg = (p.altitude * 180) / Math.PI;
      const azDeg = ((p.azimuth * 180) / Math.PI + 180) % 360;
      return { altDeg, azDeg };
    } catch {
      return { altDeg: 15, azDeg: 180 };
    }
  }, [date, observer]);

  const moonPos = useMemo(() => {
    try {
      const p = getMoonPosition(date, observer.lat, observer.lon);
      const altDeg = (p.altitude * 180) / Math.PI;
      const azDeg = ((p.azimuth * 180) / Math.PI + 180) % 360;
      return { altDeg, azDeg };
    } catch {
      return { altDeg: -10, azDeg: 90 };
    }
  }, [date, observer]);

  // Convert Azimuth (deg) & Elevation (deg) to SVG (X, Y)
  const polarToSvg = (azDeg: number, elDeg: number) => {
    const clampEl = Math.max(-15, Math.min(90, elDeg));
    const r = RADIUS * (1 - clampEl / 90);
    const thetaRad = ((azDeg - 90) * Math.PI) / 180; // 0° N at top
    const x = CENTER + r * Math.cos(thetaRad);
    const y = CENTER + r * Math.sin(thetaRad);
    return { x, y };
  };

  const sunSvg = polarToSvg(sunPos.azDeg, sunPos.altDeg);
  const moonSvg = polarToSvg(moonPos.azDeg, moonPos.altDeg);

  // Group visible satellites by visibility classification
  const nakedEyeCount = visibleSats.filter((s) => s.isNakedEyeVisible).length;
  const sunlitCount = visibleSats.filter((s) => s.isAboveHorizon && s.isSunlit && !s.isNakedEyeVisible).length;

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0f1422]/90 p-4 sm:p-5 shadow-2xl flex flex-col items-center w-full font-sans">
      
      {/* Header & Controls Bar */}
      <div className="w-full flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Compass className="h-4 w-4 text-[#00e5ff]" />
            Polar Sky Dome &amp; Visual Horizon
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Topocentric 360° sky projection centered on <span className="text-[#00e5ff] font-bold">Zenith (90° Overhead)</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Label Declutter Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 p-0.5 rounded-lg">
            <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">LABELS:</span>
            {(["smart", "selected", "all"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setLabelDensity(mode)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${labelDensity === mode ? "bg-[#00e5ff] text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Quick Satellite Selector Dropdown */}
          <select
            value={selectedSatId || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onSelectSat(val);
            }}
            className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-white focus:outline-none focus:border-[#00e5ff] max-w-[180px]"
          >
            <option value="">Select Satellite on Dome...</option>
            {renderSats.slice(0, 30).map((s) => (
              <option key={`opt-${s.satId}`} value={s.satId}>
                {s.satName} ({s.elevationDeg > 0 ? `${s.elevationDeg}°` : "Approaching"})
              </option>
            ))}
          </select>

          {/* Toggle Approaching Satellites */}
          <button
            onClick={() => setShowApproaching(!showApproaching)}
            className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${showApproaching ? "bg-[#00e5ff]/15 border-[#00e5ff]/40 text-[#00e5ff]" : "bg-slate-900 border-slate-700 text-slate-400"}`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>{showApproaching ? "All Targets" : "Overhead Only"}</span>
          </button>
        </div>
      </div>

      {/* Visibility Badges */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-emerald-400" />
            {nakedEyeCount} Naked-Eye Visible
          </div>
          <div className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/70 border border-amber-500/40 text-amber-300">
            {sunlitCount} Sunlit Above Horizon
          </div>
        </div>

        <div className="text-slate-400 text-xs font-mono">
          Sky Objects Rendered: <span className="text-white font-bold">{renderSats.length}</span>
        </div>
      </div>

      {/* Responsive SVG Polar Plot Chart Container */}
      <div className="relative w-full max-w-[480px] aspect-square flex items-center justify-center my-2 select-none">
        <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="w-full h-full drop-shadow-[0_0_25px_rgba(0,0,0,0.9)]">
          {/* Background Radial Gradient */}
          <defs>
            <radialGradient id="skyGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0a1226" />
              <stop offset="70%" stopColor="#080a14" />
              <stop offset="100%" stopColor="#020308" />
            </radialGradient>
          </defs>

          {/* Main Sky Horizon Disc (0° Elevation Boundary) */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#skyGrad)" stroke="#1e293b" strokeWidth="2.5" />

          {/* Elevation Rings (30°, 60°, 10° Observability Cutoff) */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS * (1 - 30 / 90)} fill="none" stroke="#1e293b" strokeDasharray="3 3" />
          <circle cx={CENTER} cy={CENTER} r={RADIUS * (1 - 60 / 90)} fill="none" stroke="#1e293b" strokeDasharray="3 3" />
          {/* 10° Astronomical Cutoff Ring */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS * (1 - 10 / 90)} fill="none" stroke="#00e5ff" strokeOpacity="0.3" strokeDasharray="4 4" />

          {/* Ring Elevation Labels */}
          <text x={CENTER + 6} y={CENTER - RADIUS * (1 - 30 / 90) + 12} fill="#64748b" fontSize="10" fontFamily="monospace">30°</text>
          <text x={CENTER + 6} y={CENTER - RADIUS * (1 - 60 / 90) + 12} fill="#64748b" fontSize="10" fontFamily="monospace">60°</text>

          {/* Crosshairs & Compass Rays */}
          <line x1={CENTER} y1={CENTER - RADIUS} x2={CENTER} y2={CENTER + RADIUS} stroke="#1e293b" strokeWidth="1.5" />
          <line x1={CENTER - RADIUS} y1={CENTER} x2={CENTER + RADIUS} y2={CENTER} stroke="#1e293b" strokeWidth="1.5" />
          <line x1={CENTER - RADIUS * 0.707} y1={CENTER - RADIUS * 0.707} x2={CENTER + RADIUS * 0.707} y2={CENTER + RADIUS * 0.707} stroke="#0f172a" strokeWidth="1" strokeDasharray="2 2" />
          <line x1={CENTER - RADIUS * 0.707} y1={CENTER + RADIUS * 0.707} x2={CENTER + RADIUS * 0.707} y2={CENTER - RADIUS * 0.707} stroke="#0f172a" strokeWidth="1" strokeDasharray="2 2" />

          {/* Compass Cardinal Points */}
          <text x={CENTER} y={CENTER - RADIUS - 12} fill="#00e5ff" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="monospace">N (0°)</text>
          <text x={CENTER + RADIUS + 20} y={CENTER + 5} fill="#64748b" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">E (90°)</text>
          <text x={CENTER} y={CENTER + RADIUS + 22} fill="#64748b" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">S (180°)</text>
          <text x={CENTER - RADIUS - 20} y={CENTER + 5} fill="#64748b" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">W (270°)</text>

          {/* Sun Icon Position */}
          {sunPos.altDeg > -20 && (
            <g transform={`translate(${sunSvg.x}, ${sunSvg.y})`}>
              <circle r="10" fill="#f59e0b" fillOpacity="0.3" />
              <circle r="5.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
              <text y="16" fill="#f59e0b" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">Sun</text>
            </g>
          )}

          {/* Moon Icon Position */}
          {moonPos.altDeg > -10 && (
            <g transform={`translate(${moonSvg.x}, ${moonSvg.y})`}>
              <circle r="8" fill="#94a3b8" fillOpacity="0.4" />
              <circle r="5" fill="#e2e8f0" />
              <text y="16" fill="#cbd5e1" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">Moon</text>
            </g>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* OBSERVER LOCATION PIN MARKER (ZENITH 90° OVERHEAD AT CENTER)  */}
          {/* ───────────────────────────────────────────────────────────── */}
          <g
            className="cursor-pointer"
            onClick={() => setShowObserverTooltip(!showObserverTooltip)}
            onMouseEnter={() => setShowObserverTooltip(true)}
            onMouseLeave={() => setShowObserverTooltip(false)}
          >
            {/* Observer Location Radar Pulse Rings */}
            <circle cx={CENTER} cy={CENTER} r="16" fill="none" stroke="#00e5ff" strokeWidth="1.5" className="animate-ping opacity-50" />
            <circle cx={CENTER} cy={CENTER} r="9" fill="#00e5ff" fillOpacity="0.25" stroke="#00e5ff" strokeWidth="1.5" />
            <circle cx={CENTER} cy={CENTER} r="4" fill="#ffffff" stroke="#00e5ff" strokeWidth="2" />

            {/* Zenith & Observer Label */}
            <text x={CENTER} y={CENTER - 14} fill="#00e5ff" fontSize="16" fontWeight="bold" textAnchor="middle" className="font-mono">
              🧍 ({observer.name.split(",")[0]})
            </text>
            <text x={CENTER} y={CENTER + 18} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-mono opacity-80">
              Zenith 90°
            </text>
          </g>

          {/* Render Satellite Markers (Lightweight, 60fps optimized) */}
          {renderSats.map((sat) => {
            const { x, y } = polarToSvg(sat.azimuthDeg, sat.elevationDeg);
            const isSelected = selectedSatId === sat.satId;
            const isApproaching = sat.elevationDeg <= 0;
            const isHovered = hoveredSatId === sat.satId;
            const shouldShowLabel = labeledSatIds.has(sat.satId);

            // Color coding logic
            let fill = isApproaching ? "#475569" : "#64748b";
            let size = isApproaching ? 3.5 : 4.5;

            if (sat.isNakedEyeVisible) {
              fill = "#00e5ff";
              size = 6;
            } else if (sat.isAboveHorizon && sat.isSunlit) {
              fill = "#f59e0b";
              size = 5;
            }

            const finalSize = isHovered || isSelected ? size + 2.5 : size;

            return (
              <g
                key={sat.satId}
                className="cursor-pointer"
                onClick={() => onSelectSat(sat.satId)}
                onMouseEnter={() => setHoveredSatId(sat.satId)}
                onMouseLeave={() => setHoveredSatId(null)}
              >
                {/* Touch / Mouse Hit Area */}
                <circle cx={x} cy={y} r="12" fill="transparent" />

                {/* Selection & Hover Ring */}
                {(isSelected || isHovered) && (
                  <circle cx={x} cy={y} r={finalSize + 4} fill="none" stroke={isHovered ? "#00e5ff" : "#ffffff"} strokeWidth="2" />
                )}

                {/* Satellite Dot Marker */}
                <circle
                  cx={x}
                  cy={y}
                  r={finalSize}
                  fill={fill}
                  stroke={isSelected || isHovered ? "#ffffff" : "rgba(0,0,0,0.5)"}
                  strokeWidth={1}
                />

                {/* Decluttered Satellite Name Tag */}
                {shouldShowLabel && (
                  <text
                    x={x}
                    y={y - (finalSize + 4)}
                    fill={isSelected || isHovered ? "#ffffff" : sat.isNakedEyeVisible ? "#00e5ff" : "#cbd5e1"}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none font-mono select-none"
                  >
                    {sat.satName.substring(0, 12)} ({sat.elevationDeg > 0 ? `${sat.elevationDeg}°` : "Appr."})
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Observer Location Pin Hover/Click Popup Tooltip */}
        {showObserverTooltip && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/95 border border-[#00e5ff] rounded-xl p-3.5 shadow-2xl text-xs font-mono text-slate-200 z-40 max-w-xs space-y-1 text-center select-text">
            <div className="font-bold text-[#00e5ff] flex items-center justify-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#00e5ff]" />
              <span>Observer Observation Point</span>
            </div>
            <div className="text-white font-bold mt-1">{observer.name}</div>
            <div className="text-[#00e5ff] text-[11px]">
              {observer.lat.toFixed(4)}°N, {observer.lon.toFixed(4)}°E ({observer.altMeters}m ASL)
            </div>
            <div className="text-slate-400 text-[10px] pt-1 border-t border-slate-800">
              Zenith 90° directly overhead. Real-time satellite tracking origin.
            </div>
          </div>
        )}

        {/* Hover Telemetry Card */}
        {hoveredSat && (
          <div className="absolute top-3 right-3 pointer-events-none bg-slate-950/95 border border-[#00e5ff]/60 rounded-xl p-3 shadow-2xl text-xs font-mono text-slate-200 z-30 min-w-[200px] max-w-xs space-y-1 backdrop-blur-md">
            <div className="font-bold text-[#00e5ff] flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
              <span className="truncate max-w-[130px]">{hoveredSat.satName}</span>
              <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] shrink-0">
                NORAD {hoveredSat.satId}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Status:</span>
              <span className={hoveredSat.isNakedEyeVisible ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                {hoveredSat.statusLabel}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Est. Mag:</span>
              <span className="text-white font-bold">
                {hoveredSat.estimatedMagnitude > 0 ? `+${hoveredSat.estimatedMagnitude}` : hoveredSat.estimatedMagnitude} mᵥ
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Elevation / Azimuth:</span>
              <span className="text-white font-bold">{hoveredSat.elevationDeg}° | {hoveredSat.azimuthDeg}°</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Slant Range:</span>
              <span className="text-[#00e5ff] font-bold">{hoveredSat.slantRangeKm} km</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Legend Bar */}
      <div className="w-full flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 pt-3 border-t border-slate-800/80 mt-1 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
          <span>Naked-Eye Visible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
          <span>Sunlit Above Horizon</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-slate-500" />
          <span>Approaching / Eclipsed</span>
        </div>
      </div>
    </div>
  );
}

export default memo(SkyDomeChart);
