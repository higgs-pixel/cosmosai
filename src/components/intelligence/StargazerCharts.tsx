"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { SatellitePass, SatellitePassPoint, getLocalTimezoneInfo } from "./PassPredictor";
import {
  Sparkles, Activity, Clock, Compass, Eye, Zap, Navigation, ArrowUpRight, ArrowDownRight, RefreshCw, Play, Pause
} from "lucide-react";

interface StargazerChartsProps {
  pass: SatellitePass;
}

export default function StargazerCharts({ pass }: StargazerChartsProps) {
  const [hoveredPt, setHoveredPt] = useState<SatellitePassPoint | null>(null);
  const [tzCode, setTzCode] = useState("IST");
  const [isScanning, setIsScanning] = useState(true);
  const [scanIdx, setScanIdx] = useState(0);

  useEffect(() => {
    setTzCode(getLocalTimezoneInfo().code);
  }, []);

  const points = pass?.points || [];
  const numPts = points.length;

  // Auto animation scanner line
  useEffect(() => {
    if (!isScanning || numPts === 0) return;
    const interval = setInterval(() => {
      setScanIdx((prev) => (prev + 1) % numPts);
    }, 250);
    return () => clearInterval(interval);
  }, [isScanning, numPts]);

  // Find Key Milestones: Peak Zenith (Max Elevation), Rise (AOS), Set (LOS)
  const zenithPt = useMemo(() => {
    if (numPts === 0) return null;
    let max = points[0];
    for (const p of points) {
      if (p.elevationDeg > max.elevationDeg) max = p;
    }
    return max;
  }, [points, numPts]);

  const peakVmagPt = useMemo(() => {
    if (numPts === 0) return null;
    let brightest = points[0];
    for (const p of points) {
      if (p.vmag < brightest.vmag) brightest = p;
    }
    return brightest;
  }, [points, numPts]);

  const risePt = points[0] || null;
  const setPt = points[numPts - 1] || null;

  if (!pass || !points || numPts === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs border border-slate-800 rounded-2xl bg-slate-950/40">
        Select an upcoming satellite pass to view modern interactive trajectory &amp; optical stargazer charts.
      </div>
    );
  }

  // Active point selected by hover or scanner animation
  const activePt = hoveredPt || points[scanIdx] || points[Math.floor(numPts / 2)];

  // Ranges
  const minEl = 0;
  const maxEl = 90;
  const minVmag = Math.min(...points.map((p) => p.vmag));
  const maxVmag = Math.max(...points.map((p) => p.vmag));

  // SVG dimensions
  const svgWidth = 850;
  const svgHeight = 260;
  const padLeft = 60;
  const padRight = 60;
  const padTop = 35;
  const padBottom = 45;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getX = (idx: number) => padLeft + (idx / Math.max(1, numPts - 1)) * chartW;

  // Elevation Arc SVG path
  const elPathPoints = points.map((p, i) => {
    const x = getX(i);
    const normEl = p.elevationDeg / 90;
    const y = padTop + chartH - normEl * chartH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const elPolyline = elPathPoints.join(" ");
  const elAreaPath = `M ${padLeft},${padTop + chartH} L ${elPathPoints.join(" L ")} L ${padLeft + chartW},${padTop + chartH} Z`;

  // Vmag Inverted path
  const vmagPathPoints = points.map((p, i) => {
    const x = getX(i);
    const normVmag = (maxVmag - p.vmag) / Math.max(0.1, maxVmag - minVmag);
    const y = padTop + chartH - normVmag * chartH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const vmagPolyline = vmagPathPoints.join(" ");

  // Zenith X and Y
  const zenithIdx = zenithPt ? points.findIndex((p) => p.timeMs === zenithPt.timeMs) : -1;
  const zenithX = zenithIdx >= 0 ? getX(zenithIdx) : padLeft + chartW / 2;
  const zenithY = zenithPt ? padTop + chartH - (zenithPt.elevationDeg / 90) * chartH : padTop;

  // Scanner X
  const activeIdx = activePt ? points.findIndex((p) => p.timeMs === activePt.timeMs) : -1;
  const activeX = activeIdx >= 0 ? getX(activeIdx) : padLeft;

  // Arrival Countdown string
  const minsToArrival = pass.minsFromNow;
  const arrivalStatus =
    minsToArrival <= 0 ? "OVERHEAD NOW" : minsToArrival < 60 ? `Arrives in ${minsToArrival} mins` : `Arrives in ${(minsToArrival / 60).toFixed(1)} hrs`;

  return (
    <div className="flex flex-col gap-5 w-full">
      
      {/* 1. Stargazer Key Milestones Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Arrival & Zenith Peak */}
        <div className="relative rounded-2xl border border-slate-800 bg-[#0b0f19]/90 p-4 shadow-xl overflow-hidden group hover:border-[#00e5ff]/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#00e5ff]/5 rounded-full blur-2xl group-hover:bg-[#00e5ff]/15 transition" />
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-[#00e5ff]" />
              Zenith Peak Arrival
            </span>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30">
              {arrivalStatus}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {zenithPt ? zenithPt.elevationDeg : pass.maxElevationDeg}°
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">Max Zenith Angle</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-[#00e5ff]">
                {zenithPt ? zenithPt.timeLabel : pass.startTimeMs} {tzCode}
              </span>
              <span className="text-[9px] text-slate-400 block font-mono">Peak Time</span>
            </div>
          </div>
        </div>

        {/* Card 2: Peak Visual Brightness */}
        <div className="relative rounded-2xl border border-slate-800 bg-[#0b0f19]/90 p-4 shadow-xl overflow-hidden group hover:border-[#ff3366]/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff3366]/5 rounded-full blur-2xl group-hover:bg-[#ff3366]/15 transition" />
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#ff3366]" />
              Peak Visual Magnitude
            </span>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${pass.isVisibleToEye ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-slate-800 text-slate-400"}`}>
              {pass.isVisibleToEye ? "Naked Eye" : "Telescope / Optical"}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">Apparent Magnitude ($V_{`mag`}$)</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-white">
                {peakVmagPt ? peakVmagPt.timeLabel : ""} {tzCode}
              </span>
              <span className="text-[9px] text-slate-400 block font-mono">Max Brightness</span>
            </div>
          </div>
        </div>

        {/* Card 3: Rise Trajectory (AOS) */}
        <div className="relative rounded-2xl border border-slate-800 bg-[#0b0f19]/90 p-4 shadow-xl overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
              Horizon Rise (AOS)
            </span>
            <span className="text-[9px] font-mono text-emerald-400 font-bold">
              {risePt ? `${risePt.azimuthDeg}°` : ""}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold font-mono text-white">
                {new Date(pass.startTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">AOS Start Time ({tzCode})</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400">
                {pass.riseAzimuthDeg}° {pass.riseAzimuthDeg > 180 ? "WSW" : "ENE"}
              </span>
              <span className="text-[9px] text-slate-400 block font-mono">Rise Direction</span>
            </div>
          </div>
        </div>

        {/* Card 4: Set Trajectory (LOS) */}
        <div className="relative rounded-2xl border border-slate-800 bg-[#0b0f19]/90 p-4 shadow-xl overflow-hidden group hover:border-purple-500/50 transition">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ArrowDownRight className="h-3.5 w-3.5 text-purple-400" />
              Horizon Set (LOS)
            </span>
            <span className="text-[9px] font-mono text-purple-400 font-bold">
              {setPt ? `${setPt.azimuthDeg}°` : ""}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold font-mono text-white">
                {new Date(pass.endTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">LOS End Time ({tzCode})</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-purple-400">
                {pass.setAzimuthDeg}° {pass.setAzimuthDeg > 180 ? "SSW" : "NNE"}
              </span>
              <span className="text-[9px] text-slate-400 block font-mono">Set Direction</span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Modern Animated Stargazer Trajectory & Visual Magnitude Chart */}
      <div className="relative rounded-2xl border border-slate-800 bg-[#070a14] p-5 shadow-2xl overflow-hidden">
        
        {/* Top Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff]">
              <Activity className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                Stargazer Trajectory &amp; Magnitude Profile Arc
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Interactive real-time SGP4 horizon arc projection with peak magnitude callouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] font-mono bg-slate-950/80 border border-slate-850 px-3 py-1.5 rounded-xl">
              <span className="flex items-center gap-1.5 text-[#00e5ff]">
                <span className="h-2 w-2 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" /> Elevation Dome (°)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" /> Magnitude ($V_{`mag`}$)
              </span>
            </div>

            {/* Scanner toggle */}
            <button
              onClick={() => setIsScanning(!isScanning)}
              className={`flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-mono font-bold transition ${
                isScanning
                  ? "border-[#00e5ff]/50 bg-[#00e5ff]/15 text-[#00e5ff]"
                  : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {isScanning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isScanning ? "Scanner: LIVE" : "Scanner: PAUSED"}
            </button>
          </div>
        </div>

        {/* Live Cursor Telemetry Readout Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3 rounded-xl border border-slate-850 bg-slate-950/80 mb-4 font-mono">
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Time ({tzCode})</span>
            <span className="text-xs font-bold text-white block mt-0.5">{activePt.timeLabel}</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Elevation Arc</span>
            <span className="text-xs font-bold text-[#00e5ff] block mt-0.5">{activePt.elevationDeg}°</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Azimuth Bearing</span>
            <span className="text-xs font-bold text-amber-400 block mt-0.5">{activePt.azimuthDeg}°</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Slant Range</span>
            <span className="text-xs font-bold text-white block mt-0.5">{Math.round(activePt.slantRangeKm)} km</span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Apparent Vmag</span>
            <span className={`text-xs font-bold block mt-0.5 ${activePt.vmag < 4.0 ? "text-emerald-400" : "text-purple-400"}`}>
              {activePt.vmag > 0 ? `+${activePt.vmag}` : activePt.vmag} mag
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Visibility Status</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded block mt-0.5 text-center ${
              activePt.isVisible ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-slate-800 text-slate-400"
            }`}>
              {activePt.isVisible ? "Visible to Eye" : "Low / Shadow"}
            </span>
          </div>
        </div>

        {/* Animated SVG Chart Area */}
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[650px]">
            <defs>
              {/* Elevation Area Gradient */}
              <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#00e5ff" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
              </linearGradient>
              
              {/* Stroke Glow Filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid Horizontal Lines & Y-axis labels */}
            {[0, 30, 60, 90].map((el) => {
              const y = padTop + chartH * (1 - el / 90);
              return (
                <g key={el}>
                  <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                  <text x={padLeft - 10} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                    {el}°
                  </text>
                </g>
              );
            })}

            {/* Vmag Y-axis labels on right */}
            {[minVmag, (minVmag + maxVmag) / 2, maxVmag].map((v, idx) => {
              const y = padTop + (idx / 2) * chartH;
              return (
                <text key={idx} x={padLeft + chartW + 10} y={y + 3} fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="start">
                  +{v.toFixed(1)} mag
                </text>
              );
            })}

            {/* Gradient Fill under Elevation Arc */}
            <path d={elAreaPath} fill="url(#elevationGrad)" />

            {/* Elevation Curve Line */}
            <polyline fill="none" stroke="#00e5ff" strokeWidth="3" filter="url(#glow)" points={elPolyline} />

            {/* Visual Magnitude Curve Line */}
            <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="5,3" points={vmagPolyline} />

            {/* Zenith Peak Highlight Marker */}
            {zenithPt && (
              <g>
                <circle cx={zenithX} cy={zenithY} r="7" fill="#00e5ff" className="animate-ping opacity-75" />
                <circle cx={zenithX} cy={zenithY} r="5" fill="#00e5ff" stroke="#ffffff" strokeWidth="2" />
                <line x1={zenithX} y1={zenithY - 10} x2={zenithX} y2={padTop + 5} stroke="#00e5ff" strokeDasharray="2,2" />
                <rect
                  x={zenithX - 55}
                  y={padTop - 20}
                  width="110"
                  height="18"
                  rx="4"
                  fill="#0c1322"
                  stroke="#00e5ff"
                  strokeWidth="1"
                />
                <text
                  x={zenithX}
                  y={padTop - 8}
                  fill="#00e5ff"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ZENITH PEAK {zenithPt.elevationDeg}°
                </text>
              </g>
            )}

            {/* Time X-Axis Markers */}
            {points.map((p, i) => {
              if (i % Math.ceil(numPts / 6) === 0 || i === numPts - 1) {
                const x = getX(i);
                return (
                  <g key={i}>
                    <line x1={x} y1={padTop + chartH} x2={x} y2={padTop + chartH + 6} stroke="#475569" />
                    <text x={x} y={padTop + chartH + 20} fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                      {p.timeLabel}
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* Live Interactive Animated Scanner Bar */}
            <line
              x1={activeX}
              y1={padTop}
              x2={activeX}
              y2={padTop + chartH}
              stroke="#ff3366"
              strokeWidth="2"
              strokeDasharray="4,2"
              className="animate-pulse"
            />
            <circle cx={activeX} cy={padTop + chartH - (activePt.elevationDeg / 90) * chartH} r="6" fill="#ff3366" stroke="#ffffff" strokeWidth="2" />

            {/* Transparent Hover Hit Areas */}
            {points.map((p, i) => {
              const x = getX(i);
              return (
                <rect
                  key={i}
                  x={x - chartW / (numPts * 2)}
                  y={padTop}
                  width={chartW / numPts}
                  height={chartH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredPt(p);
                    setIsScanning(false);
                  }}
                />
              );
            })}
          </svg>
        </div>

      </div>

    </div>
  );
}
