"use client";

import { useMemo } from "react";

interface Point {
  lat: number;
  lng: number;
}

interface WorldMapProps {
  latitude: number;
  longitude: number;
  groundTrack: Point[];
  satelliteName: string;
}

// Simplified continent polygons for equirectangular projection (centered at 0 longitude)
// Coords are in [longitude, latitude] matching normalized [x = lng + 180, y = 90 - lat]
const CONTINENTS = [
  // North America
  [
    [-168, 65], [-120, 70], [-80, 75], [-60, 60], [-50, 50],
    [-70, 20], [-90, 15], [-100, 20], [-105, 30], [-125, 48],
    [-160, 60]
  ],
  // South America
  [
    [-80, 10], [-40, -5], [-35, -7], [-40, -20], [-60, -45],
    [-70, -55], [-75, -45], [-72, -20], [-80, -5], [-82, 5]
  ],
  // Greenland
  [
    [-60, 80], [-30, 75], [-40, 60], [-55, 65], [-60, 75]
  ],
  // Eurasia
  [
    [-15, 35], [20, 35], [30, 30], [33, 15], [45, 12],
    [50, 25], [75, 10], [90, 20], [105, 10], [120, 25],
    [130, 35], [140, 50], [170, 65], [170, 75], [90, 75],
    [20, 70], [-10, 60], [-10, 40]
  ],
  // Africa
  [
    [-15, 30], [30, 30], [50, 10], [45, -20], [35, -34],
    [20, -34], [10, 5], [-15, 15]
  ],
  // Australia
  [
    [113, -25], [143, -20], [150, -33], [140, -38], [115, -35]
  ],
  // Antarctica
  [
    [-180, -75], [180, -75], [180, -85], [-180, -85]
  ]
];

export function WorldMap({ latitude, longitude, groundTrack, satelliteName }: WorldMapProps) {
  // Convert coordinate points to SVG viewBox projection (0,0 to 360,180)
  const projectionPoints = useMemo(() => {
    return CONTINENTS.map((polygon) =>
      polygon
        .map(([lng, lat]) => {
          const x = lng + 180;
          const y = 90 - lat;
          return `${x},${y}`;
        })
        .join(" ")
    );
  }, []);

  // Split orbit track points into separate segments at international date line wrap-around
  const trackSegments = useMemo(() => {
    const segments: Array<Array<{ x: number; y: number }>> = [];
    if (groundTrack.length === 0) return segments;

    let currentSegment: Array<{ x: number; y: number }> = [];

    for (let idx = 0; idx < groundTrack.length; idx++) {
      const pt = groundTrack[idx];
      const x = pt.lng + 180;
      const y = 90 - pt.lat;

      if (currentSegment.length > 0) {
        const prevPt = groundTrack[idx - 1];
        // If longitude wraps around the edge of the flat map (e.g. from 180 to -180)
        const diffLng = Math.abs(pt.lng - prevPt.lng);
        if (diffLng > 180) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }
      currentSegment.push({ x, y });
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  }, [groundTrack]);

  // Current satellite coordinates in projection
  const satX = longitude + 180;
  const satY = 90 - latitude;

  return (
    <div className="relative w-full overflow-hidden rounded-[1rem] border border-white/10 bg-cosmos-black/60 p-1 backdrop-blur-md">
      {/* Map Control Title Overlay */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 rounded-full bg-ai animate-ping" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ai">
          Live Tracking Radar
        </span>
      </div>

      <div className="absolute right-4 top-4 z-20 hidden md:block">
        <span className="font-mono text-[9px] text-cosmos-slate uppercase tracking-wider">
          FOV: LEO Equirectangular Projection
        </span>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 360 180"
        className="w-full h-auto select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Grid lines (Latitude / Longitude) every 30 degrees */}
        <g stroke="rgba(103, 232, 249, 0.04)" strokeWidth="0.4" strokeDasharray="2,2">
          {/* Vertical grid lines */}
          {Array.from({ length: 11 }).map((_, i) => {
            const x = (i + 1) * 30;
            return <line key={`vline-${i}`} x1={x} y1={0} x2={x} y2={180} />;
          })}
          {/* Horizontal grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = (i + 1) * 30;
            return <line key={`hline-${i}`} x1={0} y1={y} x2={360} y2={y} />;
          })}
        </g>

        {/* Central equator & Prime meridian reference */}
        <line
          x1={0}
          y1={90}
          x2={360}
          y2={90}
          stroke="rgba(103, 232, 249, 0.12)"
          strokeWidth="0.5"
        />
        <line
          x1={180}
          y1={0}
          x2={180}
          y2={180}
          stroke="rgba(103, 232, 249, 0.12)"
          strokeWidth="0.5"
        />

        {/* Landmass Outlines */}
        <g fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.09)" strokeWidth="0.6">
          {projectionPoints.map((points, idx) => (
            <polygon key={`land-${idx}`} points={points} className="transition-all duration-300" />
          ))}
        </g>

        {/* Projected Orbit Ground Track Path */}
        {trackSegments.map((segment, idx) => (
          <polyline
            key={`track-${idx}`}
            points={segment.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(103, 232, 249, 0.45)"
            strokeWidth="0.85"
            strokeDasharray="3,2.5"
            className="drop-shadow-[0_0_2px_rgba(103,232,249,0.5)]"
          />
        ))}

        {/* Satellite Ground Footprint Circle (Approx. FOV) */}
        {satX >= 0 && satY >= 0 && (
          <circle
            cx={satX}
            cy={satY}
            r={24}
            fill="rgba(103, 232, 249, 0.045)"
            stroke="rgba(103, 232, 249, 0.15)"
            strokeWidth="0.4"
            className="transition-all duration-300"
          />
        )}

        {/* Current Satellite Tracker Dot & Pulses */}
        {satX >= 0 && satY >= 0 && (
          <g className="cursor-pointer">
            {/* Blinking outer radar ring */}
            <circle
              cx={satX}
              cy={satY}
              r={5}
              fill="none"
              stroke="rgba(103, 232, 249, 0.8)"
              strokeWidth="0.5"
            >
              <animate
                attributeName="r"
                values="2;8;2"
                dur="2.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.9;0.1;0.9"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Inner solid tracking core */}
            <circle
              cx={satX}
              cy={satY}
              r={1.8}
              fill="#00E5FF"
              className="drop-shadow-[0_0_4px_#00E5FF]"
            />

            {/* Floating text label overlay for LEO */}
            <text
              x={satX + 4}
              y={satY - 4}
              fill="#00E5FF"
              fontSize="4.5"
              fontFamily="monospace"
              fontWeight="bold"
              className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            >
              {satelliteName}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
