"use client";

import { useState, useMemo, memo } from "react";
import { getPosition as getSunPosition, getMoonPosition } from "suncalc";
import { SatelliteVisibilityResult, ObserverTwilightInfo } from "@/lib/orbit/visibility";
import { Compass, Eye, MapPin, Target, Layers } from "lucide-react";

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
  const RADIUS = 200; // Outer horizon radius (0° elevation) cleanly centered in 520x520 box

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
    <div className="h-full border border-zinc-850 bg-black p-5 flex flex-col justify-between font-sans">
      {/* Header & Controls Bar */}
      <div className="w-full flex flex-col gap-3 border-b border-zinc-900 pb-3 mb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#00e5ff] font-bold">
              Viewport 01 // Polar Horizon Dome
            </div>
            <h2 className="text-base font-bold uppercase tracking-tight text-white flex items-center gap-2 mt-0.5">
              <Compass className="h-4 w-4 text-[#00e5ff]" />
              <span>360° Overhead Polar Horizon</span>
            </h2>
          </div>
          <div className="text-[10px] font-semibold text-zinc-400 border border-zinc-800 bg-zinc-950 px-2.5 py-1 uppercase tracking-wider">
            Zenith 90°
          </div>
        </div>

        {/* Minimal Editorial HUD Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {/* Label Declutter Mode Selector */}
            <div className="flex items-center border border-zinc-800 bg-zinc-950 p-0.5">
              <span className="text-[9px] text-zinc-500 px-1.5 uppercase font-bold tracking-wider">LABELS</span>
              {(["smart", "selected", "all"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLabelDensity(mode)}
                  className={`px-2 py-0.5 text-[9px] uppercase font-bold transition cursor-pointer ${
                    labelDensity === mode
                      ? "bg-white text-black font-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
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
              className="h-6 border border-zinc-800 bg-zinc-950 px-2 text-[11px] font-sans font-medium text-white focus:outline-none focus:border-zinc-500 max-w-[150px] cursor-pointer"
            >
              <option value="">Select Target...</option>
              {renderSats.slice(0, 30).map((s) => (
                <option key={`opt-${s.satId}`} value={s.satId}>
                  {s.satName} ({s.elevationDeg > 0 ? `${s.elevationDeg}°` : "Appr."})
                </option>
              ))}
            </select>
          </div>

          {/* Counts & Overheads */}
          <div className="flex items-center gap-2 text-[10px] font-sans">
            <span className="px-2 py-0.5 border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 font-semibold flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {nakedEyeCount} Naked-Eye
            </span>
            <span className="px-2 py-0.5 border border-amber-500/30 bg-amber-950/20 text-amber-400 font-semibold">
              {sunlitCount} Sunlit
            </span>
            <button
              onClick={() => setShowApproaching(!showApproaching)}
              className={`px-2 py-0.5 border font-semibold transition flex items-center gap-1 cursor-pointer uppercase ${
                showApproaching
                  ? "bg-white text-black border-white font-bold"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <Target className="h-3 w-3" />
              <span>{showApproaching ? "All" : "Overhead"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Polar SVG Plot Chart Container */}
      <div className="flex-1 min-h-0 w-full overflow-hidden bg-zinc-950/90 relative border border-zinc-900 flex items-center justify-center p-3 my-auto">
        <div className="relative w-full max-w-[430px] h-full max-h-[430px] aspect-square flex items-center justify-center select-none mx-auto my-auto">
          <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="w-full h-full max-w-full max-h-full">
            {/* Background Radial Gradient */}
            <defs>
              <radialGradient id="skyGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#09090b" />
                <stop offset="70%" stopColor="#040406" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
            </defs>

            {/* Main Sky Horizon Disc (0° Elevation Boundary) */}
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#skyGrad)" stroke="#27272a" strokeWidth="1.5" />

            {/* Elevation Rings (30°, 60°, 10° Observability Cutoff) */}
            <circle cx={CENTER} cy={CENTER} r={RADIUS * (1 - 30 / 90)} fill="none" stroke="#27272a" strokeDasharray="3 3" />
            <circle cx={CENTER} cy={CENTER} r={RADIUS * (1 - 60 / 90)} fill="none" stroke="#27272a" strokeDasharray="3 3" />
            <circle cx={CENTER} cy={CENTER} r={RADIUS * (1 - 10 / 90)} fill="none" stroke="#00e5ff" strokeOpacity="0.25" strokeDasharray="4 4" />

            {/* Ring Elevation Labels */}
            <text x={CENTER + 6} y={CENTER - RADIUS * (1 - 30 / 90) + 12} fill="#71717a" fontSize="10" fontFamily="sans-serif">30°</text>
            <text x={CENTER + 6} y={CENTER - RADIUS * (1 - 60 / 90) + 12} fill="#71717a" fontSize="10" fontFamily="sans-serif">60°</text>

            {/* Crosshairs & Compass Rays */}
            <line x1={CENTER} y1={CENTER - RADIUS} x2={CENTER} y2={CENTER + RADIUS} stroke="#27272a" strokeWidth="1" />
            <line x1={CENTER - RADIUS} y1={CENTER} x2={CENTER + RADIUS} y2={CENTER} stroke="#27272a" strokeWidth="1" />
            <line x1={CENTER - RADIUS * 0.707} y1={CENTER - RADIUS * 0.707} x2={CENTER + RADIUS * 0.707} y2={CENTER + RADIUS * 0.707} stroke="#18181b" strokeWidth="1" strokeDasharray="2 2" />
            <line x1={CENTER - RADIUS * 0.707} y1={CENTER + RADIUS * 0.707} x2={CENTER + RADIUS * 0.707} y2={CENTER - RADIUS * 0.707} stroke="#18181b" strokeWidth="1" strokeDasharray="2 2" />

            {/* Compass Cardinal Points */}
            <text x={CENTER} y={CENTER - RADIUS - 10} fill="#00e5ff" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">N</text>
            <text x={CENTER + RADIUS + 18} y={CENTER + 4} fill="#a1a1aa" fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">E</text>
            <text x={CENTER} y={CENTER + RADIUS + 20} fill="#a1a1aa" fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">S</text>
            <text x={CENTER - RADIUS - 18} y={CENTER + 4} fill="#a1a1aa" fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">W</text>

            {/* Sun Icon Position */}
            {sunPos.altDeg > -20 && (
              <g transform={`translate(${sunSvg.x}, ${sunSvg.y})`}>
                <circle r="10" fill="#f59e0b" fillOpacity="0.2" />
                <circle r="5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
                <text y="16" fill="#f59e0b" fontSize="9" textAnchor="middle" fontWeight="600" fontFamily="sans-serif">Sun</text>
              </g>
            )}

            {/* Moon Icon Position */}
            {moonPos.altDeg > -10 && (
              <g transform={`translate(${moonSvg.x}, ${moonSvg.y})`}>
                <circle r="8" fill="#94a3b8" fillOpacity="0.3" />
                <circle r="4.5" fill="#e2e8f0" />
                <text y="16" fill="#cbd5e1" fontSize="9" textAnchor="middle" fontWeight="600" fontFamily="sans-serif">Moon</text>
              </g>
            )}

            {/* Observer Location Pin Marker (Zenith 90° Overhead at Center) */}
            <g
              className="cursor-pointer"
              onClick={() => setShowObserverTooltip(!showObserverTooltip)}
              onMouseEnter={() => setShowObserverTooltip(true)}
              onMouseLeave={() => setShowObserverTooltip(false)}
            >
              <circle cx={CENTER} cy={CENTER} r="14" fill="none" stroke="#00e5ff" strokeWidth="1.5" className="animate-ping opacity-30" />
              <circle cx={CENTER} cy={CENTER} r="8" fill="#00e5ff" fillOpacity="0.2" stroke="#00e5ff" strokeWidth="1.5" />
              <circle cx={CENTER} cy={CENTER} r="3.5" fill="#ffffff" stroke="#00e5ff" strokeWidth="1.5" />

              <text x={CENTER} y={CENTER - 12} fill="#00e5ff" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
                ZENITH 90°
              </text>
              <text x={CENTER} y={CENTER + 16} fill="#a1a1aa" fontSize="9" fontWeight="500" textAnchor="middle" fontFamily="sans-serif">
                {observer.name.split(",")[0]}
              </text>
            </g>

            {/* Render Satellite Markers */}
            {renderSats.map((sat) => {
              const { x, y } = polarToSvg(sat.azimuthDeg, sat.elevationDeg);
              const isSelected = selectedSatId === sat.satId;
              const isApproaching = sat.elevationDeg <= 0;
              const isHovered = hoveredSatId === sat.satId;
              const shouldShowLabel = labeledSatIds.has(sat.satId);

              // Color coding logic
              let fill = isApproaching ? "#52525b" : "#a1a1aa";
              let size = isApproaching ? 3 : 4;

              if (sat.isNakedEyeVisible) {
                fill = "#00e5ff";
                size = 5.5;
              } else if (sat.isAboveHorizon && sat.isSunlit) {
                fill = "#f59e0b";
                size = 4.5;
              }

              const finalSize = isHovered || isSelected ? size + 2 : size;

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
                    <circle cx={x} cy={y} r={finalSize + 4} fill="none" stroke={isHovered ? "#00e5ff" : "#ffffff"} strokeWidth="1.5" />
                  )}

                  {/* Satellite Dot Marker */}
                  <circle
                    cx={x}
                    cy={y}
                    r={finalSize}
                    fill={fill}
                    stroke={isSelected || isHovered ? "#ffffff" : "rgba(0,0,0,0.6)"}
                    strokeWidth={1}
                  />

                  {/* Decluttered Satellite Name Tag */}
                  {shouldShowLabel && (
                    <text
                      x={x}
                      y={y - (finalSize + 4)}
                      fill={isSelected || isHovered ? "#ffffff" : sat.isNakedEyeVisible ? "#00e5ff" : "#e4e4e7"}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      fontFamily="sans-serif"
                    >
                      {sat.satName.substring(0, 12)} ({sat.elevationDeg > 0 ? `${sat.elevationDeg}°` : "Appr."})
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Observer Location Pin Popup Tooltip */}
          {showObserverTooltip && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/95 border border-zinc-700 p-3 shadow-2xl text-xs font-sans text-zinc-200 z-40 max-w-xs space-y-1 text-center select-text">
              <div className="font-bold text-[#00e5ff] flex items-center justify-center gap-1.5 uppercase tracking-wider text-[10px]">
                <MapPin className="h-3.5 w-3.5 text-[#00e5ff]" />
                <span>Observer Ground Station</span>
              </div>
              <div className="text-white font-bold mt-1 text-sm">{observer.name}</div>
              <div className="text-zinc-400 text-[11px]">
                {observer.lat.toFixed(4)}°N, {observer.lon.toFixed(4)}°E ({observer.altMeters}m ASL)
              </div>
              <div className="text-zinc-500 text-[10px] pt-1 border-t border-zinc-800">
                Zenith 90° directly overhead. Real-time satellite tracking origin.
              </div>
            </div>
          )}

          {/* Hover Telemetry Card */}
          {hoveredSat && (
            <div className="absolute top-3 right-3 pointer-events-none bg-black/95 border border-zinc-700 p-3 shadow-2xl text-xs font-sans text-zinc-200 z-30 min-w-[200px] max-w-xs space-y-1.5 backdrop-blur-md">
              <div className="font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-1 mb-1">
                <span className="truncate max-w-[130px]">{hoveredSat.satName}</span>
                <span className="text-zinc-300 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] shrink-0 font-medium">
                  NORAD {hoveredSat.satId}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Status:</span>
                <span className={hoveredSat.isNakedEyeVisible ? "text-emerald-400 font-bold" : "text-amber-400 font-semibold"}>
                  {hoveredSat.statusLabel}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Est. Mag:</span>
                <span className="text-white font-bold">
                  {hoveredSat.estimatedMagnitude > 0 ? `+${hoveredSat.estimatedMagnitude}` : hoveredSat.estimatedMagnitude} mᵥ
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Elevation / Azimuth:</span>
                <span className="text-white font-medium">{hoveredSat.elevationDeg}° | {hoveredSat.azimuthDeg}°</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Slant Range:</span>
                <span className="text-[#00e5ff] font-bold">{hoveredSat.slantRangeKm} km</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Legend Bar */}
      <div className="w-full flex flex-wrap items-center justify-center gap-5 text-[11px] text-zinc-400 pt-3 border-t border-zinc-900 mt-2 font-sans shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#00e5ff]" />
          <span>Naked-Eye</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
          <span>Sunlit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-600" />
          <span>Approaching</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white" />
          <span>Zenith Origin</span>
        </div>
      </div>
    </div>
  );
}

export default memo(SkyDomeChart);
