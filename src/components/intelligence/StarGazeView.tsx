"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Html, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Play,
  Pause,
  RotateCcw,
  Search,
  MapPin,
  Clock,
  Radio,
  Zap,
  ChevronRight,
  Target,
  Compass,
  Eye,
  Maximize2,
  Sliders,
  Sparkles,
  Calendar,
  BookOpen,
  X,
  Globe,
  Activity,
  Command,
  Cpu,
  Smartphone,
  QrCode,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { QRCodeSVG } from "@/lib/qr-generator";
import { ObserverCoords } from "./PassPredictor";
import {
  getAllSatelliteStates,
  computeSatelliteState,
  ComputedSatelliteSkyState,
  satAltAzToVector3,
  PassGraphPoint,
  ObserverViewingRequirements,
  parseTleText,
  computeObserverSunCoords,
} from "@/lib/astronomy/satellite-sky-math";
import { DEFAULT_SATELLITE_CATALOG } from "./defaultCatalog";
import { SatelliteData } from "./store";

const SKY_RADIUS = 280;

const PRESET_LOCATIONS: ObserverCoords[] = [
  { name: "Chennai, Tamil Nadu, India", lat: 13.0827, lon: 80.2707, altMeters: 10 },
  { name: "Mauna Kea Observatory, Hawaii", lat: 19.8207, lon: -155.4681, altMeters: 4207 },
  { name: "New York, USA", lat: 40.7128, lon: -74.006, altMeters: 10 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278, altMeters: 10 },
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503, altMeters: 10 },
  { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093, altMeters: 10 },
  { name: "Atacama Desert, Chile", lat: -23.8634, lon: -69.1328, altMeters: 2400 },
  { name: "Cairo, Egypt", lat: 30.0444, lon: 31.2357, altMeters: 10 },
];

function getCardinalText(azDeg: number): string {
  const norm = ((azDeg % 360) + 360) % 360;
  if (norm >= 337.5 || norm < 22.5) return `${Math.round(norm)}° N`;
  if (norm >= 22.5 && norm < 67.5) return `${Math.round(norm)}° NE`;
  if (norm >= 67.5 && norm < 112.5) return `${Math.round(norm)}° E`;
  if (norm >= 112.5 && norm < 157.5) return `${Math.round(norm)}° SE`;
  if (norm >= 157.5 && norm < 202.5) return `${Math.round(norm)}° S`;
  if (norm >= 202.5 && norm < 247.5) return `${Math.round(norm)}° SW`;
  if (norm >= 247.5 && norm < 292.5) return `${Math.round(norm)}° W`;
  return `${Math.round(norm)}° NW`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCIENTIFIC PRECISION OBSERVER GROUND STATION (EXACT QUATERNION SLERP)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// STELLARIUM MOBILE CAMERA SIGHT RETICLE (CELESTIAL SPHERE HUD TARGET)
// ─────────────────────────────────────────────────────────────────────────────
function MobileCameraSightReticle({
  mobileOrientation,
  satellites,
}: {
  mobileOrientation: { heading: number; pitch: number; roll?: number };
  satellites: ComputedSatelliteSkyState[];
}) {
  const r = SKY_RADIUS * 0.96; // 268.8
  const azRad = (mobileOrientation.heading * Math.PI) / 180;
  const elRad = (mobileOrientation.pitch * Math.PI) / 180;

  // Stellarium exact Cartesian unit vector transformation (North: -Z, East: +X, Up: +Y)
  const dirX = Math.cos(elRad) * Math.sin(azRad);
  const dirY = Math.sin(elRad);
  const dirZ = -Math.cos(elRad) * Math.cos(azRad);

  const pos = useMemo(() => new THREE.Vector3(dirX * r, dirY * r, dirZ * r), [dirX, dirY, dirZ, r]);
  const sightDir = useMemo(() => new THREE.Vector3(dirX, dirY, dirZ), [dirX, dirY, dirZ]);

  // Satellite Proximity Detection (Within 8 degrees of sight vector)
  const lockedSat = useMemo(() => {
    let closestSat: ComputedSatelliteSkyState | null = null;
    let minAngle = 0.14; // ~8 degrees in radians

    for (const sat of satellites) {
      if (!sat.isAboveHorizon) continue;
      const satDir = sat.vec3.clone().normalize();
      const angle = sightDir.angleTo(satDir);
      if (angle < minAngle) {
        minAngle = angle;
        closestSat = sat;
      }
    }
    return closestSat;
  }, [sightDir, satellites]);

  const cardinalText = getCardinalText(mobileOrientation.heading);

  return (
    <group position={pos.toArray()}>
      {/* Outer Rotating Cyan/Amber Sight Target Ring */}
      <mesh>
        <ringGeometry args={[4.5, 6.2, 32]} />
        <meshBasicMaterial color={lockedSat ? "#f59e0b" : "#06b6d4"} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Crosshair Alignment Lines */}
      <Line
        points={[new THREE.Vector3(-9, 0, 0), new THREE.Vector3(9, 0, 0)]}
        color={lockedSat ? "#f59e0b" : "#06b6d4"}
        lineWidth={2.2}
      />
      <Line
        points={[new THREE.Vector3(0, -9, 0), new THREE.Vector3(0, 9, 0)]}
        color={lockedSat ? "#f59e0b" : "#06b6d4"}
        lineWidth={2.2}
      />

      {/* Central Impact Dot */}
      <mesh>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color={lockedSat ? "#ffea00" : "#22d3ee"} />
      </mesh>

      {/* Floating HUD Information Badge */}
      <Html center position={[0, -9, 0]} className="pointer-events-none select-none">
        <div className="flex flex-col items-center gap-1">
          <div
            className={`px-3 py-1 rounded-xl text-[10px] font-mono font-black border backdrop-blur-xl shadow-2xl flex items-center gap-2 whitespace-nowrap ${
              lockedSat
                ? "bg-amber-950/95 border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.9)] animate-pulse"
                : "bg-slate-950/95 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.8)]"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>📱 CAMERA SIGHT: {mobileOrientation.heading}° ({cardinalText}) | {mobileOrientation.pitch}° EL</span>
          </div>

          {lockedSat && (
            <div className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-200 text-[9px] font-mono font-extrabold shadow-lg animate-bounce">
              🎯 SATELLITE LOCK: {lockedSat.name} ({Math.round(lockedSat.elevationDeg)}° EL)
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCIENTIFIC PRECISION OBSERVER GROUND STATION (EXACT QUATERNION SLERP)
// ─────────────────────────────────────────────────────────────────────────────
function ObserverGroundStation({
  targetSat,
  satellites,
  onSelectSat,
  mobileOrientation,
}: {
  targetSat: ComputedSatelliteSkyState | null;
  satellites: ComputedSatelliteSkyState[];
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
  mobileOrientation?: { heading: number; pitch: number; roll?: number } | null;
}) {
  const domeRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!domeRef.current) return;

    if (mobileOrientation) {
      // MOBILE COMPASS SENSOR DRIVEN LINE OF SIGHT (EXACT EULER YAW-PITCH-ROLL MAPPING)
      const azRad = (mobileOrientation.heading * Math.PI) / 180;
      const elRad = (mobileOrientation.pitch * Math.PI) / 180;
      const rollRad = ((mobileOrientation.roll || 0) * Math.PI) / 180;

      const targetEuler = new THREE.Euler(-elRad, Math.PI - azRad, -rollRad, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      domeRef.current.quaternion.slerp(targetQuat, 0.35);
    } else if (targetSat) {
      // SCIENTIFICALLY PRECISE SATELLITE TRACKING VECTOR ALIGNMENT
      const stationPos = new THREE.Vector3(0, 2.4, 0);
      const targetPos = targetSat.vec3.clone();
      const dir = targetPos.sub(stationPos).normalize();

      const satAz = ((Math.atan2(dir.x, -dir.z) * 180) / Math.PI + 360) % 360;
      const satEl = (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI;

      const azRad = (satAz * Math.PI) / 180;
      const elRad = (satEl * Math.PI) / 180;

      const targetEuler = new THREE.Euler(-elRad, Math.PI - azRad, 0, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      domeRef.current.quaternion.slerp(targetQuat, 0.2);
    } else {
      // DEFAULT NORTH SIGHT ALIGNMENT (Azimuth 0° North, 15° elevation pitch)
      const idleAz = Math.sin(t * 0.4) * 3;
      const azRad = (idleAz * Math.PI) / 180;
      const elRad = (15 * Math.PI) / 180;

      const targetEuler = new THREE.Euler(-elRad, Math.PI - azRad, 0, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      domeRef.current.quaternion.slerp(targetQuat, 0.1);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Base Pedestal */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[4.5, 5.8, 2.4, 32]} />
        <meshStandardMaterial color="#0b1329" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Rotating Dome Head & Laser Aperture */}
      <group ref={domeRef} position={[0, 2.4, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[4.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.15} metalness={0.85} />
        </mesh>

        {/* Lens Aperture Eye */}
        <mesh position={[0, 2.2, 3.8]}>
          <sphereGeometry args={[0.95, 16, 16]} />
          <meshStandardMaterial
            color={mobileOrientation ? "#06b6d4" : targetSat ? "#f59e0b" : "#10b981"}
            emissive={mobileOrientation ? "#06b6d4" : targetSat ? "#f59e0b" : "#10b981"}
            emissiveIntensity={4.5}
          />
        </mesh>

        <mesh position={[0, 2.2, 2.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.0, 1.25, 3.0, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.9} />
        </mesh>

        {/* 3D Volumetric Sight Cone */}
        <mesh position={[0, 2.2, 120]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[38, 240, 32, 1, true]} />
          <meshBasicMaterial
            color={mobileOrientation ? "#06b6d4" : targetSat ? "#f59e0b" : "#10b981"}
            transparent
            opacity={mobileOrientation ? 0.35 : targetSat ? 0.38 : 0.18}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Precision Sight Laser Core Beam */}
        <Line
          points={[new THREE.Vector3(0, 2.2, 0), new THREE.Vector3(0, 2.2, 260)]}
          color={mobileOrientation ? "#06b6d4" : targetSat ? "#f59e0b" : "#10b981"}
          lineWidth={4.2}
          transparent
          opacity={0.95}
        />
      </group>

      {/* Direct Line of Sight Beam to Tracked Satellite (GOLDEN YELLOW) */}
      {targetSat && !mobileOrientation && (
        <Line
          points={[new THREE.Vector3(0, 2.4, 0), targetSat.vec3]}
          color="#f59e0b"
          lineWidth={4.5}
          transparent
          opacity={0.98}
        />
      )}

      {/* Base Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[5.8, 18, 64]} />
        <meshBasicMaterial color={targetSat ? "#f59e0b" : "#10b981"} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating Status Badge */}
      <Html center position={[0, 8.5, 0]} className="pointer-events-none select-none">
        <div
          className={`px-3.5 py-1 rounded-full text-[10px] font-mono font-black shadow-2xl border backdrop-blur-md whitespace-nowrap animate-pulse transition ${
            mobileOrientation
              ? "bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.8)]"
              : targetSat
              ? "bg-amber-950/90 border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.8)]"
              : "bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          }`}
        >
          <span>
            {mobileOrientation
              ? `📱 STELLARIUM SIGHT: AZ ${mobileOrientation.heading}° | EL ${mobileOrientation.pitch}°`
              : targetSat
              ? ` PRECISION LOCK: ${targetSat.name}`
              : "📡 SIGHT: ALIGNED NORTH (0° AZ)"}
          </span>
        </div>
      </Html>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SATELLITE CATEGORY COLOR PALETTE HELPER (VIBRANT & DISTINCT)
// ─────────────────────────────────────────────────────────────────────────────
export function getSatelliteCategoryStyle(category?: string, name?: string) {
  const cat = (category || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (cat.includes("station") || n.includes("iss") || n.includes("tiangong") || n.includes("css")) {
    return {
      label: "Space Station",
      colorHex: "#00f0ff",
      dotClass: "bg-cyan-400 border-slate-950",
      badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      glowColor: "rgba(0, 240, 255, 0.4)",
    };
  }
  if (
    cat.includes("gps") ||
    cat.includes("nav") ||
    n.includes("gps") ||
    n.includes("glonass") ||
    n.includes("galileo") ||
    n.includes("beidou")
  ) {
    return {
      label: "GPS / Nav",
      colorHex: "#ffb700",
      dotClass: "bg-amber-400 border-slate-950",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      glowColor: "rgba(255, 183, 0, 0.4)",
    };
  }
  if (
    cat.includes("observation") ||
    cat.includes("weather") ||
    n.includes("insat") ||
    n.includes("landsat") ||
    n.includes("sentinel") ||
    n.includes("goes")
  ) {
    return {
      label: "Earth Obs",
      colorHex: "#cbd5e1",
      dotClass: "bg-slate-300 border-slate-950",
      badgeClass: "bg-slate-500/15 text-slate-300 border-slate-500/40",
      glowColor: "rgba(203, 213, 225, 0.4)",
    };
  }
  if (
    cat.includes("science") ||
    cat.includes("astro") ||
    n.includes("hubble") ||
    n.includes("jwst") ||
    n.includes("astrosat") ||
    n.includes("chandra")
  ) {
    return {
      label: "Science",
      colorHex: "#a855f7",
      dotClass: "bg-purple-400 border-slate-950",
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      glowColor: "rgba(168, 85, 247, 0.4)",
    };
  }
  if (cat.includes("communication") || n.includes("starlink") || n.includes("oneweb") || n.includes("iridium")) {
    return {
      label: "Comms",
      colorHex: "#10b981",
      dotClass: "bg-emerald-400 border-slate-950",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      glowColor: "rgba(16, 185, 129, 0.4)",
    };
  }
  return {
    label: "Telemetry",
    colorHex: "#38bdf8",
    dotClass: "bg-sky-400 border-slate-950",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    glowColor: "rgba(56, 189, 248, 0.4)",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REALISTIC 3D GLOBE SATELLITE MODEL NODE WITH MULTI-COLOR CATEGORY ACCENTS
// ─────────────────────────────────────────────────────────────────────────────
function Live3DSatelliteNode({
  sat,
  isSelected,
  showLabels,
  onSelectSat,
}: {
  sat: ComputedSatelliteSkyState;
  isSelected: boolean;
  showLabels: boolean;
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
}) {
  const nodeRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const catStyle = getSatelliteCategoryStyle(sat.category, sat.name);
  const color = isSelected ? "#ffe600" : catStyle.colorHex;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (glowRef.current) {
      glowRef.current.rotation.z = t * 0.8;
    }
    if (nodeRef.current) {
      nodeRef.current.rotation.y = t * 0.4;
    }
  });

  return (
    <group position={sat.vec3.toArray()} onClick={() => onSelectSat(sat)}>
      {/* Outer Pulsing Lock Target Ring */}
      {isSelected && (
        <mesh ref={glowRef}>
          <ringGeometry args={[3.2, 4.8, 32]} />
          <meshBasicMaterial color="#ffe600" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 3D GLOBE SATELLITE MODEL */}
      <group ref={nodeRef} scale={isSelected ? 1.4 : 1.0}>
        {/* Central Chassis */}
        <mesh>
          <boxGeometry args={[1.5, 1.2, 1.2]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} emissive={color} emissiveIntensity={0.5} />
        </mesh>

        {/* Communications Antenna Dish */}
        <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0, 0.6, 0.5, 16]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Left Solar Array Wing */}
        <mesh position={[-2.3, 0, 0]}>
          <boxGeometry args={[2.5, 0.75, 0.08]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.4} />
        </mesh>

        {/* Right Solar Array Wing */}
        <mesh position={[2.3, 0, 0]}>
          <boxGeometry args={[2.5, 0.75, 0.08]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.4} />
        </mesh>

        {/* Wing Axle */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 5.0, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Interactive 3D Label */}
      {(showLabels || isSelected) && (
        <Html distanceFactor={140} position={[0, 3.8, 0]} className="pointer-events-auto select-none">
          <div
            onClick={() => onSelectSat(sat)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold shadow-2xl border cursor-pointer backdrop-blur-md whitespace-nowrap transition transform hover:scale-110 flex items-center gap-1.5 ${
              isSelected
                ? "bg-slate-950/95 border-yellow-400 text-yellow-300 shadow-[0_0_20px_rgba(255,230,0,0.8)] font-black"
                : "bg-slate-950/90 border-white/20 text-slate-200 hover:border-white/40"
            }`}
          >
            <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
            <span>{sat.name}</span>
            <span className="opacity-70">({Math.round(sat.elevationDeg)}°)</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D ORBIT TRAJECTORIES LAYER (PINK ORBIT PATH ARCS & EVENT MARKERS)
// ─────────────────────────────────────────────────────────────────────────────
function OrbitTrajectoriesLayer({
  satellites,
  selectedSatId,
  showOrbits,
}: {
  satellites: ComputedSatelliteSkyState[];
  selectedSatId: number | null;
  showOrbits: boolean;
}) {
  if (!showOrbits) return null;

  return (
    <group>
      {satellites.map((sat) => {
        const isSelected = sat.id === selectedSatId;
        const pts = sat.trajectoryPoints;

        if (!pts || pts.length < 2) return null;

        // USER REQUEST: Make the path of the satellite in PINK color
        const strokeColor = isSelected ? "#ff1493" : "#ec4899";

        return (
          <group key={sat.id}>
            <Line
              points={pts}
              color={strokeColor}
              lineWidth={isSelected ? 4.8 : 1.8}
              transparent
              opacity={isSelected ? 0.98 : 0.65}
            />

            {isSelected && sat.passDetails && (
              <>
                <mesh position={sat.passDetails.riseVec3.toArray()}>
                  <sphereGeometry args={[1.4, 16, 16]} />
                  <meshBasicMaterial color="#ec4899" />
                </mesh>

                <mesh position={sat.passDetails.peakVec3.toArray()}>
                  <sphereGeometry args={[1.8, 16, 16]} />
                  <meshBasicMaterial color="#ff1493" />
                </mesh>

                <mesh position={sat.passDetails.setVec3.toArray()}>
                  <sphereGeometry args={[1.4, 16, 16]} />
                  <meshBasicMaterial color="#f472b6" />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CELESTIAL SKY DOME & ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────
function Clean3DSkyDome({
  showGround,
  showGrid,
  targetSat,
  satellites,
  onSelectSat,
  mobileOrientation,
}: {
  showGround: boolean;
  showGrid: boolean;
  targetSat: ComputedSatelliteSkyState | null;
  satellites: ComputedSatelliteSkyState[];
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
  mobileOrientation?: { heading: number; pitch: number } | null;
}) {
  const cardinals = useMemo(() => {
    const r = SKY_RADIUS * 0.96;
    return [
      { label: "N", pos: new THREE.Vector3(0, 2, -r), text: "0° NORTH" },
      { label: "NE", pos: new THREE.Vector3(r * 0.707, 2, -r * 0.707), text: "45° NE" },
      { label: "E", pos: new THREE.Vector3(r, 2, 0), text: "90° EAST" },
      { label: "SE", pos: new THREE.Vector3(r * 0.707, 2, r * 0.707), text: "135° SE" },
      { label: "S", pos: new THREE.Vector3(0, 2, r), text: "180° SOUTH" },
      { label: "SW", pos: new THREE.Vector3(-r * 0.707, 2, r * 0.707), text: "225° SW" },
      { label: "W", pos: new THREE.Vector3(-r, 2, 0), text: "270° WEST" },
      { label: "NW", pos: new THREE.Vector3(-r * 0.707, 2, -r * 0.707), text: "315° NW" },
    ];
  }, []);

  const altRings = useMemo(() => {
    if (!showGrid) return [];
    const r = SKY_RADIUS * 0.96;
    const angles = [15, 30, 45, 60, 75];
    const rings: THREE.Vector3[][] = [];

    angles.forEach((el) => {
      const elRad = (el * Math.PI) / 180;
      const pts: THREE.Vector3[] = [];
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const azRad = (i / steps) * Math.PI * 2;
        const x = r * Math.cos(elRad) * Math.sin(azRad);
        const y = r * Math.sin(elRad);
        const z = -r * Math.cos(elRad) * Math.cos(azRad);
        pts.push(new THREE.Vector3(x, y, z));
      }
      rings.push(pts);
    });
    return rings;
  }, [showGrid]);

  return (
    <group>
      <Stars radius={450} depth={100} count={9000} factor={8} saturation={0.3} fade speed={1.5} />

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[SKY_RADIUS * 0.96, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#0284c7" wireframe transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>

      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[SKY_RADIUS * 1.05, 32, 32]} />
        <meshBasicMaterial color="#020617" side={THREE.BackSide} transparent opacity={0.65} />
      </mesh>

      {showGrid &&
        altRings.map((pts, idx) => (
          <Line key={idx} points={pts} color="#0284c7" lineWidth={1.2} transparent opacity={0.3} />
        ))}

      <Line
        points={cardinals.map((c) => c.pos).concat([cardinals[0].pos])}
        color="#10b981"
        lineWidth={2.5}
        transparent
        opacity={0.65}
      />

      {showGround && (
        <group position={[0, -0.2, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3500, 3500]} />
            <meshStandardMaterial color="#020617" roughness={0.9} metalness={0.2} />
          </mesh>
          <gridHelper args={[800, 40, "#0284c7", "#0f172a"]} position={[0, 0.1, 0]} />
        </group>
      )}

      {/* Scientific Precision Ground Station */}
      <ObserverGroundStation
        targetSat={targetSat}
        satellites={satellites}
        onSelectSat={onSelectSat}
        mobileOrientation={mobileOrientation}
      />

      {/* Stellarium Mobile Camera Sight Reticle on Sky Dome Sphere */}
      {mobileOrientation && (
        <MobileCameraSightReticle
          mobileOrientation={mobileOrientation}
          satellites={satellites}
        />
      )}

      {cardinals.map((c) => (
        <group key={c.label} position={c.pos}>
          <Html center className="pointer-events-none select-none">
            <div
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black shadow-2xl border backdrop-blur-md whitespace-nowrap ${
                c.label === "N"
                  ? "bg-red-950/90 border-red-500 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                  : "bg-slate-950/90 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              }`}
            >
              <span>{c.text}</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2D PLANISPHERE RADAR OVERLAY (CRISP SEPARATION • VIBRANT COLOR PALETTE)
// ─────────────────────────────────────────────────────────────────────────────
function Planisphere2DRadar({
  satellites,
  selectedSatId,
  onSelectSat,
}: {
  satellites: ComputedSatelliteSkyState[];
  selectedSatId: number | null;
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
}) {
  const visibleSats = satellites.filter((s) => s.isAboveHorizon);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-52 h-52 rounded-full border border-white/20 bg-slate-950/95 backdrop-blur-2xl relative flex items-center justify-center shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(16,185,129,0.2)] pointer-events-auto overflow-hidden">
        {/* Concentric Altitude Rings */}
        <div className="absolute inset-0 rounded-full border border-white/10" />
        <div className="absolute inset-5 rounded-full border border-white/10" />
        <div className="absolute inset-12 rounded-full border border-white/10" />
        <div className="absolute inset-20 rounded-full border border-emerald-500/30 bg-emerald-500/5" />

        {/* Crosshair Axes */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-[1px] bg-white/10" />
          <div className="h-full w-[1px] bg-white/10 absolute" />
        </div>

        {/* Cardinal Markers */}
        <div className="absolute top-1 font-mono text-[9px] font-black text-red-400">N</div>
        <div className="absolute bottom-1 font-mono text-[9px] font-bold text-emerald-400">S</div>
        <div className="absolute right-1.5 font-mono text-[9px] font-bold text-emerald-400">E</div>
        <div className="absolute left-1.5 font-mono text-[9px] font-bold text-emerald-400">W</div>

        {/* Zenith Center Observer Point */}
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 z-10 border border-slate-950 shadow-[0_0_6px_#10b981]" />

        {/* Satellite Radar Points with Crisp Dark Borders (NO OVERLAPPING GLOW BLOBS) */}
        {visibleSats.map((sat) => {
          const rMax = 84;
          const r = Math.max(0, ((90 - sat.elevationDeg) / 90) * rMax);
          const azRad = (sat.azimuthDeg * Math.PI) / 180;

          const x = r * Math.sin(azRad);
          const y = -r * Math.cos(azRad);
          const isSelected = selectedSatId === sat.id;

          const catStyle = getSatelliteCategoryStyle(sat.category, sat.name);

          return (
            <div
              key={sat.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSat(sat);
              }}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              className="absolute z-20 cursor-pointer group flex items-center justify-center transition-transform hover:scale-130"
              title={`${sat.name} [${catStyle.label}] (El: ${Math.round(sat.elevationDeg)}°, Az: ${Math.round(sat.azimuthDeg)}°)`}
            >
              {/* Crisp Core Dot with 1.5px Dark Border to Prevent Blurring into Blobs */}
              <div
                className={`rounded-full transition-all duration-150 border-[1.5px] border-slate-950 ${
                  isSelected
                    ? "w-3 h-3 bg-yellow-300 ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-950 shadow-[0_0_12px_#ffea00] animate-pulse z-30"
                    : `w-2 h-2 ${catStyle.dotClass} drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`
                }`}
              />

              {/* Hover Micro Tooltip */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pointer-events-none z-40 whitespace-nowrap">
                <div className="px-2 py-0.5 rounded bg-slate-950/95 border border-white/20 text-[9px] font-mono text-slate-100 shadow-xl flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catStyle.colorHex }} />
                  <span className="font-bold">{sat.name}</span>
                  <span className="text-slate-400">({Math.round(sat.elevationDeg)}°)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Radar Color Palette Legend Bar */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/95 border border-white/10 backdrop-blur-md text-[9px] font-mono shadow-md text-slate-300">
        <span className="flex items-center gap-1 text-cyan-400 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 border border-slate-950" /> Station
        </span>
        <span className="flex items-center gap-1 text-amber-400 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 border border-slate-950" /> GPS
        </span>
        <span className="flex items-center gap-1 text-slate-300 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 border border-slate-950" /> Obs
        </span>
        <span className="flex items-center gap-1 text-purple-400 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 border border-slate-950" /> Science
        </span>
        <span className="flex items-center gap-1 text-emerald-400 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-slate-950" /> Comms
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-PRECISION INTERACTIVE GLASS PASS PROFILE GRAPH (UNCLUTTERED)
// ─────────────────────────────────────────────────────────────────────────────
function SatellitePassGraph({ points, liveElevationDeg }: { points: PassGraphPoint[]; liveElevationDeg?: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!points || points.length === 0) return null;

  const width = 400;
  const height = 140;

  const minMag = Math.min(...points.map((p) => p.magnitude));
  const maxMag = Math.max(...points.map((p) => p.magnitude));
  const magRange = Math.max(1, maxMag - minMag);

  const maxElObj = points.reduce((prev, current) => (prev.elevationDeg > current.elevationDeg ? prev : current), points[0]);
  const maxEl = Math.max(...points.map((p) => p.elevationDeg), 1);
  const incDeg = points[0]?.inclinationDeg || 51.6;
  const avgMag = maxElObj.magnitude || 2.5;

  const elPointsStr = points
    .map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - (p.elevationDeg / 90) * (height - 24) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPointsStr = `0,${height} ${elPointsStr} ${width},${height}`;

  const magPointsStr = points
    .map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const normMag = (p.magnitude - minMag) / magRange;
      const y = 16 + normMag * (height - 32);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const currIdx = points.findIndex((p) => p.isCurrent);

  // Active Index: Hover position if mouse is over graph, else live real-time position
  const activeIdx = hoverIndex !== null ? hoverIndex : (currIdx >= 0 ? currIdx : 0);
  const activePoint = points[activeIdx] || points[0];
  const activeX = points.length > 1 ? (activeIdx / (points.length - 1)) * width : width / 2;
  const activeElY = height - (activePoint.elevationDeg / 90) * (height - 24) - 8;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (points.length - 1));
    setHoverIndex(idx);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.6)] font-mono mb-3">
      {/* Sleek Header Bar */}
      <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
          <span className="font-extrabold text-pink-400 tracking-wide">
            Peak Elevation: {maxEl.toFixed(1)}°
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
            V_mag: {avgMag > 0 ? `+${avgMag.toFixed(1)}` : avgMag.toFixed(1)}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
            Inclination: {incDeg.toFixed(1)}°
          </span>
        </div>
      </div>

      {/* SVG Interactive Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        className="relative w-full h-[140px] bg-slate-950/50 rounded-xl overflow-hidden border border-white/5 p-2 cursor-crosshair group"
      >
        {/* Minimal Clean Y-Axis Scale Markers */}
        <div className="absolute left-2 top-1 text-[9px] font-bold text-slate-500 pointer-events-none">90°</div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-600 pointer-events-none">45°</div>
        <div className="absolute left-2 bottom-1 text-[9px] font-bold text-slate-600 pointer-events-none">0°</div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="glassElGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Clean Horizontal Grid Lines */}
          <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3 3" opacity={0.15} />
          <line x1={0} y1={height / 4} x2={width} y2={height / 4} stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3 3" opacity={0.1} />
          <line x1={0} y1={(height * 3) / 4} x2={width} y2={(height * 3) / 4} stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3 3" opacity={0.1} />

          {/* Translucent Area & Pass Curves */}
          <polygon points={areaPointsStr} fill="url(#glassElGradient)" />
          <polyline fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={elPointsStr} />
          <polyline fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" points={magPointsStr} opacity={0.7} />

          {/* Interactive Dynamic Tracking Laser Line */}
          <line x1={activeX} y1={0} x2={activeX} y2={height} stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2 2" />
          <circle cx={activeX} cy={activeElY} r="4" fill="#38bdf8" className="animate-ping" />
          <circle cx={activeX} cy={activeElY} r="3" fill="#ffffff" />
        </svg>

        {/* Floating Glass Hover Telemetry Tooltip */}
        {hoverIndex !== null && (
          <div
            style={{ left: `${Math.min(75, Math.max(20, (activeIdx / (points.length - 1)) * 80 + 10))}%` }}
            className="absolute top-2 z-30 px-2.5 py-1 rounded-lg bg-slate-950/95 border border-white/20 text-[10px] font-mono text-slate-100 shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-2 transform -translate-x-1/2"
          >
            <span className="text-cyan-400 font-bold">{activePoint.timeStr || "Pass"}</span>
            <span className="text-pink-400 font-bold">{activePoint.elevationDeg.toFixed(1)}° El</span>
            <span className="text-amber-300 font-bold">Mag {activePoint.magnitude > 0 ? `+${activePoint.magnitude.toFixed(1)}` : activePoint.magnitude.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Structured Telemetry Footer Bar: AOS Rise, Hover/Live Status & LOS Set */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-mono select-none">
        {/* Left Column: AOS Rise */}
        <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col justify-center shadow-inner">
          <div className="text-slate-400 text-[9px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            <span className="whitespace-nowrap">AOS RISE</span>
          </div>
          <div className="font-extrabold text-pink-300 text-xs whitespace-nowrap mt-0.5">
            {points[0]?.timeStr || "00:00 AM"}
          </div>
        </div>

        {/* Center Column: Dynamic Live / Hover Telemetry */}
        <div className="p-2 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col justify-center items-center text-center shadow-inner">
          <div className="text-slate-400 text-[9px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="whitespace-nowrap">{hoverIndex !== null ? "HOVER INFO" : "LIVE POSITION"}</span>
          </div>
          <div className="font-extrabold text-cyan-300 text-[11px] whitespace-nowrap mt-0.5 flex items-center gap-1 font-mono">
            <span>{hoverIndex !== null ? (activePoint.timeStr || "Point") : (points[currIdx]?.timeStr || "Now")}</span>
            <span className="text-pink-400">
              ({(hoverIndex !== null ? activePoint.elevationDeg : (liveElevationDeg !== undefined ? liveElevationDeg : activePoint.elevationDeg)).toFixed(1)}°)
            </span>
          </div>
        </div>

        {/* Right Column: LOS Set */}
        <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col items-end justify-center text-right shadow-inner">
          <div className="text-slate-400 text-[9px] font-bold flex items-center gap-1">
            <span className="whitespace-nowrap">LOS SET</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          </div>
          <div className="font-extrabold text-purple-300 text-xs whitespace-nowrap mt-0.5">
            {points[points.length - 1]?.timeStr || "00:00 PM"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 24-HOUR PASS TRAJECTORY LABELS CARD (PANEL DISPLAY)
// ─────────────────────────────────────────────────────────────────────────────
function PassTrajectoryDetailsCard({ sat }: { sat: ComputedSatelliteSkyState }) {
  if (!sat.passDetails) return null;
  const p = sat.passDetails;
  const riseCardinal = getCardinalText(p.riseAzimuthDeg);
  const setCardinal = getCardinalText(p.setAzimuthDeg);

  return (
    <div className="bg-slate-900/90 border border-pink-500/40 rounded-2xl p-3 mb-3 text-[11px] font-sans shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
        <span className="font-extrabold text-pink-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
          <Radio className="h-3.5 w-3.5 text-pink-400 animate-pulse" /> 24-Hour Pass Trajectory Labels
        </span>
        <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-300 text-[10px] font-mono font-extrabold">
          {p.peakElevationDeg >= 45 ? " Zenith Pass" : "🌅 Horizon Pass"}
        </span>
      </div>

      <div className="space-y-2 text-slate-200 font-mono text-[11px]">
        {/* Rise Details */}
        <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-pink-500/20">
          <div className="flex items-center gap-2">
            <span className="text-sm">🌅</span>
            <div>
              <div className="font-bold text-pink-300">Horizon Rise</div>
              <div className="text-[9px] text-slate-400">Azimuth: {p.riseAzimuthDeg}° ({riseCardinal})</div>
            </div>
          </div>
          <div className="font-extrabold text-pink-300 bg-pink-950/80 px-2.5 py-1 rounded-lg border border-pink-500/30 text-[10px]">
            {p.riseTimeStr}
          </div>
        </div>

        {/* Max Peak Details */}
        <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="text-sm">⛰️</span>
            <div>
              <div className="font-bold text-amber-300">Max Peak Altitude</div>
              <div className="text-[9px] text-slate-400">Elevation: {p.peakElevationDeg}° Overhead</div>
            </div>
          </div>
          <div className="font-extrabold text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-400/40 text-[10px] shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            {p.peakTimeStr}
          </div>
        </div>

        {/* Set Details */}
        <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-pink-500/20">
          <div className="flex items-center gap-2">
            <span className="text-sm">🌇</span>
            <div>
              <div className="font-bold text-pink-300">Horizon Set</div>
              <div className="text-[9px] text-slate-400">Azimuth: {p.setAzimuthDeg}° ({setCardinal})</div>
            </div>
          </div>
          <div className="font-extrabold text-pink-300 bg-pink-950/80 px-2.5 py-1 rounded-lg border border-pink-500/30 text-[10px]">
            {p.setTimeStr}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sample satellite pass points for interactive specimen graph inside Manual
const SAMPLE_PASS_POINTS: PassGraphPoint[] = [
  { elevationDeg: 2, magnitude: 5.8, isCurrent: false, inclinationDeg: 51.6, timeStr: "03:32 PM", timeMs: 1725450000000 },
  { elevationDeg: 15, magnitude: 4.8, isCurrent: false, inclinationDeg: 51.6, timeStr: "04:00 PM", timeMs: 1725451800000 },
  { elevationDeg: 35, magnitude: 3.5, isCurrent: false, inclinationDeg: 51.6, timeStr: "04:30 PM", timeMs: 1725453600000 },
  { elevationDeg: 55, magnitude: 2.4, isCurrent: false, inclinationDeg: 51.6, timeStr: "05:00 PM", timeMs: 1725455400000 },
  { elevationDeg: 75, magnitude: 1.8, isCurrent: true, inclinationDeg: 51.6, timeStr: "05:32 PM", timeMs: 1725457320000 },
  { elevationDeg: 60, magnitude: 2.2, isCurrent: false, inclinationDeg: 51.6, timeStr: "06:00 PM", timeMs: 1725459000000 },
  { elevationDeg: 40, magnitude: 3.2, isCurrent: false, inclinationDeg: 51.6, timeStr: "06:30 PM", timeMs: 1725460800000 },
  { elevationDeg: 20, magnitude: 4.5, isCurrent: false, inclinationDeg: 51.6, timeStr: "07:00 PM", timeMs: 1725462600000 },
  { elevationDeg: 3, magnitude: 5.9, isCurrent: false, inclinationDeg: 51.6, timeStr: "07:32 PM", timeMs: 1725464520000 },
];

// ─────────────────────────────────────────────────────────────────────────────
// STARGAZER SYSTEM MANUAL (GLASS TRANSPARENT FINISH • NO EMOJIS)
// ─────────────────────────────────────────────────────────────────────────────
function StarGazerManualModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"guide" | "features" | "terms" | "physics">("guide");

  const tabs = [
    { id: "guide", label: "01 // QUICK START", icon: Zap },
    { id: "features", label: "02 // SYSTEM CONTROLS", icon: Sliders },
    { id: "terms", label: "03 // ASTROPHYSICS GLOSSARY", icon: Globe },
    { id: "physics", label: "04 // GRAPH & PHYSICS", icon: Activity },
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-2xl pointer-events-auto font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-gradient-to-b from-slate-950/90 via-slate-900/85 to-slate-950/95 border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.15)] flex flex-col overflow-hidden text-slate-100 backdrop-blur-3xl"
        >
          {/* Top Glass Glow Accent Bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-80" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/40 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-extrabold tracking-widest text-slate-100 uppercase font-mono">
                    STARGAZER OPERATIONAL MANUAL
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 tracking-wider">
                    v2.4 TELEMETRY ENGINE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono tracking-wide mt-0.5">
                  Topocentric Equatorial System • SGP4 Orbit Propagation • Pass Telemetry Analytics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-slate-400 hover:text-white text-xs flex items-center justify-center transition shadow-sm"
              title="Close Manual"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Animated Tab Bar with Glass Indicator */}
          <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-950/40 border-b border-white/10 shrink-0 font-mono text-xs overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                    isActive ? "text-emerald-300 font-bold" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeManualTab"
                      className="absolute inset-0 bg-emerald-500/15 border border-emerald-500/40 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className={`h-3.5 w-3.5 relative z-10 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span className="relative z-10 tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Modal Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed font-sans">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* TAB 1: QUICK START */}
                {activeTab === "guide" && (
                  <div className="space-y-4">
                    {/* Top System Specification Banner */}
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 font-mono text-xs flex items-center justify-between gap-4 shadow-inner">
                      <div className="flex items-center gap-3">
                        <Radio className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
                        <div>
                          <div className="text-emerald-400 font-bold tracking-wider">SGP4 KERNEL ACTIVE</div>
                          <div className="text-[11px] text-slate-400">
                            Real-time topocentric equatorial & horizontal orbital propagation for observer coordinates.
                          </div>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-[10px] bg-slate-900/60 px-3 py-1.5 rounded-lg border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-slate-300 font-bold">LIVE TELEMETRY</span>
                      </div>
                    </div>

                    {/* Step Cards 2x2 Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-300 space-y-2.5 group">
                        <div className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-mono group-hover:bg-emerald-500/20 transition">
                            01
                          </span>
                          <span className="tracking-wider uppercase">Observer Site Calibration</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          Click <strong>Use My Location</strong> to acquire live browser GPS coordinates (WGS84 lat, lon, alt) or choose from preset observatory coordinates in the site catalog dropdown.
                        </p>
                        <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <MapPin className="h-3 w-3 text-emerald-400" />
                          <span>WGS84 Reference Ellipsoid</span>
                        </div>
                      </div>

                      <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-300 space-y-2.5 group">
                        <div className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-mono group-hover:bg-emerald-500/20 transition">
                            02
                          </span>
                          <span className="tracking-wider uppercase">3D Sky Dome Navigation</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          Use <strong>Left-Click + Drag</strong> to tilt and orbit around your sky dome. Use <strong>Scroll Wheel</strong> to adjust camera altitude distance, and <strong>Right-Click + Drag</strong> to pan.
                        </p>
                        <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <Compass className="h-3 w-3 text-emerald-400" />
                          <span>Orbit Controls Engine</span>
                        </div>
                      </div>

                      <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-300 space-y-2.5 group">
                        <div className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-mono group-hover:bg-emerald-500/20 transition">
                            03
                          </span>
                          <span className="tracking-wider uppercase">Target Lock & Sight Line</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          Click any 3D green satellite node in the celestial dome or select one from the right panel. Click <strong>Aim Robot Sight & Track Camera</strong> to lock camera focus and fire a golden tracking laser vector.
                        </p>
                        <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <Target className="h-3 w-3 text-amber-400" />
                          <span>Golden Laser Vector (#f59e0b)</span>
                        </div>
                      </div>

                      <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-300 space-y-2.5 group">
                        <div className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[10px] font-mono group-hover:bg-emerald-500/20 transition">
                            04
                          </span>
                          <span className="tracking-wider uppercase">Time-Warp Orbital Scrubber</span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          Click <strong>Simulate Time</strong> to open the 24-hour timeline scrubber. Drag the slider to fast-forward (+1x to +120x) or rewind time to watch satellites travel their projected pink orbital trajectories.
                        </p>
                        <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <Clock className="h-3 w-3 text-pink-400" />
                          <span>24h Trajectory Spline (#ec4899)</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Keybindings Reference Table */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 font-mono">
                      <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Command className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Interactive Viewport Controls Cheat Sheet</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                          <div className="text-emerald-400 font-bold">LEFT CLICK + DRAG</div>
                          <div className="text-slate-400 text-[10px]">Rotate 3D Sky Dome</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                          <div className="text-emerald-400 font-bold">RIGHT CLICK + DRAG</div>
                          <div className="text-slate-400 text-[10px]">Pan Camera Origin</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                          <div className="text-emerald-400 font-bold">SCROLL WHEEL</div>
                          <div className="text-slate-400 text-[10px]">Zoom Viewport Distance</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                          <div className="text-amber-400 font-bold">SIGHT LOCK BUTTON</div>
                          <div className="text-slate-400 text-[10px]">Deploy Laser Ray</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: SYSTEM CONTROLS */}
                {activeTab === "features" && (
                  <div className="space-y-4 font-mono text-xs">
                    <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
                      <div className="font-sans text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                        <Sliders className="h-4 w-4 text-emerald-400" />
                        <span>StarGazer Telemetry Engine & Interface Specifications</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-slate-300 font-sans">
                        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/10 hover:border-emerald-500/30 transition">
                          <div className="font-mono font-bold text-emerald-400 text-xs mb-1 flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                            GPS Telemetry Engine
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            Queries browser Geolocation API for WGS84 latitude, longitude, and elevation. Computes observer local sidereal time and zenith projection vector.
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/10 hover:border-emerald-500/30 transition">
                          <div className="font-mono font-bold text-emerald-400 text-xs mb-1 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-emerald-400" />
                            24-Hour Pass Predictor
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            Filters satellites with upcoming horizon passes over the observer site within a 24-hour window, calculating AOS (Acquisition of Signal) and LOS (Loss of Signal).
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-pink-500/20 hover:border-pink-500/40 transition">
                          <div className="font-mono font-bold text-pink-400 text-xs mb-1 flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-pink-400" />
                            Pink Orbit Trajectories (#ec4899)
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            Renders projected topocentric horizon paths over a 24-hour orbital propagation window using 3D line splines.
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-emerald-500/20 hover:border-emerald-500/40 transition">
                          <div className="font-mono font-bold text-emerald-400 text-xs mb-1 flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-emerald-400" />
                            Green 3D Node Mesh (#10b981)
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            3D satellite model with solar array geometry scaled to planetarium coordinates, orientation-aligned to orbital velocity vector.
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-amber-500/20 hover:border-amber-500/40 transition">
                          <div className="font-mono font-bold text-amber-400 text-xs mb-1 flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-amber-400" />
                            Golden Laser Vector (#f59e0b)
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            Line-of-sight tracking laser beam from observer origin (0,0,0) directly to target satellite coordinates with real-time camera tracking.
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-cyan-500/20 hover:border-cyan-500/40 transition">
                          <div className="font-mono font-bold text-cyan-400 text-xs mb-1 flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5 text-cyan-400" />
                            Naked-Eye Visibility Filter
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed">
                            Physically screens for dark sky observer (Sun position &le; -6°), sunlit satellite, and visual magnitude V_mag &le; +6.0.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ASTROPHYSICS GLOSSARY */}
                {activeTab === "terms" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-sans">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition">
                      <div className="font-mono font-bold text-emerald-400 text-xs mb-1">Right Ascension (RA, α)</div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        Equatorial coordinate measuring east-west position along the celestial equator from the Vernal Equinox. Expressed in hours, minutes, seconds (0h to 24h).
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition">
                      <div className="font-mono font-bold text-emerald-400 text-xs mb-1">Declination (Dec, δ)</div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        Equatorial coordinate measuring angular distance north (+) or south (-) from the celestial equator in degrees (-90° to +90°).
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition">
                      <div className="font-mono font-bold text-emerald-400 text-xs mb-1">Elevation Angle (El)</div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        Horizontal coordinate measuring vertical angle above local horizon (0° = Horizon, 90° = Zenith directly overhead).
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition">
                      <div className="font-mono font-bold text-emerald-400 text-xs mb-1">Azimuth Heading (Az)</div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        Horizontal compass angle measured clockwise from True North (0° North, 90° East, 180° South, 270° West).
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-amber-500/20 hover:border-amber-500/40 transition">
                      <div className="font-mono font-bold text-amber-400 text-xs mb-1">Visual Magnitude (V_mag)</div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        Pogson&apos;s logarithmic brightness rating. Lower or negative numbers indicate brighter objects (+6.0 is human naked-eye threshold under dark skies).
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-purple-500/20 hover:border-purple-500/40 transition">
                      <div className="font-mono font-bold text-purple-400 text-xs mb-1">Orbital Inclination (Inc, i)</div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        Angle between the orbital plane and Earth&apos;s equatorial plane (0° = Equatorial orbit, 90° = Polar orbit).
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition">
                      <div className="font-mono font-bold text-slate-200 text-xs mb-1">NORAD Catalog ID</div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        Unique 5-digit catalog identification number assigned by US Space Command to track orbital space assets.
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition">
                      <div className="font-mono font-bold text-slate-200 text-xs mb-1">Two-Line Element (TLE)</div>
                      <div className="text-slate-300 text-[11px] leading-relaxed">
                        Standardized 140-character Keplerian dataset consumed by SGP4 algorithm to model orbital decay and positions.
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: GRAPH & PHYSICS LOGIC */}
                {activeTab === "physics" && (
                  <div className="space-y-4 font-sans text-xs">
                    {/* ANNOTATED REAL SATELLITE PASS GRAPH SPECIMEN */}
                    <div className="p-4.5 rounded-xl bg-white/[0.02] border border-emerald-500/30 space-y-3.5 shadow-lg">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div className="font-mono font-bold text-emerald-400 text-xs flex items-center gap-2">
                          <Activity className="h-4 w-4 text-emerald-400" />
                          <span>REAL SATELLITE PASS TELEMETRY SPECIMEN (INSAT-3DS / ISS)</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 tracking-wider">
                          CALIBRATED MODEL
                        </span>
                      </div>

                      {/* Render SatellitePassGraph Specimen */}
                      <div className="my-1.5 p-2 rounded-xl bg-slate-950/60 border border-white/5">
                        <SatellitePassGraph points={SAMPLE_PASS_POINTS} />
                      </div>

                      {/* Callout Legend Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-pink-500/20 flex items-start gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0 mt-1 shadow-[0_0_8px_#ec4899]" />
                          <div>
                            <div className="font-mono font-bold text-pink-300 text-xs">Solid Pink Curve (Elevation)</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              Tracks vertical angle from 0° (Horizon Rise) up to 75° (Peak Zenith) and down to 0° (Horizon Set).
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex items-start gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1 shadow-[0_0_8px_#10b981]" />
                          <div>
                            <div className="font-mono font-bold text-emerald-300 text-xs">Dashed Green Curve (Visual Mag)</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              Calculates visual magnitude V_mag over time. Peaks at +1.8 (maximum brightness) near zenith.
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-red-500/20 flex items-start gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1 shadow-[0_0_8px_#ef4444] animate-ping" />
                          <div>
                            <div className="font-mono font-bold text-red-300 text-xs">Red Laser Cursor (Current Time)</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              Sweeps across trajectory timeline to pinpoint instantaneous satellite location in real time.
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/20 flex items-start gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0 mt-1 shadow-[0_0_8px_#a855f7]" />
                          <div>
                            <div className="font-mono font-bold text-purple-300 text-xs">Inc Tag & Altitude Scale</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                              Inc: 51.6° is orbital inclination tilt. Y-axis marks 90° (Zenith), 45° (Mid-sky), and 0° (Horizon).
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Physics-Driven Sun Illumination Criteria */}
                    <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
                      <div className="font-mono font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-400" />
                        <span>Physics-Driven Visibility Criteria</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
                        For a satellite to be physically observable from ground level without optical equipment, three astronomical constraints must be satisfied:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[10px] pt-1">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 text-slate-300 space-y-1">
                          <span className="text-emerald-400 font-bold block">01. OBSERVER SKY DUSK</span>
                          <span className="text-slate-400 block text-[10px]">Sun position &le; -6° below local horizon (nautical/astronomical twilight).</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 text-slate-300 space-y-1">
                          <span className="text-emerald-400 font-bold block">02. DIRECT SUNLIGHT</span>
                          <span className="text-slate-400 block text-[10px]">Satellite orbit position lies outside Earth&apos;s umbral shadow cone.</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 text-slate-300 space-y-1">
                          <span className="text-emerald-400 font-bold block">03. MAGNITUDE THRESHOLD</span>
                          <span className="text-slate-400 block text-[10px]">Visual brightness magnitude rating V_mag &le; +6.0.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between shrink-0 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Zap className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>SGP4 TELEMETRY KERNEL OPERATIONAL</span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-95 text-xs font-mono tracking-wider"
            >
              CLOSE MANUAL
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D CELESTIAL SCENE CONTENT (OPTIMIZED ZENITH CAMERA ELEVATION)
// ─────────────────────────────────────────────────────────────────────────────
function SatelliteTrackerCelestialScene({
  observer,
  currentDate,
  controlsRef,
  onUpdateHeading,
  showLabels,
  showOrbits,
  showGround,
  showGrid,
  selectedSat,
  satellites,
  onSelectSat,
  is180DomeView,
  mobileOrientation,
  mobileSightMode = "track",
}: {
  observer: ObserverCoords;
  currentDate: Date;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onUpdateHeading: (azDeg: number) => void;
  showLabels: boolean;
  showOrbits: boolean;
  showGround: boolean;
  showGrid: boolean;
  selectedSat: ComputedSatelliteSkyState | null;
  satellites: ComputedSatelliteSkyState[];
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
  is180DomeView: boolean;
  mobileOrientation?: { heading: number; pitch: number; roll?: number } | null;
  mobileSightMode?: "ar" | "track";
}) {
  useFrame(({ camera }) => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const facingAz = ((Math.atan2(-dir.x, -dir.z) * 180) / Math.PI + 360) % 360;
    onUpdateHeading(facingAz);

    if (mobileOrientation) {
      const azRad = (mobileOrientation.heading * Math.PI) / 180;
      const elRad = (mobileOrientation.pitch * Math.PI) / 180;
      const r = 240;

      const targetX = r * Math.sin(azRad) * Math.cos(elRad);
      const targetY = Math.max(5, r * Math.sin(elRad));
      const targetZ = -r * Math.cos(azRad) * Math.cos(elRad);

      if (mobileSightMode === "ar") {
        // FIRST-PERSON AR SKY VIEWER MODE: Eye at ground station looking outward along back-camera vector
        camera.position.set(0, 10, 0);
        camera.lookAt(targetX, targetY, targetZ);
      } else if (controlsRef.current) {
        // OBSERVATORY TRACK MODE: Orbit controls target smoothly centers on mobile sight vector
        controlsRef.current.target.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.15);
        controlsRef.current.update();
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#02040a"]} />
      <ambientLight intensity={2.0} />
      <directionalLight position={[100, 150, 100]} intensity={2.5} />

      {/* 3D Orbit Trajectories Layer */}
      <OrbitTrajectoriesLayer
        satellites={satellites}
        selectedSatId={selectedSat ? selectedSat.id : null}
        showOrbits={showOrbits}
      />

      {/* 3D Satellite Nodes (Green 3D Globe Satellite Model) */}
      {satellites.map((sat) => {
        if (!sat.isAboveHorizon && sat.id !== selectedSat?.id) return null;
        return (
          <Live3DSatelliteNode
            key={sat.id}
            sat={sat}
            isSelected={sat.id === selectedSat?.id}
            showLabels={showLabels}
            onSelectSat={onSelectSat}
          />
        );
      })}

      {/* Sky Dome, Compass, Robot Sight Beam & Starfield */}
      <Clean3DSkyDome
        showGround={showGround}
        showGrid={showGrid}
        targetSat={selectedSat}
        satellites={satellites}
        onSelectSat={onSelectSat}
        mobileOrientation={mobileOrientation}
      />

      {/* OrbitControls: Free 180° rotation when is180DomeView is true, fixed observer lock when false */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.6}
        enableRotate={is180DomeView && mobileSightMode !== "ar"}
        target={is180DomeView ? [0, 60, 0] : [0, 25, 0]}
        minPolarAngle={0.001}
        maxPolarAngle={Math.PI / 2 + 0.1}
        minDistance={10}
        maxDistance={700}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN STAR GAZE VIEW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface StarGazeViewProps {
  observer: ObserverCoords;
}

export default function StarGazeView({ observer: initialObserver }: StarGazeViewProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [currentObserver, setCurrentObserver] = useState<ObserverCoords>(initialObserver);

  // Time & Simulation Controls
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeMultiplier, setTimeMultiplier] = useState<number>(1);
  const [simOffsetMinutes, setSimOffsetMinutes] = useState<number>(0);

  // Layer Toggles
  const [headingAzimuth, setHeadingAzimuth] = useState<number>(0);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showGround, setShowGround] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [showSimDock, setShowSimDock] = useState<boolean>(false);
  const [is180DomeView, setIs180DomeView] = useState<boolean>(true);

  // Filters & State: Default to strictly "Visible in 24 Hours" from observer site
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Visible in 24 Hours");
  const [selectedSat, setSelectedSat] = useState<ComputedSatelliteSkyState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showManual, setShowManual] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Mobile Compass Sync State
  const [sessionId, setSessionId] = useState<string>(() => Math.random().toString(36).substring(2, 10));
  const [mobileOrientation, setMobileOrientation] = useState<{ heading: number; pitch: number; roll?: number } | null>(null);
  const [mobileSightMode, setMobileSightMode] = useState<"ar" | "track">("track");
  const [isMobileSynced, setIsMobileSynced] = useState<boolean>(false);
  const [mobileSyncUrl, setMobileSyncUrl] = useState<string>("");

  const handleRegenerateSession = useCallback(() => {
    const newId = Math.random().toString(36).substring(2, 10);
    setSessionId(newId);
    setMobileOrientation(null);
    setIsMobileSynced(false);
    showToast(`🔄 New QR Session Generated: #${newId}`);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentOrigin = window.location.origin;
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (!isLocalhost) {
      // Deployed host (Vercel/Production): Always use public origin URL
      setMobileSyncUrl(`${currentOrigin}/stargaze/compass-sync?session=${sessionId}`);
      return;
    }

    // Local dev server fallback (for testing on LAN IP)
    let isMounted = true;
    async function resolveLocalIpUrl() {
      try {
        const res = await fetch("/api/stargaze/local-ip");
        const data = await res.json();
        if (isMounted) {
          const port = window.location.port || "3000";
          const protocol = window.location.protocol;
          if (data.ip && data.ip !== "localhost" && data.ip !== "127.0.0.1") {
            setMobileSyncUrl(`${protocol}//${data.ip}:${port}/stargaze/compass-sync?session=${sessionId}`);
          } else {
            setMobileSyncUrl(`${currentOrigin}/stargaze/compass-sync?session=${sessionId}`);
          }
        }
      } catch {
        if (isMounted) {
          setMobileSyncUrl(`${currentOrigin}/stargaze/compass-sync?session=${sessionId}`);
        }
      }
    }
    resolveLocalIpUrl();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Telemetry Polling Loop & BroadcastChannel from Mobile to Desktop
  useEffect(() => {
    let isSubscribed = true;

    // 1. Instant local BroadcastChannel tab sync listener
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("stargaze_compass_channel");
      channel.onmessage = (event) => {
        if (!isSubscribed) return;
        if (event.data && event.data.type === "COMPASS_TELEMETRY" && event.data.sessionId === sessionId) {
          setMobileOrientation({
            heading: event.data.heading,
            pitch: event.data.pitch,
            roll: event.data.roll || 0,
          });
          setIsMobileSynced(true);
        }
      };
    }

    // 2. HTTP Polling Fallback
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/stargaze/compass-sync?session=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (isSubscribed && data.connected && data.data) {
          setMobileOrientation({
            heading: data.data.heading,
            pitch: data.data.pitch,
            roll: data.data.roll || 0,
          });
          setIsMobileSynced(true);
        } else if (isSubscribed && !data.connected && !channel) {
          setIsMobileSynced(false);
          setMobileOrientation(null);
        }
      } catch {
        /* skip network hiccups */
      }
    }, 80);

    return () => {
      isSubscribed = false;
      if (channel) channel.close();
      clearInterval(interval);
    };
  }, [sessionId]);

  // Toggle 180° Free Dome View vs Fixed Observer Perspective View
  const toggle180DomeView = useCallback(() => {
    setIs180DomeView((prev) => {
      const next = !prev;
      if (next) {
        showToast("🔭 Mode: 180° Free 3D Dome View Enabled");
        if (controlsRef.current) {
          controlsRef.current.object.position.set(0, 240, 320);
          controlsRef.current.target.set(0, 60, 0);
          controlsRef.current.update();
        }
      } else {
        showToast("📱 Mobile Compass QR Sync Active! Scan QR code");
        if (controlsRef.current) {
          controlsRef.current.object.position.set(0, 25, 200);
          controlsRef.current.target.set(0, 25, 0);
          controlsRef.current.update();
        }
      }
      return next;
    });
  }, []);

  // Live Real-Time CelesTrak NORAD TLE Data Catalog State
  const [satCatalog, setSatCatalog] = useState<SatelliteData[]>(DEFAULT_SATELLITE_CATALOG);
  const [tleStatusText, setTleStatusText] = useState<string>("Fetching Live CelesTrak NORAD TLEs...");

  // Fetch fresh live real-time multi-group TLEs from CelesTrak proxy endpoint on mount
  useEffect(() => {
    let isMounted = true;
    async function loadRealTimeTles() {
      try {
        const groups = ["visual", "stations", "bright", "weather", "resource"];
        const fetchPromises = groups.map((g) =>
          fetch(`/api/orbital?group=${g}&format=tle`)
            .then((r) => (r.ok ? r.text() : ""))
            .catch(() => "")
        );
        const results = await Promise.all(fetchPromises);
        const combinedText = results.join("\n");
        const liveSats = parseTleText(combinedText, "Active");

        if (liveSats.length >= 5 && isMounted) {
          setSatCatalog(liveSats);
          setTleStatusText(`CelesTrak Multi-Group Live API (${liveSats.length} Real TLEs)`);
          showToast(`📡 CelesTrak NORAD API: Synchronized ${liveSats.length} Real Satellites`);
        }
      } catch (err) {
        console.warn("Using built-in NORAD TLE catalog fallback", err);
        if (isMounted) setTleStatusText("Built-in NORAD Catalog (Offline Fallback)");
      }
    }
    loadRealTimeTles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Time simulation playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentDate((prev) => new Date(prev.getTime() + 1000 * timeMultiplier));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, timeMultiplier]);

  // Observer Sun Elevation & Twilight Physics State
  const observerSunCoords = useMemo(
    () =>
      computeObserverSunCoords(
        currentObserver.lat,
        currentObserver.lon,
        currentObserver.altMeters || 10,
        currentDate
      ),
    [currentObserver.lat, currentObserver.lon, currentObserver.altMeters, currentDate]
  );

  // Compute satellite states with 3D trajectories for overhead & selected satellites
  const allSatellites = useMemo(
    () =>
      getAllSatelliteStates(
        currentObserver.lat,
        currentObserver.lon,
        currentObserver.altMeters || 10,
        currentDate,
        SKY_RADIUS,
        selectedSat?.id,
        satCatalog
      ),
    [currentObserver.lat, currentObserver.lon, currentObserver.altMeters, currentDate, selectedSat?.id, satCatalog]
  );

  const detailedSelectedSat = useMemo(() => {
    if (!selectedSat) return null;
    return allSatellites.find((s) => s.id === selectedSat.id) || selectedSat;
  }, [selectedSat, allSatellites]);

  // Physics-Driven Filter: Visible in 24h, Overhead Now, or Naked-Eye Visible
  const filteredSatellites = useMemo(() => {
    return allSatellites.filter((sat) => {
      if (selectedCategory === "Naked-Eye Visible") {
        if (!sat.isNakedEyeVisible) return false;
      } else if (selectedCategory === "Visible in 24 Hours") {
        if (!sat.hasUpcomingPassIn24h && !sat.isAboveHorizon) return false;
      } else if (selectedCategory === "Overhead Now") {
        if (!sat.isAboveHorizon) return false;
      }
      const matchSearch =
        sat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sat.id.toString().includes(searchQuery);
      return matchSearch;
    });
  }, [allSatellites, selectedCategory, searchQuery]);

  const visibleCount = useMemo(
    () => allSatellites.filter((s) => s.isAboveHorizon).length,
    [allSatellites]
  );

  const visible24hCount = useMemo(
    () => allSatellites.filter((s) => s.hasUpcomingPassIn24h || s.isAboveHorizon).length,
    [allSatellites]
  );

  const nakedEyeCount = useMemo(
    () => allSatellites.filter((s) => s.isNakedEyeVisible).length,
    [allSatellites]
  );

  // Telescope Track Satellite
  const handleTrackSatellite = (sat: ComputedSatelliteSkyState) => {
    setSelectedSat(sat);
    showToast(`Precision Lock: ${sat.name}`);
    if (controlsRef.current) {
      const targetVec = sat.vec3;
      controlsRef.current.target.set(targetVec.x * 0.25, targetVec.y * 0.25, targetVec.z * 0.25);
      controlsRef.current.update();
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-[calc(100vh-64px)] bg-slate-950 text-white overflow-hidden select-none font-sans">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3D PLANETARIUM VIEWPORT */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 h-full min-h-[500px]">
        {/* 3D CANVAS (BACKGROUND LAYER CALIBRATED FOR ZENITH VISIBILITY) */}
        <Canvas
          camera={{ fov: 60, position: [0, 240, 320] }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          className="w-full h-full absolute inset-0 z-0"
        >
          <SatelliteTrackerCelestialScene
            observer={currentObserver}
            currentDate={currentDate}
            controlsRef={controlsRef}
            onUpdateHeading={(az) => setHeadingAzimuth(az)}
            showLabels={showLabels}
            showOrbits={showOrbits}
            showGround={showGround}
            showGrid={showGrid}
            selectedSat={detailedSelectedSat}
            satellites={allSatellites}
            onSelectSat={(sat) => handleTrackSatellite(sat)}
            is180DomeView={is180DomeView}
            mobileOrientation={mobileOrientation}
            mobileSightMode={mobileSightMode}
          />
        </Canvas>

        {/* TOP FLOATING OVERLAY TOOLBAR */}
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between flex-wrap gap-2 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/80 border border-slate-800/80 p-2 rounded-2xl backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
              <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
              <select
                className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer max-w-[150px] sm:max-w-[220px] truncate"
                value={currentObserver.name}
                onChange={(e) => {
                  const loc = PRESET_LOCATIONS.find((l) => l.name === e.target.value);
                  if (loc) {
                    setCurrentObserver(loc);
                    showToast(`Site Changed: ${loc.name}`);
                  }
                }}
              >
                <option value={currentObserver.name} className="bg-slate-950 text-white">
                   {currentObserver.name} ({currentObserver.lat.toFixed(2)}°, {currentObserver.lon.toFixed(2)}°)
                </option>
                {PRESET_LOCATIONS.map((loc) => (
                  <option key={loc.name} value={loc.name} className="bg-slate-950 text-white">
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Live GPS Location Sensor Button */}
            <button
              onClick={() => {
                if ("geolocation" in navigator) {
                  showToast("📡 Sensing GPS Location...");
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const userLoc: ObserverCoords = {
                        name: "My GPS Location",
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        altMeters: pos.coords.altitude || 10,
                      };
                      setCurrentObserver(userLoc);
                      showToast(` Geolocation Locked: ${userLoc.lat.toFixed(2)}°, ${userLoc.lon.toFixed(2)}°`);
                    },
                    () => {
                      showToast("⚠️ GPS sensor timeout: Using selected location");
                    }
                  );
                } else {
                  showToast("⚠️ Geolocation API not supported");
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-600 hover:text-white transition text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              title="Detect my exact GPS location to sense passing satellites"
            >
              <Target className="h-3.5 w-3.5 text-emerald-400" />
              <span>Use My Location</span>
            </button>
          </div>

          {/* Preset Camera & Layer Controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/80 border border-slate-800/80 p-1.5 rounded-2xl backdrop-blur-2xl shadow-2xl">
            {mobileOrientation && (
              <button
                onClick={() => {
                  const next = mobileSightMode === "ar" ? "track" : "ar";
                  setMobileSightMode(next);
                  showToast(`📱 Mobile Sight View: ${next === "ar" ? "First-Person AR Sky View" : "Observatory Track View"}`);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                  mobileSightMode === "ar"
                    ? "bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                    : "bg-cyan-950/90 border border-cyan-400 text-cyan-300 hover:bg-cyan-900"
                }`}
                title="Toggle between First-Person AR Sky View and Observatory Track View"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{mobileSightMode === "ar" ? "1st-Person AR View" : "Dome Sight Track"}</span>
              </button>
            )}
            <button
              onClick={toggle180DomeView}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                is180DomeView
                  ? "bg-emerald-600 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  : "bg-slate-900/90 text-slate-400 hover:text-white"
              }`}
              title={
                is180DomeView
                  ? "180° Free 3D View Active (Click to Lock Fixed Observer View)"
                  : "Fixed Observer View Active (Click for 180° Free 3D View)"
              }
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>180° Upper Dome View</span>
            </button>

            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                showLabels ? "bg-emerald-600 text-white font-bold" : "bg-slate-900/90 text-slate-400 hover:text-white"
              }`}
            >
              Labels
            </button>
            <button
              onClick={() => setShowOrbits(!showOrbits)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                showOrbits ? "bg-pink-600 text-white font-bold" : "bg-slate-900/90 text-slate-400 hover:text-white"
              }`}
            >
              Pink Orbits
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                showGrid ? "bg-emerald-600 text-white font-bold" : "bg-slate-900/90 text-slate-400 hover:text-white"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setShowRadar(!showRadar)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                showRadar ? "bg-emerald-600 text-white font-bold" : "bg-slate-900/90 text-slate-400 hover:text-white"
              }`}
            >
              Radar
            </button>
            <button
              onClick={() => setShowSimDock(!showSimDock)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                showSimDock
                  ? "bg-emerald-600 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  : "bg-slate-900/90 text-slate-400 hover:text-white"
              }`}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Simulation Dock</span>
            </button>
          </div>
        </div>

        {/* PHYSICS-DRIVEN LIVE CLOCK & SOLAR ILLUMINATION HUD */}
        <div className="absolute top-20 left-4 z-40 flex flex-col gap-2 pointer-events-auto max-w-[92vw]">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bearing Compass */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold backdrop-blur-2xl flex items-center gap-1.5 shadow-xl">
              <Compass className="h-4 w-4 text-emerald-400 animate-spin-slow" />
              <span>BEARING: {getCardinalText(headingAzimuth)}</span>
            </div>

            {/* Real-Time Simulation Clock HUD */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-amber-300 font-mono text-xs font-bold backdrop-blur-2xl flex items-center gap-1.5 shadow-xl">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>{currentDate.toLocaleTimeString()} ({currentDate.toLocaleDateString()})</span>
            </div>
          </div>

          {/* Solar Illumination Physics Status Panel */}
          {observerSunCoords && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/40 text-slate-200 font-mono text-[11px] font-semibold backdrop-blur-2xl flex items-center gap-2 flex-wrap shadow-xl">
              <span className="text-amber-400 font-bold">☀️ Sun El: {observerSunCoords.elevationDeg.toFixed(1)}°</span>
              <span className="text-slate-600">•</span>
              <span className={observerSunCoords.isDark ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {observerSunCoords.elevationDeg < -18
                  ? "🌌 Astronomical Night"
                  : observerSunCoords.elevationDeg < -12
                  ? "🌃 Nautical Twilight"
                  : observerSunCoords.elevationDeg < -6
                  ? "🌆 Civil Twilight"
                  : "☀️ Daylight (Sky Washed Out)"}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-300 font-bold">
                {nakedEyeCount} Naked-Eye Visible Now
              </span>
            </div>
          )}
        </div>

        {/* Toast Popup */}
        {toastMessage && (
          <div className="absolute top-20 right-4 z-40 bg-slate-950/95 border border-emerald-500/60 text-emerald-300 font-mono text-xs font-bold px-3.5 py-2 rounded-xl shadow-xl backdrop-blur-md animate-in fade-in duration-200 pointer-events-none">
            {toastMessage}
          </div>
        )}

        {/* MOBILE COMPASS QR SYNC MODAL (DISPLAYED WHEN 180° UPPER FREE VIEW IS UNCLICKED / OFF) */}
        {!is180DomeView && (
          <div className="absolute top-20 right-6 z-40 w-80 p-4 rounded-2xl bg-slate-950/95 border-2 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.35)] backdrop-blur-2xl font-mono text-xs animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="font-extrabold text-white tracking-wide">MOBILE COMPASS QR SYNC</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                #{sessionId}
              </span>
            </div>

            {/* QR Code Image (Dynamic QRCodeSVG rendering unique session URL) */}
            <div className="flex flex-col items-center gap-2 my-2">
              <div className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-white border-2 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <QRCodeSVG
                  value={mobileSyncUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/stargaze/compass-sync?session=${sessionId}`}
                  size={160}
                />
              </div>
              <div className="text-[10px] text-slate-300 text-center leading-tight mt-1">
                Scan QR code with your smartphone camera to transmit real-time device compass sensors!
              </div>
            </div>

            {/* Live Connection Telemetry Status Banner */}
            <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[10px] font-bold mt-2 transition ${
              isMobileSynced
                ? "bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "bg-slate-900/90 border-amber-500/40 text-amber-300"
            }`}>
              {isMobileSynced ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 animate-bounce" />
                  <div>
                    <div>CONNECTED &amp; TRACKING LIVE!</div>
                    <div className="text-[9px] text-emerald-200">AZ: {mobileOrientation?.heading}° | EL: {mobileOrientation?.pitch}°</div>
                  </div>
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                  <div>
                    <div>WAITING FOR PHONE SCAN</div>
                    <div className="text-[9px] text-slate-400">Scan QR to sync line of sight</div>
                  </div>
                </>
              )}
            </div>

            {/* Manual Link / Controller Launcher */}
            <a
              href={mobileSyncUrl || `/stargaze/compass-sync?session=${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 w-full py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] flex items-center justify-center gap-1.5 transition font-semibold"
            >
              <Link2 className="h-3 w-3 text-emerald-400" />
              <span>Launch Mobile Sync Controller</span>
            </a>

            {/* Manual Regenerate Unique Session Button */}
            <button
              onClick={handleRegenerateSession}
              className="mt-2 w-full py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 hover:bg-emerald-950 text-emerald-300 hover:text-emerald-200 text-[10px] flex items-center justify-center gap-1.5 transition font-bold shadow-sm"
            >
              <RotateCcw className="h-3 w-3 text-emerald-400" />
              <span>Generate New Unique QR Session</span>
            </button>
          </div>
        )}

        {/* 2D PLANISPHERE RADAR OVERLAY (UNCROPPED AT BOTTOM-36 LEFT-6) */}
        {showRadar && (
          <div className="absolute bottom-36 left-6 z-40 pointer-events-auto flex flex-col items-center gap-1.5 shadow-2xl">
            <Planisphere2DRadar
              satellites={allSatellites}
              selectedSatId={selectedSat ? selectedSat.id : null}
              onSelectSat={(sat) => handleTrackSatellite(sat)}
            />
            <div className="text-[10px] font-mono font-extrabold text-emerald-300 bg-slate-950/95 px-3 py-1 rounded-full border border-emerald-500/50 backdrop-blur-md shadow-lg">
              2D PLANISPHERE RADAR
            </div>
          </div>
        )}

        {/* UNIFIED 24-HOUR SIMULATION CONTROL DASHBOARD DOCK */}
        {showSimDock && (
          <div className={`absolute bottom-36 z-50 w-[340px] sm:w-[410px] flex flex-col gap-2.5 p-3.5 rounded-2xl bg-slate-950/95 border-2 border-emerald-500/60 backdrop-blur-2xl shadow-[0_0_35px_rgba(16,185,129,0.35)] pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-200 ${
            showRadar ? "left-6 sm:left-[256px]" : "left-6"
          }`}>
            {/* Header label */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                <Play className="h-3.5 w-3.5 text-emerald-400" />
                <span>24-HOUR ORBIT SIMULATOR</span>
              </div>
              <button
                onClick={() => {
                  setShowSimDock(false);
                  showToast("🙈 Simulation Dock Hidden");
                }}
                className="text-slate-400 hover:text-white text-xs px-1 font-bold"
                title="Hide Simulation Dock"
              >
                ✕
              </button>
            </div>

            {/* Top Control Bar: Play/Pause, Speed & Live Clock */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs shadow-md ${
                    isPlaying
                      ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      : "bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                {/* Speed Multipliers */}
                <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 text-xs font-mono">
                  {[
                    { label: "1x", val: 1 },
                    { label: "10x", val: 10 },
                    { label: "1m/s", val: 60 },
                    { label: "5m/s", val: 300 },
                    { label: "1h/s", val: 3600 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setTimeMultiplier(item.val)}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        timeMultiplier === item.val
                          ? "bg-emerald-600 text-white font-extrabold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setCurrentDate(new Date());
                    setTimeMultiplier(1);
                    setSimOffsetMinutes(0);
                    setIsPlaying(true);
                    showToast("⏰ Reset to Live Time");
                  }}
                  className="p-1 px-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1"
                  title="Reset Time to Current Moment"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Now</span>
                </button>
              </div>

              {/* Quick Fast-Forward Simulation Actions */}
              <div className="flex items-center gap-1.5 w-full">
                <button
                  onClick={() => {
                    if (detailedSelectedSat?.passDetails) {
                      showToast(`⏩ Simulating ${detailedSelectedSat.name} Pass`);
                      setIsPlaying(true);
                      setTimeMultiplier(60);
                    } else {
                      showToast("⏩ Simulating Next 24h Satellite Pass");
                      setTimeMultiplier(300);
                      setIsPlaying(true);
                    }
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition flex items-center justify-center gap-1 shadow-md"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Simulate Next Pass</span>
                </button>

                <button
                  onClick={() => {
                    setTimeMultiplier(3600);
                    setIsPlaying(true);
                    showToast("⚡ 24-Hour Fast Scan (1h/sec)");
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl font-bold bg-pink-600 hover:bg-pink-500 text-white text-xs transition flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(236,72,153,0.5)] font-extrabold"
                >
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  <span>Fast 24h Scan</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: 24-Hour Interactive Timeline Scrubber Slider */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/80">
              <Sliders className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">24h Timeline:</span>
              <input
                type="range"
                min="0"
                max="1440"
                value={simOffsetMinutes}
                onChange={(e) => {
                  const mins = parseInt(e.target.value);
                  setSimOffsetMinutes(mins);
                  const simTime = new Date(Date.now() + mins * 60 * 1000);
                  setCurrentDate(simTime);
                }}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <span className="font-mono text-[10px] font-extrabold text-emerald-300 min-w-[50px] text-right shrink-0">
                +{Math.floor(simOffsetMinutes / 60)}h {simOffsetMinutes % 60}m
              </span>
            </div>
          </div>
        )}

        {/* SELECTED SATELLITE DETAILED TELEMETRY OVERLAY CARD (DISPLAYED ONLY WHEN SATELLITE IS TOUCHED / SELECTED) */}
        {detailedSelectedSat && (
          <div className="absolute bottom-36 right-6 z-40 w-full sm:w-[380px] max-h-[calc(100vh-200px)] overflow-y-auto p-4 rounded-2xl bg-slate-950/95 border-2 border-emerald-500/70 shadow-[0_0_40px_rgba(16,185,129,0.3)] backdrop-blur-2xl font-sans animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛰️</span>
                <div>
                  <div className="font-extrabold text-white text-sm tracking-wide">{detailedSelectedSat.name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-medium">
                    {detailedSelectedSat.category} • NORAD #{detailedSelectedSat.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSat(null)}
                className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center justify-center transition shadow-md"
                title="Close satellite details"
              >
                ✕
              </button>
            </div>

            {/* Primary Satellite Physics Grid: Magnitude, Inclination, Elevation & Altitude */}
            <div className="grid grid-cols-4 gap-1.5 text-[10px] text-slate-200 bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/30 mb-3 font-mono">
              <div>
                <div className="text-slate-400 text-[9px]">Magnitude</div>
                <div className="font-bold text-amber-400 text-xs">
                  {detailedSelectedSat.visualMagnitude ? (detailedSelectedSat.visualMagnitude > 0 ? `+${detailedSelectedSat.visualMagnitude.toFixed(1)}` : detailedSelectedSat.visualMagnitude.toFixed(1)) : "+2.5"}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[9px]">Inclination</div>
                <div className="font-bold text-purple-300 text-xs">{detailedSelectedSat.inclinationDeg.toFixed(1)}°</div>
              </div>
              <div>
                <div className="text-slate-400 text-[9px]">Elevation</div>
                <div className="font-bold text-emerald-300 text-xs">{detailedSelectedSat.elevationDeg.toFixed(1)}°</div>
              </div>
              <div>
                <div className="text-slate-400 text-[9px]">Altitude</div>
                <div className="font-bold text-cyan-300 text-xs">{Math.round(detailedSelectedSat.satAltitudeKm)} km</div>
              </div>
            </div>

            {/* Scientific Precision Coordinates Grid */}
            {detailedSelectedSat.coordsEq && (
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-200 bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/30 mb-3 font-mono">
                <div>
                  <div className="text-slate-400">🌐 Right Ascension (RA)</div>
                  <div className="font-bold text-emerald-300">{detailedSelectedSat.coordsEq.raStr}</div>
                </div>
                <div>
                  <div className="text-slate-400">📐 Declination (Dec)</div>
                  <div className="font-bold text-emerald-300">{detailedSelectedSat.coordsEq.decStr}</div>
                </div>
              </div>
            )}

            {/* HIGH-PRECISION PASS GRAPH */}
            {detailedSelectedSat.passGraphPoints && (
              <SatellitePassGraph
                points={detailedSelectedSat.passGraphPoints}
                liveElevationDeg={detailedSelectedSat.elevationDeg}
              />
            )}

            {/* 24-HOUR PASS TRAJECTORY LABELS CARD */}
            <PassTrajectoryDetailsCard sat={detailedSelectedSat} />

            <button
              onClick={() => handleTrackSatellite(detailedSelectedSat)}
              className="w-full py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs transition flex items-center justify-center gap-1.5 shadow-lg"
            >
              <Target className="h-4 w-4" />
              <span>AIM ROBOT SIGHT & TRACK CAMERA</span>
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* RIGHT SIDE PANEL: NEATLY RESTRUCTURED TELEMETRY PANEL (FULL FRAME) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="w-full md:w-[380px] shrink-0 bg-slate-950/90 border-l border-slate-800/80 p-4 flex flex-col justify-between z-30 pointer-events-auto backdrop-blur-2xl h-full overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-3 mb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="font-extrabold text-sm text-slate-100 font-sans tracking-wide">
                  24-Hour Sky Pass Telemetry
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                {visible24hCount} Visible in 24h ({visibleCount} Overhead)
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/40 mt-1">
              <span>📡 TLE PROVENANCE:</span>
              <span className="font-bold text-emerald-200">{tleStatusText}</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Satellite / NORAD ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/60 font-mono"
            />
          </div>

          {/* Filter Tabs: Strictly Visible in Next 24 Hours, Naked-Eye Visible, or Overhead Now */}
          <div className="flex items-center gap-1 mb-3.5 text-[10px] font-medium shrink-0">
            <button
              onClick={() => setSelectedCategory("Visible in 24 Hours")}
              className={`flex-1 py-1.5 px-2 rounded-xl transition text-center font-bold flex items-center justify-center gap-1 ${
                selectedCategory === "Visible in 24 Hours"
                  ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "bg-slate-900/80 text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>Visible 24h ({visible24hCount})</span>
            </button>

            <button
              onClick={() => setSelectedCategory("Naked-Eye Visible")}
              className={`flex-1 py-1.5 px-2 rounded-xl transition text-center font-bold flex items-center justify-center gap-1 ${
                selectedCategory === "Naked-Eye Visible"
                  ? "bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] font-extrabold"
                  : "bg-slate-900/80 text-slate-400 hover:text-white"
              }`}
              title="Physically Visible to the Human Eye (Sunlit + Dark Sky + Mag <= 6.0)"
            >
              <Eye className="h-3 w-3" />
              <span>Naked Eye ({nakedEyeCount})</span>
            </button>

            <button
              onClick={() => setSelectedCategory("Overhead Now")}
              className={`py-1.5 px-2.5 rounded-xl transition text-center font-bold ${
                selectedCategory === "Overhead Now"
                  ? "bg-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.4)]"
                  : "bg-slate-900/80 text-slate-400 hover:text-white"
              }`}
            >
              <span>Overhead ({visibleCount})</span>
            </button>
          </div>

          {/* Satellite Telemetry List (FULL FRAME FLEX-1 EXPANDED) */}
          <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 text-xs">
            {filteredSatellites.map((sat) => {
              const isSelected = selectedSat?.id === sat.id;
              const catStyle = getSatelliteCategoryStyle(sat.category, sat.name);

              return (
                <div
                  key={sat.id}
                  onClick={() => handleTrackSatellite(sat)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? "bg-slate-900/90 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                      : sat.isAboveHorizon
                      ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                      : "bg-slate-950/40 border-slate-900 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catStyle.colorHex }} />
                      <span className="font-extrabold text-white text-xs truncate max-w-[130px]">
                        {sat.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${catStyle.badgeClass}`}>
                        {catStyle.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {sat.isNakedEyeVisible && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                          👁️ NAKED EYE
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                          sat.isAboveHorizon
                            ? sat.isSunlit
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {sat.isAboveHorizon ? (sat.isSunlit ? "☀️ SUNLIT" : "🌑 ECLIPSED") : "Pass in 24h"}
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-300 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 mb-2 font-mono">
                    <div>
                      <div className="text-slate-500">Elevation</div>
                      <div className="font-bold text-emerald-300">{sat.elevationDeg.toFixed(1)}°</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Azimuth</div>
                      <div className="font-bold text-emerald-300">{Math.round(sat.azimuthDeg)}°</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Sat Alt</div>
                      <div className="font-bold text-amber-300">{Math.round(sat.satAltitudeKm)} km</div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackSatellite(sat);
                    }}
                    className={`w-full py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1 text-[10px] ${
                      isSelected
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-md"
                        : "bg-slate-900 border border-slate-800 text-emerald-300 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    <span>{isSelected ? " SIGHT LOCKED" : "AIM ROBOT SIGHT & TRACK"}</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between mt-3 shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span>Scientific SGP4 Physics</span>
          </div>
          <button
            onClick={() => setShowManual(true)}
            className="text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1 cursor-pointer"
          >
            <BookOpen className="h-3 w-3" />
            <span>User Manual</span>
          </button>
        </div>
      </div>

      {/* FIXED FLOATING MANUAL BUTTON AT VERY RIGHTMOST BOTTOM CORNER OF SCREEN */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setShowManual(true)}
        className="fixed bottom-5 right-5 z-[9999] px-4 py-2.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-extrabold text-xs flex items-center gap-2.5 shadow-[0_0_30px_rgba(16,185,129,0.4)] backdrop-blur-2xl transition pointer-events-auto font-mono tracking-wider group cursor-pointer"
        title="Open StarGazer Operational & Scientific Manual"
      >
        <BookOpen className="h-4 w-4 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
        <span className="uppercase">StarGazer Manual</span>
      </motion.button>

      {/* STARGAZER USER & SCIENTIFIC MANUAL MODAL */}
      {showManual && <StarGazerManualModal onClose={() => setShowManual(false)} />}
    </div>
  );
}
