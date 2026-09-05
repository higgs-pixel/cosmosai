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
  Navigation,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Satellite,
  Crosshair,
  ArrowUp,
  ArrowDown,
  Layers,
  ShieldCheck,
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
// GOLDEN RECTANGLE CURVED FIELD VIEW (±10° UPWARD & DOWNWARD, FIXED TO BLUE SIGHT)
// ─────────────────────────────────────────────────────────────────────────────
// The golden rectangle curvature is symmetrically anchored at ±10° (+10° upward,
// -10° downward) directly centered on and fixed to the bot's blue line of sight.
// Color: Glowing Golden/Amber (#ffd700 / #fbbf24 / #f59e0b) with bright cyan-blue anchor.
function HumanPrimaryGazeField({
  radius = 236,
  opacity = 0.36,
}: {
  radius?: number;
  opacity?: number;
}) {
  const upDeg = 10; // +10° Upward angle
  const downDeg = 10; // -10° Downward angle
  const hSpanDeg = 60; // Golden rectangle curved horizontal field span (±30°)

  const upRad = (upDeg * Math.PI) / 180;
  const downRad = (-downDeg * Math.PI) / 180;
  const hHalfRad = ((hSpanDeg / 2) * Math.PI) / 180;

  const {
    visorGeometry,
    topArc,
    bottomArc,
    leftBorder,
    rightBorder,
    horizonArc,
    vertGazeMeridian,
    frustumWallGeo,
  } = useMemo(() => {
    const apex = new THREE.Vector3(0, 2.2, 0);
    const numH = 48;
    const numV = 24;

    // Curved visor mesh vertices & indices
    const verts: number[] = [];
    const indices: number[] = [];

    for (let j = 0; j <= numV; j++) {
      const vFrac = j / numV;
      // Interpolate from downward (-10°) to upward (+10°)
      const phi = downRad + vFrac * (upRad - downRad);
      for (let i = 0; i <= numH; i++) {
        const hFrac = i / numH;
        // Azimuth from -hHalfRad to +hHalfRad
        const theta = -hHalfRad + hFrac * (hHalfRad * 2);
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.sin(phi) + 2.2;
        const z = radius * Math.cos(theta) * Math.cos(phi);
        verts.push(x, y, z);
      }
    }

    for (let j = 0; j < numV; j++) {
      for (let i = 0; i < numH; i++) {
        const row1 = j * (numH + 1);
        const row2 = (j + 1) * (numH + 1);
        const a = row1 + i;
        const b = row1 + i + 1;
        const c = row2 + i;
        const d = row2 + i + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const visorGeo = new THREE.BufferGeometry();
    visorGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    visorGeo.setIndex(indices);
    visorGeo.computeVertexNormals();

    // Top boundary arc (+10° Upward)
    const topPts: THREE.Vector3[] = [];
    for (let i = 0; i <= numH; i++) {
      const theta = -hHalfRad + (i / numH) * (hHalfRad * 2);
      const x = radius * Math.sin(theta) * Math.cos(upRad);
      const y = radius * Math.sin(upRad) + 2.2;
      const z = radius * Math.cos(theta) * Math.cos(upRad);
      topPts.push(new THREE.Vector3(x, y, z));
    }

    // Bottom boundary arc (-10° Downward)
    const botPts: THREE.Vector3[] = [];
    for (let i = 0; i <= numH; i++) {
      const theta = -hHalfRad + (i / numH) * (hHalfRad * 2);
      const x = radius * Math.sin(theta) * Math.cos(downRad);
      const y = radius * Math.sin(downRad) + 2.2;
      const z = radius * Math.cos(theta) * Math.cos(downRad);
      botPts.push(new THREE.Vector3(x, y, z));
    }

    // Left border (connecting -10° to +10° at -hHalfRad)
    const leftPts: THREE.Vector3[] = [];
    for (let j = 0; j <= numV; j++) {
      const phi = downRad + (j / numV) * (upRad - downRad);
      const x = radius * Math.sin(-hHalfRad) * Math.cos(phi);
      const y = radius * Math.sin(phi) + 2.2;
      const z = radius * Math.cos(-hHalfRad) * Math.cos(phi);
      leftPts.push(new THREE.Vector3(x, y, z));
    }

    // Right border (connecting -10° to +10° at +hHalfRad)
    const rightPts: THREE.Vector3[] = [];
    for (let j = 0; j <= numV; j++) {
      const phi = downRad + (j / numV) * (upRad - downRad);
      const x = radius * Math.sin(hHalfRad) * Math.cos(phi);
      const y = radius * Math.sin(phi) + 2.2;
      const z = radius * Math.cos(hHalfRad) * Math.cos(phi);
      rightPts.push(new THREE.Vector3(x, y, z));
    }

    // 0° Eye-level Horizon Meridian Arc (fixed on blue line of sight)
    const horizPts: THREE.Vector3[] = [];
    for (let i = 0; i <= numH; i++) {
      const theta = -hHalfRad + (i / numH) * (hHalfRad * 2);
      const x = radius * Math.sin(theta);
      const y = 2.2;
      const z = radius * Math.cos(theta);
      horizPts.push(new THREE.Vector3(x, y, z));
    }

    // Central Vertical Gaze Meridian (0° azimuth from -10° to +10°)
    const vertGazePts: THREE.Vector3[] = [];
    for (let j = 0; j <= numV; j++) {
      const phi = downRad + (j / numV) * (upRad - downRad);
      const x = 0;
      const y = radius * Math.sin(phi) + 2.2;
      const z = radius * Math.cos(phi);
      vertGazePts.push(new THREE.Vector3(x, y, z));
    }

    // Volumetric Side Frustum walls connecting apex to outer boundary
    const fVerts: number[] = [];
    // Top wall
    for (let i = 0; i < numH; i++) {
      fVerts.push(apex.x, apex.y, apex.z, topPts[i].x, topPts[i].y, topPts[i].z, topPts[i + 1].x, topPts[i + 1].y, topPts[i + 1].z);
    }
    // Bottom wall
    for (let i = 0; i < numH; i++) {
      fVerts.push(apex.x, apex.y, apex.z, botPts[i + 1].x, botPts[i + 1].y, botPts[i + 1].z, botPts[i].x, botPts[i].y, botPts[i].z);
    }
    // Left wall
    for (let j = 0; j < numV; j++) {
      fVerts.push(apex.x, apex.y, apex.z, leftPts[j].x, leftPts[j].y, leftPts[j].z, leftPts[j + 1].x, leftPts[j + 1].y, leftPts[j + 1].z);
    }
    // Right wall
    for (let j = 0; j < numV; j++) {
      fVerts.push(apex.x, apex.y, apex.z, rightPts[j + 1].x, rightPts[j + 1].y, rightPts[j + 1].z, rightPts[j].x, rightPts[j].y, rightPts[j].z);
    }

    const frustumGeo = new THREE.BufferGeometry();
    frustumGeo.setAttribute("position", new THREE.Float32BufferAttribute(fVerts, 3));
    frustumGeo.computeVertexNormals();

    return {
      visorGeometry: visorGeo,
      topArc: topPts,
      bottomArc: botPts,
      leftBorder: leftPts,
      rightBorder: rightPts,
      horizonArc: horizPts,
      vertGazeMeridian: vertGazePts,
      frustumWallGeo: frustumGeo,
    };
  }, [radius, upRad, downRad, hHalfRad]);

  return (
    <group>
      {/* Volumetric Frustum Walls (Subtle Translucent Gold/Amber) */}
      <mesh geometry={frustumWallGeo}>
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={opacity * 0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Main Curved Visor Canopy (Luminous Golden Amber Surface) */}
      <mesh geometry={visorGeometry}>
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Top Arc Boundary (+10° Upward) */}
      <Line
        points={topArc}
        color="#ffd700"
        lineWidth={3.6}
        transparent
        opacity={0.98}
      />

      {/* Bottom Arc Boundary (-10° Downward) */}
      <Line
        points={bottomArc}
        color="#ffd700"
        lineWidth={3.6}
        transparent
        opacity={0.98}
      />

      {/* Left & Right Outer Edges */}
      <Line
        points={leftBorder}
        color="#fbbf24"
        lineWidth={2.8}
        transparent
        opacity={0.9}
      />
      <Line
        points={rightBorder}
        color="#fbbf24"
        lineWidth={2.8}
        transparent
        opacity={0.9}
      />

      {/* Eye Level 0° Horizon Arc (Golden Center Meridian) */}
      <Line
        points={horizonArc}
        color="#fef08a"
        lineWidth={2.6}
        transparent
        opacity={0.9}
      />

      {/* Central Vertical Sight Line (Prime Meridian) */}
      <Line
        points={vertGazeMeridian}
        color="#fef08a"
        lineWidth={2.6}
        transparent
        opacity={0.9}
      />

      {/* Reticle Node Anchoring Golden Rectangle Curvature to Blue Line of Sight */}
      <mesh position={[0, 2.2, radius]}>
        <ringGeometry args={[1.5, 2.6, 32]} />
        <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 2.2, radius]}>
        <ringGeometry args={[0.3, 0.9, 16]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.95} />
      </mesh>

    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN EYE BINOCULAR FIELD OF VIEW GEOMETRY (200°-220° HORIZ × 130°-150° VERT)
// ─────────────────────────────────────────────────────────────────────────────
// The combined human binocular visual field spans 210° horizontally (±105°)
// and 140° vertically (±70°), representing the exact natural human line of sight.
function HumanBinocularSightField({
  color,
  opacity = 0.22,
}: {
  color: string;
  opacity?: number;
}) {
  const radius = 240;
  const hDeg = 210; // Combined binocular horizontal span (200° to 220°)
  const vDeg = 140; // Combined binocular vertical span (130° to 150°)
  const hRadHalf = ((hDeg / 2) * Math.PI) / 180; // 105° in radians
  const vRadHalf = ((vDeg / 2) * Math.PI) / 180; // 70° in radians

  const { canopyGeometry, frustumGeometry, perimeterPoints, binocularOverlapPoints, horizMeridian, vertMeridian } = useMemo(() => {
    const apex = new THREE.Vector3(0, 2.2, 0);
    const numSegments = 64;

    // Outer perimeter boundary points (210° H × 140° V ellipse on sphere)
    const perimPts: THREE.Vector3[] = [];
    for (let i = 0; i <= numSegments; i++) {
      const u = (i / numSegments) * Math.PI * 2;
      const th = hRadHalf * Math.sin(u);
      const ph = vRadHalf * Math.cos(u);
      const x = radius * Math.sin(th) * Math.cos(ph);
      const y = radius * Math.sin(ph) + 2.2;
      const z = radius * Math.cos(th) * Math.cos(ph);
      perimPts.push(new THREE.Vector3(x, y, z));
    }

    // Binocular central overlap loop (~120° H × 120° V)
    const overlapPts: THREE.Vector3[] = [];
    const stereoRad = (60 * Math.PI) / 180;
    for (let i = 0; i <= 48; i++) {
      const u = (i / 48) * Math.PI * 2;
      const th = stereoRad * Math.sin(u);
      const ph = stereoRad * Math.cos(u);
      const x = radius * Math.sin(th) * Math.cos(ph);
      const y = radius * Math.sin(ph) + 2.2;
      const z = radius * Math.cos(th) * Math.cos(ph);
      overlapPts.push(new THREE.Vector3(x, y, z));
    }

    // Horizontal Meridian Arc (210° horizontal equator)
    const hArc: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) {
      const t = -hRadHalf + (i / 36) * (hRadHalf * 2);
      hArc.push(new THREE.Vector3(radius * Math.sin(t), 2.2, radius * Math.cos(t)));
    }

    // Vertical Meridian Arc (140° vertical prime meridian)
    const vArc: THREE.Vector3[] = [];
    for (let i = 0; i <= 36; i++) {
      const t = -vRadHalf + (i / 36) * (vRadHalf * 2);
      vArc.push(new THREE.Vector3(0, radius * Math.sin(t) + 2.2, radius * Math.cos(t)));
    }

    // Volumetric Frustum Walls (Triangle fan connecting apex to perimeter)
    const frustumVerts: number[] = [];
    for (let i = 0; i < numSegments; i++) {
      const p1 = perimPts[i];
      const p2 = perimPts[i + 1];
      frustumVerts.push(apex.x, apex.y, apex.z);
      frustumVerts.push(p1.x, p1.y, p1.z);
      frustumVerts.push(p2.x, p2.y, p2.z);
    }
    const frustumGeo = new THREE.BufferGeometry();
    frustumGeo.setAttribute("position", new THREE.Float32BufferAttribute(frustumVerts, 3));
    frustumGeo.computeVertexNormals();

    // Spherical Curved Canopy Surface (Lat/Lon grid over binocular ellipse)
    const rings = 8;
    const ringSegments = 48;
    const canopyVerts: number[] = [];
    const canopyIndices: number[] = [];

    canopyVerts.push(0, 2.2, radius);

    for (let rStep = 1; rStep <= rings; rStep++) {
      const rFrac = rStep / rings;
      for (let s = 0; s < ringSegments; s++) {
        const u = (s / ringSegments) * Math.PI * 2;
        const th = rFrac * hRadHalf * Math.sin(u);
        const ph = rFrac * vRadHalf * Math.cos(u);
        const x = radius * Math.sin(th) * Math.cos(ph);
        const y = radius * Math.sin(ph) + 2.2;
        const z = radius * Math.cos(th) * Math.cos(ph);
        canopyVerts.push(x, y, z);
      }
    }

    for (let s = 0; s < ringSegments; s++) {
      const next = (s + 1) % ringSegments;
      canopyIndices.push(0, s + 1, next + 1);
    }

    for (let rStep = 1; rStep < rings; rStep++) {
      const curRingStart = 1 + (rStep - 1) * ringSegments;
      const nextRingStart = 1 + rStep * ringSegments;
      for (let s = 0; s < ringSegments; s++) {
        const next = (s + 1) % ringSegments;
        const c1 = curRingStart + s;
        const c2 = curRingStart + next;
        const n1 = nextRingStart + s;
        const n2 = nextRingStart + next;
        canopyIndices.push(c1, n1, c2);
        canopyIndices.push(c2, n1, n2);
      }
    }

    const canopyGeo = new THREE.BufferGeometry();
    canopyGeo.setAttribute("position", new THREE.Float32BufferAttribute(canopyVerts, 3));
    canopyGeo.setIndex(canopyIndices);
    canopyGeo.computeVertexNormals();

    return {
      canopyGeometry: canopyGeo,
      frustumGeometry: frustumGeo,
      perimeterPoints: perimPts,
      binocularOverlapPoints: overlapPts,
      horizMeridian: hArc,
      vertMeridian: vArc,
    };
  }, [radius, hRadHalf, vRadHalf]);

  return (
    <group>
      {/* 1. Volumetric Human Field Frustum Walls */}
      <mesh geometry={frustumGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.75}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Spherical Front Canopy */}
      <mesh geometry={canopyGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Outer Binocular Perimeter Boundary (210°H × 140°V) */}
      <Line
        points={perimeterPoints}
        color={color}
        lineWidth={2.8}
        transparent
        opacity={0.85}
      />

      {/* 4. Binocular Stereo Overlap Ring (Central 120° stereoscopic zone) */}
      <Line
        points={binocularOverlapPoints}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={0.5}
      />

      {/* 5. Horizontal Meridian Arc (210° Equatorial Span) */}
      <Line
        points={horizMeridian}
        color={color}
        lineWidth={1.8}
        transparent
        opacity={0.65}
      />

      {/* 6. Vertical Meridian Arc (140° Vertical Span) */}
      <Line
        points={vertMeridian}
        color={color}
        lineWidth={1.8}
        transparent
        opacity={0.65}
      />

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
  isAimLocked = false,
  isGuideActive = false,
  onAligned,
}: {
  targetSat: ComputedSatelliteSkyState | null;
  satellites: ComputedSatelliteSkyState[];
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
  mobileOrientation?: { heading: number; pitch: number; roll?: number } | null;
  isAimLocked?: boolean;
  isGuideActive?: boolean;
  onAligned?: () => void;
}) {
  const domeRef = useRef<THREE.Group>(null);
  const guideDomeRef = useRef<THREE.Group>(null);
  const currentQuat = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const guideQuat = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const isInitialized = useRef<boolean>(false);
  const isGuideInitialized = useRef<boolean>(false);
  const lastAlignedTrigger = useRef<number>(0);

  useFrame(({ clock }, delta) => {
    if (!domeRef.current) return;

    // Condition: When aiming at satellite, bot sight locks onto the satellite directly!
    // Even when phone is synced, tracking the satellite takes precedence when aim is locked.
    const shouldTrackSatellite = Boolean(targetSat && (isAimLocked || !mobileOrientation));

    if (shouldTrackSatellite && targetSat) {
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

      if (!isInitialized.current) {
        currentQuat.current.copy(targetQuat);
        isInitialized.current = true;
      } else {
        if (currentQuat.current.dot(targetQuat) < 0) {
          targetQuat.x = -targetQuat.x;
          targetQuat.y = -targetQuat.y;
          targetQuat.z = -targetQuat.z;
          targetQuat.w = -targetQuat.w;
        }
        const dampFactor = 1 - Math.exp(-6.5 * Math.min(delta, 0.1));
        currentQuat.current.slerp(targetQuat, dampFactor);
      }
      domeRef.current.quaternion.copy(currentQuat.current);
    } else if (mobileOrientation) {
      // MOBILE COMPASS SENSOR DRIVEN LINE OF SIGHT (EXACT EULER YAW-PITCH MAPPING — ZERO ROLL)
      const azRad = (mobileOrientation.heading * Math.PI) / 180;
      const elRad = (mobileOrientation.pitch * Math.PI) / 180;

      const targetEuler = new THREE.Euler(-elRad, Math.PI - azRad, 0, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      if (!isInitialized.current) {
        currentQuat.current.copy(targetQuat);
        isInitialized.current = true;
      } else {
        if (currentQuat.current.dot(targetQuat) < 0) {
          targetQuat.x = -targetQuat.x;
          targetQuat.y = -targetQuat.y;
          targetQuat.z = -targetQuat.z;
          targetQuat.w = -targetQuat.w;
        }
        const dampFactor = 1 - Math.exp(-8.5 * Math.min(delta, 0.1));
        currentQuat.current.slerp(targetQuat, dampFactor);
      }
      domeRef.current.quaternion.copy(currentQuat.current);
    } else {
      // DEFAULT NORTH SIGHT ALIGNMENT
      const azRad = 0;
      const elRad = (15 * Math.PI) / 180;

      const targetEuler = new THREE.Euler(-elRad, Math.PI - azRad, 0, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      if (!isInitialized.current) {
        currentQuat.current.copy(targetQuat);
        isInitialized.current = true;
      } else {
        if (currentQuat.current.dot(targetQuat) < 0) {
          targetQuat.x = -targetQuat.x;
          targetQuat.y = -targetQuat.y;
          targetQuat.z = -targetQuat.z;
          targetQuat.w = -targetQuat.w;
        }
        const idleDamp = 1 - Math.exp(-3.0 * Math.min(delta, 0.1));
        currentQuat.current.slerp(targetQuat, idleDamp);
      }
      domeRef.current.quaternion.copy(currentQuat.current);
    }

    // ── MOBILE COMPASS GUIDE LINE OF SIGHT (GUIDES USER PHONE TOWARDS FIXED SATELLITE TRACKING SIGHT) ──
    if (isGuideActive && mobileOrientation && targetSat && guideDomeRef.current) {
      const azRad = (mobileOrientation.heading * Math.PI) / 180;
      const elRad = (mobileOrientation.pitch * Math.PI) / 180;

      const guideEuler = new THREE.Euler(-elRad, Math.PI - azRad, 0, "YXZ");
      const targetGuideQuat = new THREE.Quaternion().setFromEuler(guideEuler);

      if (!isGuideInitialized.current) {
        guideQuat.current.copy(targetGuideQuat);
        isGuideInitialized.current = true;
      } else {
        if (guideQuat.current.dot(targetGuideQuat) < 0) {
          targetGuideQuat.x = -targetGuideQuat.x;
          targetGuideQuat.y = -targetGuideQuat.y;
          targetGuideQuat.z = -targetGuideQuat.z;
          targetGuideQuat.w = -targetGuideQuat.w;
        }
        const dampFactor = 1 - Math.exp(-7.0 * Math.min(delta, 0.1));
        guideQuat.current.slerp(targetGuideQuat, dampFactor);
      }
      guideDomeRef.current.quaternion.copy(guideQuat.current);

      // Check alignment between the satellite tracking sight (currentQuat) and phone guide sight (guideQuat)
      const angleDeltaDeg = (currentQuat.current.angleTo(guideQuat.current) * 180) / Math.PI;
      if (angleDeltaDeg <= 3.8 && Date.now() - lastAlignedTrigger.current > 2500) {
        lastAlignedTrigger.current = Date.now();
        if (onAligned) {
          onAligned();
        }
      }
    }
  });

  const sightColor = targetSat ? "#f59e0b" : mobileOrientation ? "#06b6d4" : "#10b981";

  return (
    <group position={[0, 0, 0]}>
      {/* Base Pedestal */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[4.5, 5.8, 2.4, 32]} />
        <meshStandardMaterial color="#0b1329" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Rotating Dome Head & Primary Line of Sight (Tracks Satellite or Compass) */}
      <group ref={domeRef} position={[0, 2.4, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[4.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.15} metalness={0.85} />
        </mesh>

        {/* Lens Aperture Eye (Luminous Electric Blue) */}
        <mesh position={[0, 2.2, 3.8]}>
          <sphereGeometry args={[0.95, 16, 16]} />
          <meshStandardMaterial
            color="#00f0ff"
            emissive="#00f0ff"
            emissiveIntensity={4.8}
          />
        </mesh>

        <mesh position={[0, 2.2, 2.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.0, 1.25, 3.0, 16]} />
          <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.9} />
        </mesh>

        {/* PRIMARY BLUE LINE OF SIGHT FROM THE BOT (COLLIMATED AXIS) */}
        <Line
          points={[new THREE.Vector3(0, 2.2, 3.8), new THREE.Vector3(0, 2.2, 260)]}
          color="#00f0ff"
          lineWidth={4.2}
          transparent
          opacity={0.98}
        />
        <Line
          points={[new THREE.Vector3(0, 2.2, 3.8), new THREE.Vector3(0, 2.2, 260)]}
          color="#ffffff"
          lineWidth={1.8}
          transparent
          opacity={0.92}
        />

        {/* 1. GOLDEN RECTANGLE CURVED FIELD VIEW (±10° UPWARD & DOWNWARD, FIXED TO BLUE SIGHT) */}
        <HumanPrimaryGazeField
          radius={236}
          opacity={targetSat ? 0.42 : 0.34}
        />

        {/* 2. HUMAN EYE PERIPHERAL BINOCULAR FIELD (210°H × 140°V ENVELOPE) */}
        <HumanBinocularSightField
          color={sightColor}
          opacity={targetSat ? 0.28 : 0.16}
        />
      </group>

      {/* NEWLY CREATED MOBILE COMPASS GUIDE LINE OF SIGHT (GUIDES PHONE TOWARDS TRACKING SATELLITE) */}
      {isGuideActive && mobileOrientation && targetSat && (
        <group ref={guideDomeRef} position={[0, 2.4, 0]}>
          {/* Distinct Guide Beam: Vibrant Magenta & Electric Cyan Sight Line */}
          <Line
            points={[new THREE.Vector3(0, 2.2, 3.8), new THREE.Vector3(0, 2.2, 260)]}
            color="#ec4899"
            lineWidth={4.8}
            transparent
            opacity={0.95}
          />
          <Line
            points={[new THREE.Vector3(0, 2.2, 3.8), new THREE.Vector3(0, 2.2, 260)]}
            color="#06b6d4"
            lineWidth={2.0}
            transparent
            opacity={0.92}
          />

          {/* Guide Targeting Concentric Rings */}
          <mesh position={[0, 2.2, 170]}>
            <ringGeometry args={[6, 8, 32]} />
            <meshBasicMaterial color="#ec4899" transparent opacity={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 2.2, 170]}>
            <ringGeometry args={[12, 14, 32]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.65} side={THREE.DoubleSide} />
          </mesh>

          {/* Mobile Compass Sight Marker Badge */}
          <Html position={[0, 4.2, 80]} center className="pointer-events-none select-none">
            <div className="px-3 py-1 rounded-full bg-pink-950/70 border border-pink-400/80 text-pink-200 font-mono text-[10px] font-bold shadow-[0_8px_32px_0_rgba(236,72,153,0.4),inset_0_1px_0_0_rgba(255,255,255,0.2)] backdrop-blur-2xl whitespace-nowrap flex items-center gap-1.5">
              <Crosshair className="h-3 w-3 text-pink-400 animate-pulse" />
              <span>PHONE COMPASS GUIDE SIGHT</span>
            </div>
          </Html>
        </group>
      )}

      {/* Direct Line of Sight Beam to Tracked Satellite (GOLDEN AMBER) */}
      {targetSat && (
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
  rank,
  onSelectSat,
}: {
  sat: ComputedSatelliteSkyState;
  isSelected: boolean;
  showLabels: boolean;
  rank?: number;
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
}) {
  const nodeRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const catStyle = getSatelliteCategoryStyle(sat.category, sat.name);
  const color = isSelected ? "#ffe600" : catStyle.colorHex;

  // Performance: Only run useFrame animation for the selected satellite (avoids 80 per-frame loops)
  useFrame(({ clock }) => {
    if (!isSelected) return;
    const t = clock.getElapsedTime();
    if (glowRef.current) {
      glowRef.current.rotation.z = t * 0.8;
    }
    if (nodeRef.current) {
      nodeRef.current.rotation.y = t * 0.4;
    }
  });

  // Performance: Only render heavy Drei HTML DOM projection for selected satellite or top 16 brightest overhead
  const shouldRenderLabel = isSelected || (showLabels && rank != null && rank < 16);

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
      {shouldRenderLabel && (
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
  // Only draw orbit trajectory for the currently selected/targeted satellite (uncluttering the dome)
  const selectedSat = useMemo(() => {
    if (!showOrbits || !selectedSatId) return null;
    return (
      satellites.find(
        (s) => s.id === selectedSatId && s.trajectoryPoints && s.trajectoryPoints.length >= 2
      ) || null
    );
  }, [satellites, selectedSatId, showOrbits]);

  if (!showOrbits || !selectedSat || !selectedSat.trajectoryPoints) return null;

  const pts = selectedSat.trajectoryPoints;
  const strokeColor = "#ff1493";

  return (
    <group>
      <Line
        points={pts}
        color={strokeColor}
        lineWidth={4.8}
        transparent
        opacity={0.98}
      />

      {selectedSat.passDetails && (
        <>
          <mesh position={selectedSat.passDetails.riseVec3.toArray()}>
            <sphereGeometry args={[1.4, 16, 16]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>

          <mesh position={selectedSat.passDetails.peakVec3.toArray()}>
            <sphereGeometry args={[1.8, 16, 16]} />
            <meshBasicMaterial color="#ff1493" />
          </mesh>

          <mesh position={selectedSat.passDetails.setVec3.toArray()}>
            <sphereGeometry args={[1.4, 16, 16]} />
            <meshBasicMaterial color="#f472b6" />
          </mesh>
        </>
      )}
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
  isAimLocked = false,
  isGuideActive = false,
  onAligned,
}: {
  showGround: boolean;
  showGrid: boolean;
  targetSat: ComputedSatelliteSkyState | null;
  satellites: ComputedSatelliteSkyState[];
  onSelectSat: (sat: ComputedSatelliteSkyState) => void;
  mobileOrientation?: { heading: number; pitch: number; roll?: number } | null;
  isAimLocked?: boolean;
  isGuideActive?: boolean;
  onAligned?: () => void;
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
      <Stars radius={450} depth={100} count={3000} factor={6} saturation={0.2} fade speed={0.4} />

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
        isAimLocked={isAimLocked}
        isGuideActive={isGuideActive}
        onAligned={onAligned}
      />


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
    <div className="bg-slate-950/60 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-3 mb-3 text-[11px] font-sans shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.1)]">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
        <span className="font-bold text-pink-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
          <Radio className="h-3.5 w-3.5 text-pink-400 animate-pulse" /> PASS TRAJECTORY TELEMETRY
        </span>
        <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-300 text-[10px] font-mono font-bold">
          {p.peakElevationDeg >= 45 ? "ZENITH PASS" : "HORIZON PASS"}
        </span>
      </div>

      <div className="space-y-2 text-slate-200 font-mono text-[11px]">
        {/* Rise Details */}
        <div className="flex items-center justify-between bg-white/[0.03] backdrop-blur-xl p-2 rounded-xl border border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Sunrise className="h-4 w-4 text-pink-400 shrink-0" />
            <div>
              <div className="font-bold text-pink-300">Horizon Rise</div>
              <div className="text-[9px] text-slate-400">Azimuth: {p.riseAzimuthDeg}° ({riseCardinal})</div>
            </div>
          </div>
          <div className="font-extrabold text-pink-300 bg-pink-950/60 px-2.5 py-1 rounded-lg border border-pink-500/30 text-[10px]">
            {p.riseTimeStr}
          </div>
        </div>

        {/* Max Peak Details */}
        <div className="flex items-center justify-between bg-white/[0.03] backdrop-blur-xl p-2 rounded-xl border border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-amber-300">Max Peak Altitude</div>
              <div className="text-[9px] text-slate-400">Elevation: {p.peakElevationDeg}° Overhead</div>
            </div>
          </div>
          <div className="font-extrabold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-400/40 text-[10px] shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            {p.peakTimeStr}
          </div>
        </div>

        {/* Set Details */}
        <div className="flex items-center justify-between bg-white/[0.03] backdrop-blur-xl p-2 rounded-xl border border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Sunset className="h-4 w-4 text-pink-400 shrink-0" />
            <div>
              <div className="font-bold text-pink-300">Horizon Set</div>
              <div className="text-[9px] text-slate-400">Azimuth: {p.setAzimuthDeg}° ({setCardinal})</div>
            </div>
          </div>
          <div className="font-extrabold text-pink-300 bg-pink-950/60 px-2.5 py-1 rounded-lg border border-pink-500/30 text-[10px]">
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
  isAimLocked = false,
  isGuideActive = false,
  onAligned,
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
  isAimLocked?: boolean;
  isGuideActive?: boolean;
  onAligned?: () => void;
}) {
  const smoothedTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 40, 200));
  const isTargetInit = useRef<boolean>(false);
  const lastFacingAz = useRef<number>(0);
  const lastFacingTime = useRef<number>(0);

  useFrame(({ camera }, delta) => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const facingAz = ((Math.atan2(dir.x, -dir.z) * 180) / Math.PI + 360) % 360;

    // Performance: Throttle onUpdateHeading to prevent re-rendering the entire root component at 60 FPS
    const now = performance.now();
    if (Math.abs(facingAz - lastFacingAz.current) >= 1.5 && now - lastFacingTime.current > 180) {
      lastFacingAz.current = facingAz;
      lastFacingTime.current = now;
      onUpdateHeading(Math.round(facingAz));
    }

    if (mobileOrientation) {
      const azRad = (mobileOrientation.heading * Math.PI) / 180;
      const elRad = (mobileOrientation.pitch * Math.PI) / 180;
      const r = 240;

      const targetX = r * Math.sin(azRad) * Math.cos(elRad);
      const targetY = Math.max(5, r * Math.sin(elRad));
      const targetZ = -r * Math.cos(azRad) * Math.cos(elRad);
      const rawTarget = new THREE.Vector3(targetX, targetY, targetZ);

      // Liquid-smooth continuous damping across rendering frames
      const damp = 1 - Math.exp(-6.5 * Math.min(delta, 0.1));
      if (!isTargetInit.current) {
        smoothedTarget.current.copy(rawTarget);
        isTargetInit.current = true;
      } else {
        smoothedTarget.current.lerp(rawTarget, damp);
      }

      if (mobileSightMode === "ar") {
        // FIRST-PERSON AR SKY VIEWER MODE: Smooth fluid orientation
        camera.position.set(0, 10, 0);
        camera.lookAt(smoothedTarget.current);
      } else if (controlsRef.current && (!isAimLocked || !selectedSat)) {
        // OBSERVATORY TRACK MODE: Orbit controls target smoothly glides to sight vector (when not aim-locked to satellite)
        controlsRef.current.target.lerp(smoothedTarget.current, damp);
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

      {/* 3D Satellite Nodes (Green 3D Globe Satellite Model - capped at top 40 for optimal 60fps performance) */}
      {satellites
        .filter((sat) => sat.isAboveHorizon || sat.id === selectedSat?.id)
        .slice(0, 40)
        .map((sat, idx) => (
          <Live3DSatelliteNode
            key={sat.id}
            sat={sat}
            isSelected={sat.id === selectedSat?.id}
            showLabels={showLabels}
            rank={idx}
            onSelectSat={onSelectSat}
          />
        ))}

      {/* Sky Dome, Compass, Robot Sight Beam & Starfield */}
      <Clean3DSkyDome
        showGround={showGround}
        showGrid={showGrid}
        targetSat={selectedSat}
        satellites={satellites}
        onSelectSat={onSelectSat}
        mobileOrientation={mobileOrientation}
        isAimLocked={isAimLocked}
        isGuideActive={isGuideActive}
        onAligned={onAligned}
      />

      {/* OrbitControls: When is180DomeView is true, fix into dome view (no rotation). When false (unclicked), free dome navigation */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.6}
        enableRotate={!is180DomeView && mobileSightMode !== "ar"}
        target={is180DomeView ? [0, 25, 0] : [0, 60, 0]}
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
  const [is180DomeView, setIs180DomeView] = useState<boolean>(false);

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
  // Default to hidden: User must touch Sync Phone tab to view QR code
  const [showQrPanel, setShowQrPanel] = useState<boolean>(false);
  const wasMobileSyncedRef = useRef<boolean>(false);

  // 24-Hour Pass Telemetry Panel: Compressed into Upper Right Animated Icon by default
  const [isTelemetryPanelOpen, setIsTelemetryPanelOpen] = useState<boolean>(false);
  const [lastRefreshedDate, setLastRefreshedDate] = useState<Date>(new Date());
  const [isRefreshingTles, setIsRefreshingTles] = useState<boolean>(false);

  const handleRegenerateSession = useCallback(() => {
    const newId = Math.random().toString(36).substring(2, 10);
    setSessionId(newId);
    setMobileOrientation(null);
    setIsMobileSynced(false);
    wasMobileSyncedRef.current = false;
    showToast(`New QR Session Generated: #${newId}`);
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
    let lastBroadcastMsgTime = 0;

    // 1. Instant local BroadcastChannel tab sync listener (for same-machine multi-tab testing)
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("stargaze_compass_channel");
      channel.onmessage = (event) => {
        if (!isSubscribed) return;
        if (event.data && event.data.type === "COMPASS_TELEMETRY" && event.data.sessionId === sessionId) {
          lastBroadcastMsgTime = Date.now();
          setMobileOrientation({
            heading: event.data.heading,
            pitch: event.data.pitch,
            roll: event.data.roll || 0,
          });
          setIsMobileSynced(true);
          // Only auto-close once upon initial sync
          if (!wasMobileSyncedRef.current) {
            wasMobileSyncedRef.current = true;
            setShowQrPanel(false);
            showToast("Mobile Phone Connected Successfully");
          }
        }
      };
    }

    // 2. Continuous Real-Time HTTP Polling (for real smartphones over Wi-Fi / Internet)
    let isPollingBusy = false;
    const interval = setInterval(async () => {
      // Only skip HTTP if BroadcastChannel actively received a local tab message in the last 800ms
      if (Date.now() - lastBroadcastMsgTime < 800) return;
      if (isPollingBusy) return;
      isPollingBusy = true;
      try {
        const res = await fetch(`/api/stargaze/compass-sync?session=${sessionId}&_t=${Date.now()}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (!res.ok) return;
        const data = await res.json();

        if (isSubscribed && data.connected && data.data) {
          setMobileOrientation({
            heading: data.data.heading,
            pitch: data.data.pitch,
            roll: data.data.roll || 0,
          });
          setIsMobileSynced(true);
          // Only auto-close once upon initial sync
          if (!wasMobileSyncedRef.current) {
            wasMobileSyncedRef.current = true;
            setShowQrPanel(false);
            showToast("Mobile Phone Connected Successfully");
          }
        } else if (isSubscribed && !data.connected && Date.now() - lastBroadcastMsgTime > 6000) {
          wasMobileSyncedRef.current = false;
          setIsMobileSynced(false);
          setMobileOrientation(null);
        }
      } catch {
        /* skip network hiccups */
      } finally {
        isPollingBusy = false;
      }
    }, 80);

    return () => {
      isSubscribed = false;
      if (channel) channel.close();
      clearInterval(interval);
    };
  }, [sessionId]);

  // Toggle Fixed Dome View vs Free 3D Dome Perspective View
  const toggle180DomeView = useCallback(() => {
    setIs180DomeView((prev) => {
      const next = !prev;
      if (next) {
        // When clicked: fixes into the dome view (locked observer perspective)
        showToast("Fixed Dome View: Camera locked to observer horizon");
        if (controlsRef.current) {
          controlsRef.current.object.position.set(0, 25, 200);
          controlsRef.current.target.set(0, 25, 0);
          controlsRef.current.update();
        }
      } else {
        // When unclicked: allows accessing the free rotation of the dome
        showToast("Free Dome View: Camera navigation unlocked");
        if (controlsRef.current) {
          controlsRef.current.object.position.set(0, 240, 320);
          controlsRef.current.target.set(0, 60, 0);
          controlsRef.current.update();
        }
      }
      return next;
    });
  }, []);

  // Live Real-Time CelesTrak NORAD TLE Data Catalog State
  const [satCatalog, setSatCatalog] = useState<SatelliteData[]>(DEFAULT_SATELLITE_CATALOG);
  const [tleStatusText, setTleStatusText] = useState<string>("Fetching Live CelesTrak NORAD TLEs...");

  // Load Real-Time Multi-Group TLEs with 3-hour automatic refresh cycle
  const loadRealTimeTles = useCallback(async (showManualFeedback = false) => {
    setIsRefreshingTles(true);
    try {
      const groups = ["visual", "stations", "bright", "weather", "resource"];
      const fetchPromises = groups.map((g) =>
        fetch(`/api/orbital?group=${g}&format=tle&_t=${Date.now()}`)
          .then((r) => (r.ok ? r.text() : ""))
          .catch(() => "")
      );
      const results = await Promise.all(fetchPromises);
      const combinedText = results.join("\n");
      const liveSats = parseTleText(combinedText, "Active");

      if (liveSats.length >= 5) {
        setSatCatalog(liveSats);
        setLastRefreshedDate(new Date());
        setTleStatusText(`CelesTrak Multi-Group Live API (${liveSats.length} Real TLEs)`);
        if (showManualFeedback) {
          showToast(`24h Passes: ${liveSats.length} Satellites Synchronized`);
        }
      }
    } catch (err) {
      console.warn("Using built-in NORAD TLE catalog fallback", err);
      setTleStatusText("Built-in NORAD Catalog (Offline Fallback)");
      if (showManualFeedback) {
        showToast("Offline Fallback: Local Satellite Catalog Active");
      }
    } finally {
      setIsRefreshingTles(false);
    }
  }, []);

  // Fetch on mount & auto-refresh strictly every 3 hours (3 * 60 * 60 * 1000 ms)
  useEffect(() => {
    loadRealTimeTles(false);
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const interval = setInterval(() => {
      loadRealTimeTles(false);
    }, THREE_HOURS_MS);

    return () => clearInterval(interval);
  }, [loadRealTimeTles]);

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

  // Satellite Aim Lock & Phone Compass Alignment Guide states
  const [isAimLocked, setIsAimLocked] = useState<boolean>(false);
  const [isGuideActive, setIsGuideActive] = useState<boolean>(false);

  // Auto-handoff callback: When newly created guide line aligns with satellite tracking line
  const handleAligned = useCallback(() => {
    setIsGuideActive(false);
    setIsAimLocked(false);
    showToast("SIGHT ALIGNED: Mobile compass tracking satellite directly");
  }, []);

  // Live Compass Alignment Guidance Telemetry
  const guidanceData = useMemo(() => {
    if (!detailedSelectedSat || !mobileOrientation) return null;
    const satAz = detailedSelectedSat.azimuthDeg;
    const satEl = detailedSelectedSat.elevationDeg;
    const phoneHeading = mobileOrientation.heading;
    const phonePitch = mobileOrientation.pitch;

    let deltaAz = ((satAz - phoneHeading + 540) % 360) - 180; // >0 turn right, <0 turn left
    let deltaEl = satEl - phonePitch; // >0 tilt up, <0 tilt down
    const deltaTotal = Math.sqrt(deltaAz * deltaAz + deltaEl * deltaEl);
    const alignmentPct = Math.max(0, Math.min(100, Math.round(100 - (deltaTotal / 45) * 100)));

    let turnInstruction = "";
    if (Math.abs(deltaAz) > 3) {
      turnInstruction += deltaAz > 0 ? `Turn Right ${Math.round(deltaAz)}°` : `Turn Left ${Math.round(Math.abs(deltaAz))}°`;
    }
    if (Math.abs(deltaEl) > 3) {
      if (turnInstruction) turnInstruction += " • ";
      turnInstruction += deltaEl > 0 ? `Tilt Up ${Math.round(deltaEl)}°` : `Tilt Down ${Math.round(Math.abs(deltaEl))}°`;
    }
    if (!turnInstruction) {
      turnInstruction = "ALIGNMENT LOCK ACQUIRED (≤3.8°)";
    }

    return {
      satAz,
      satEl,
      phoneHeading,
      phonePitch,
      deltaAz,
      deltaEl,
      deltaTotal,
      alignmentPct,
      turnInstruction,
    };
  }, [detailedSelectedSat, mobileOrientation]);

  // Telescope Track Satellite
  const handleTrackSatellite = (sat: ComputedSatelliteSkyState) => {
    setSelectedSat(sat);
    setIsAimLocked(true);
    if (isMobileSynced) {
      setIsGuideActive(true);
    }
    setIsTelemetryPanelOpen(false); // Automatically compress 24h pass telemetry panel back into animated icon!
    showToast(`Precision Lock: ${sat.name}`);
    if (controlsRef.current) {
      const targetVec = sat.vec3;
      controlsRef.current.target.set(targetVec.x * 0.25, targetVec.y * 0.25, targetVec.z * 0.25);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-slate-950 text-white overflow-hidden select-none font-sans">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3D PLANETARIUM VIEWPORT (100% FULL DISPLAY WINDOW) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="relative w-full h-full min-h-[500px]">
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
            isAimLocked={isAimLocked}
            isGuideActive={isGuideActive}
            onAligned={handleAligned}
          />
        </Canvas>

        {/* ── TOP DISPLAY WINDOW NAVBAR & HUD (PERMANENTLY PINNED & STRUCTURED) ── */}
        <div className="absolute top-4 left-4 right-4 z-30 pointer-events-none flex flex-col gap-2.5">
          {/* ROW 1: OBSERVER SITE SELECTOR (LEFT) & MOBILE / DOME VIEW CONTROLS (RIGHT) */}
          <div className="flex items-center justify-between gap-2 pointer-events-auto select-none">
            {/* Observer Location & GPS Lock */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/[0.14] p-1.5 rounded-2xl backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)] shrink-0">
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1.5 rounded-xl backdrop-blur-xl">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <select
                  className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer max-w-[130px] sm:max-w-[200px] truncate"
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
                    showToast("Acquiring GPS Location Sensor...");
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const userLoc: ObserverCoords = {
                          name: "My GPS Location",
                          lat: pos.coords.latitude,
                          lon: pos.coords.longitude,
                          altMeters: pos.coords.altitude || 10,
                        };
                        setCurrentObserver(userLoc);
                        showToast(`Geolocation Locked: ${userLoc.lat.toFixed(2)}°, ${userLoc.lon.toFixed(2)}°`);
                      },
                      () => {
                        showToast("GPS Sensor Timeout: Defaulting to Selected Site");
                      }
                    );
                  } else {
                    showToast("Geolocation API Not Supported");
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] hover:border-white/[0.22] text-slate-300 hover:text-emerald-300 transition text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Detect my exact GPS location to sense passing satellites"
              >
                <Target className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Use My Location</span>
                <span className="sm:hidden">GPS</span>
              </button>
            </div>

            {/* Mobile Compass Sync & Dome Perspective Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/[0.14] p-1.5 rounded-2xl backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)] shrink-0 whitespace-nowrap ml-auto">
              {/* 180° Dome View Toggle: Fixed Horizon vs Free Dome Navigation */}
              <button
                onClick={toggle180DomeView}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                  is180DomeView
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)] font-bold"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border-white/[0.08]"
                }`}
                title={is180DomeView ? "Click to unlock: Free Dome View" : "Click to lock: Fixed Dome View"}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{is180DomeView ? "Fixed Dome" : "Free Dome"}</span>
                <span className="sm:hidden">{is180DomeView ? "Fixed" : "Free"}</span>
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-white/10 shrink-0 mx-0.5" />

              {/* Mobile Sync Button */}
              <button
                onClick={() => setShowQrPanel(!showQrPanel)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                  isMobileSynced
                    ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                    : showQrPanel
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                    : "bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-emerald-300 border-white/[0.08]"
                }`}
                title={isMobileSynced ? "Phone Connected. Click to view link status / disconnect" : "Connect mobile phone sensors via QR code"}
              >
                {isMobileSynced ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                    <Smartphone className="h-3.5 w-3.5 text-cyan-300" />
                    <span>Phone Synced</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Sync Phone</span>
                  </>
                )}
              </button>

              {/* 1st-Person AR View Mode — only active when synced */}
              {isMobileSynced && (
                <button
                  onClick={() => {
                    const next = mobileSightMode === "ar" ? "track" : "ar";
                    setMobileSightMode(next);
                    showToast(next === "ar" ? "1st-Person AR View" : "Dome Track View");
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer ${
                    mobileSightMode === "ar"
                      ? "bg-cyan-400 text-slate-950 font-bold border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                      : "bg-white/[0.04] border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/60"
                  }`}
                  title="Toggle 1st-Person AR View vs Dome Track View"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{mobileSightMode === "ar" ? "AR View" : "Track"}</span>
                </button>
              )}

              {/* Divider */}
              <div className="w-px h-5 bg-white/10 shrink-0 mx-0.5" />

              {/* FLOATING SATELLITE SPACE STATION ICON (UPPER RIGHT CORNER — TOUCH TO OPEN 24H PASS TELEMETRY PANEL) */}
              <motion.button
                animate={{
                  y: [0, -4, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsTelemetryPanelOpen((prev) => !prev)}
                className={`relative flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-semibold transition border shadow-xl cursor-pointer select-none group backdrop-blur-2xl ${
                  isTelemetryPanelOpen
                    ? "bg-emerald-500/20 border-emerald-400/70 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.4),inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                    : "bg-slate-950/60 border-cyan-400/50 hover:border-cyan-400 text-cyan-300 shadow-[0_4px_20px_0_rgba(6,182,212,0.25),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                }`}
                title={isTelemetryPanelOpen ? "Compress 24-Hour Pass Telemetry Panel" : "Open 24-Hour Satellite Pass Telemetry Panel"}
              >
                <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                  <img
                    src="/images/floating-satellite-station.png"
                    alt="24h Satellite Pass Telemetry Icon"
                    className="w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(6,182,212,0.8)] group-hover:rotate-6 transition-transform"
                  />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                  </span>
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-mono font-extrabold tracking-wider text-[11px] text-white">
                    24h PASS
                  </span>
                  <span className="font-mono text-[9px] text-cyan-400 font-bold">
                    {visible24hCount} Visible
                  </span>
                </div>
              </motion.button>
            </div>
          </div>

          {/* ROW 2: HUD TELEMETRY (LEFT), FLOATING GUIDE TAB (CENTER) & SCENE OPTION BAR (RIGHT) */}
          <div className="flex items-center justify-between gap-2 pointer-events-auto select-none">
            {/* Left: Telemetry HUD (Bearing & Live Simulation Clock) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Bearing Compass HUD Pill */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-emerald-400/40 text-emerald-300 font-mono text-xs font-bold backdrop-blur-2xl flex items-center gap-1.5 shadow-[0_4px_20px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] shrink-0">
                <Compass className="h-4 w-4 text-emerald-400 animate-spin-slow" />
                <span>BEARING: {getCardinalText(mobileOrientation ? mobileOrientation.heading : headingAzimuth)}</span>
                {isMobileSynced && mobileOrientation && (
                  <span className="text-[10px] text-cyan-300 font-mono font-semibold ml-0.5">({mobileOrientation.pitch}° EL)</span>
                )}
              </div>

              {/* Real-Time Simulation Clock HUD Pill */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/[0.12] text-amber-300 font-mono text-xs font-bold backdrop-blur-2xl flex items-center gap-1.5 shadow-[0_4px_20px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.12)] shrink-0">
                <Clock className="h-4 w-4 text-amber-400" />
                <span>{currentDate.toLocaleTimeString()}</span>
                <span className="hidden md:inline text-amber-400/70 font-normal">({currentDate.toLocaleDateString()})</span>
              </div>
            </div>

            {/* Center / Row 2: FLOATING "GUIDE" OPTION TAB */}
            {detailedSelectedSat && (
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  if (!isMobileSynced) {
                    setShowQrPanel(true);
                    showToast("Connect mobile phone to activate Guide Sight");
                  } else {
                    setIsGuideActive((prev) => !prev);
                    showToast(isGuideActive ? "Guide Sight Deactivated" : "Guide Sight Active: Align beam to satellite");
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-xl cursor-pointer backdrop-blur-2xl ${
                  isGuideActive
                    ? "bg-pink-600/80 border-pink-400 text-white shadow-[0_0_24px_rgba(236,72,153,0.6),inset_0_1px_0_0_rgba(255,255,255,0.2)] animate-pulse"
                    : "bg-slate-950/60 border-pink-500/50 text-pink-300 hover:bg-pink-950/60 shadow-[0_4px_20px_0_rgba(236,72,153,0.2),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                }`}
                title="Floating Compass Alignment Guide: Creates a new line of sight driven by phone compass to guide phone into alignment with satellite tracking sight"
              >
                <Navigation className={`h-3.5 w-3.5 ${isGuideActive ? "rotate-45 text-white" : "text-pink-400"}`} />
                <span className="font-mono tracking-wider">GUIDE</span>
                {guidanceData && isGuideActive && (
                  <span className="px-1.5 py-0.2 rounded-md bg-black/40 text-[10px] font-mono font-bold text-pink-200">
                    {guidanceData.deltaTotal.toFixed(0)}°
                  </span>
                )}
              </motion.button>
            )}

            {/* Right: SCENE OPTION BAR — PERMANENTLY ANCHORED, NEVER WRAPS OR GOES DOWN */}
            <div className="flex items-center gap-1 bg-slate-950/60 border border-white/[0.12] p-1 rounded-xl backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.1)] shrink-0 ml-auto">
              <button
                onClick={() => setShowLabels(!showLabels)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                  showLabels
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                    : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border-transparent"
                }`}
                title="Toggle satellite labels"
              >
                Labels
              </button>

              <button
                onClick={() => setShowOrbits(!showOrbits)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                  showOrbits
                    ? "bg-pink-500/20 border-pink-400/60 text-pink-200 shadow-[0_0_12px_rgba(236,72,153,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                    : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border-transparent"
                }`}
                title="Toggle selected satellite orbit path"
              >
                Orbit
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                  showGrid
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                    : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border-transparent"
                }`}
                title="Toggle azimuth/elevation grid"
              >
                Grid
              </button>

              <button
                onClick={() => setShowRadar(!showRadar)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                  showRadar
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                    : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border-transparent"
                }`}
                title="Toggle 2D planisphere radar"
              >
                Radar
              </button>

              <button
                onClick={() => setShowSimDock(!showSimDock)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 border cursor-pointer ${
                  showSimDock
                    ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                    : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] border-transparent"
                }`}
                title="Toggle simulation dock"
              >
                <Play className="h-3 w-3" />
                <span>Sim</span>
              </button>
            </div>
          </div>

          {/* ROW 3: SOLAR ILLUMINATION STATUS */}
          {observerSunCoords && (
            <div className="flex items-center gap-2 pointer-events-auto select-none">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/[0.12] text-slate-200 font-mono text-[11px] font-semibold backdrop-blur-2xl flex items-center gap-2 flex-wrap shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.1)] shrink-0">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  Sun El: {observerSunCoords.elevationDeg.toFixed(1)}°
                </span>
                <span className="text-white/20">•</span>
                <span className={observerSunCoords.isDark ? "text-emerald-400 font-bold flex items-center gap-1" : "text-amber-400 font-bold flex items-center gap-1"}>
                  {observerSunCoords.isDark ? <Moon className="h-3.5 w-3.5 text-indigo-400" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
                  {observerSunCoords.elevationDeg < -18
                    ? "Astronomical Night"
                    : observerSunCoords.elevationDeg < -12
                    ? "Nautical Twilight"
                    : observerSunCoords.elevationDeg < -6
                    ? "Civil Twilight"
                    : "Daylight (Sky Washed Out)"}
                </span>
                <span className="text-white/20">•</span>
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <Eye className="h-3 w-3 text-emerald-400" />
                  {nakedEyeCount} Naked-Eye Visible Now
                </span>
              </div>
            </div>
          )}
        </div>

        {/* FLOATING COMPASS SIGHT ALIGNMENT GUIDANCE HUD OVERLAY */}
        {isGuideActive && detailedSelectedSat && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 w-[340px] sm:w-[440px] bg-slate-950/70 border border-pink-500/50 rounded-2xl shadow-[0_16px_48px_0_rgba(0,0,0,0.6),0_0_30px_rgba(236,72,153,0.25),inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-3xl p-3.5 font-sans pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-pink-400 animate-spin-slow" />
                <span className="font-extrabold text-xs text-white uppercase tracking-wider font-mono">
                  COMPASS SIGHT ALIGNMENT GUIDE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40 truncate max-w-[120px]">
                  {detailedSelectedSat.name}
                </span>
                <button
                  onClick={() => setIsGuideActive(false)}
                  className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Close Guide"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {mobileOrientation ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono bg-pink-950/40 p-2 rounded-xl border border-pink-500/30">
                  <span className="text-slate-300 font-semibold text-[11px]">Move Phone:</span>
                  <span className="text-pink-300 font-black tracking-wide text-xs animate-pulse">
                    {guidanceData?.turnInstruction}
                  </span>
                </div>

                {/* Alignment percentage progress bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                    <span>Alignment Progress</span>
                    <span className="text-cyan-300 font-bold">{guidanceData?.alignmentPct}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 h-full transition-all duration-150"
                      style={{ width: `${guidanceData?.alignmentPct || 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <span>Angular Delta: <strong className="text-pink-300">{guidanceData?.deltaTotal.toFixed(1)}°</strong></span>
                  <span className="text-emerald-400 font-bold">Target Zone: ≤ 3.8°</span>
                </div>

                <div className="text-[10px] text-slate-400 leading-snug border-t border-slate-800/80 pt-1.5">
                  Follow the pink guide sight line. Once your phone compass aligns with the satellite sight (&le; 3.8°), the guide beam disappears and live tracking begins.
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-300 text-center py-2 flex flex-col items-center gap-2">
                <span className="text-[11px]">Connect your phone via QR sync to show live mobile compass guide sight</span>
                <button
                  onClick={() => setShowQrPanel(true)}
                  className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                >
                  Open Phone QR Sync
                </button>
              </div>
            )}
          </div>
        )}

        {/* Toast Popup */}
        {toastMessage && (
          <div className="absolute top-28 right-4 z-40 bg-slate-950/70 border border-emerald-400/40 text-emerald-300 font-mono text-xs font-bold px-3.5 py-2 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.45),0_0_20px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-2xl animate-in fade-in duration-200 pointer-events-none flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* FULL MOBILE COMPASS QR SYNC MODAL */}
        {showQrPanel && (
          <div className="absolute top-20 right-6 z-40 w-80 p-4 rounded-2xl bg-slate-950/70 border border-white/[0.14] shadow-[0_16px_48px_0_rgba(0,0,0,0.65),0_0_30px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-3xl font-mono text-xs animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="font-extrabold text-white tracking-wide">
                  {isMobileSynced ? "MOBILE PHONE SYNCED" : "MOBILE COMPASS QR SYNC"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                  #{sessionId}
                </span>
                <button
                  onClick={() => setShowQrPanel(false)}
                  className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Close Modal"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {isMobileSynced ? (
              /* Connected State Details */
              <div className="flex flex-col gap-3 my-2">
                <div className="p-3 rounded-xl border border-cyan-400/40 bg-cyan-950/30 backdrop-blur-xl text-cyan-300 flex items-center gap-2.5 text-xs font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <div>
                    <div>PHONE SENSORS CONNECTED</div>
                    <div className="text-[10px] text-slate-300 font-normal mt-0.5">
                      Transmitting live compass orientation to 3D observatory
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = mobileSightMode === "ar" ? "track" : "ar";
                      setMobileSightMode(next);
                      showToast(next === "ar" ? "1st-Person AR View" : "Dome Track View");
                    }}
                    className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 text-[11px] cursor-pointer ${
                      mobileSightMode === "ar"
                        ? "bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                        : "bg-white/[0.04] border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>{mobileSightMode === "ar" ? "Mode: AR View" : "Mode: Track View"}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleRegenerateSession();
                      showToast("Disconnected from Mobile");
                    }}
                    className="py-2 px-3 rounded-xl bg-white/[0.04] border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 text-[11px] font-bold transition cursor-pointer"
                    title="Disconnect phone and generate new session"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              /* QR Code for phone scan */
              <>
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

                {/* Live Connection Status Banner */}
                <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-xl text-amber-300 flex items-center gap-2 text-[10px] font-bold mt-2">
                  <QrCode className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                  <div>
                    <div>WAITING FOR PHONE SCAN</div>
                    <div className="text-[9px] text-slate-400">Scan QR to sync line of sight</div>
                  </div>
                </div>

                {/* Manual Link / Controller Launcher */}
                <a
                  href={mobileSyncUrl || `/stargaze/compass-sync?session=${sessionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 w-full py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[10px] flex items-center justify-center gap-1.5 transition font-semibold"
                >
                  <Link2 className="h-3 w-3 text-emerald-400" />
                  <span>Launch Mobile Sync Controller</span>
                </a>

                {/* Manual Regenerate Unique Session Button */}
                <button
                  onClick={handleRegenerateSession}
                  className="mt-2 w-full py-1.5 rounded-xl bg-white/[0.04] border border-emerald-500/40 hover:bg-emerald-950/40 text-emerald-300 hover:text-emerald-200 text-[10px] flex items-center justify-center gap-1.5 transition font-bold shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 text-emerald-400" />
                  <span>Generate New Unique QR Session</span>
                </button>
              </>
            )}
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
            <div className="text-[10px] font-mono font-bold text-emerald-300 bg-slate-950/60 px-3 py-1 rounded-full border border-white/[0.12] backdrop-blur-2xl shadow-[0_4px_20px_0_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex items-center gap-1.5">
              <Compass className="h-3 w-3 text-emerald-400" />
              <span>PLANISPHERE RADAR</span>
            </div>
          </div>
        )}

        {/* UNIFIED 24-HOUR SIMULATION CONTROL DASHBOARD DOCK */}
        {showSimDock && (
          <div className={`absolute bottom-36 z-50 w-[340px] sm:w-[410px] flex flex-col gap-2.5 p-3.5 rounded-2xl bg-slate-950/70 border border-white/[0.14] backdrop-blur-3xl shadow-[0_16px_48px_0_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.15)] pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-200 ${
            showRadar ? "left-6 sm:left-[256px]" : "left-6"
          }`}>
            {/* Header label */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                <Play className="h-3.5 w-3.5 text-emerald-400" />
                <span>24-HOUR ORBIT SIMULATOR</span>
              </div>
              <button
                onClick={() => {
                  setShowSimDock(false);
                  showToast("Simulation Dock Hidden");
                }}
                className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Hide Simulation Dock"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Top Control Bar: Play/Pause, Speed & Live Clock */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 text-xs shadow-md cursor-pointer ${
                    isPlaying
                      ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      : "bg-white/[0.05] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1]"
                  }`}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                {/* Speed Multipliers */}
                <div className="flex items-center bg-white/[0.03] border border-white/[0.08] backdrop-blur-md rounded-xl p-0.5 text-xs font-mono">
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
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
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
                    showToast("Reset to Live Time");
                  }}
                  className="p-1 px-2 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
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
                      showToast(`Simulating ${detailedSelectedSat.name} Pass`);
                      setIsPlaying(true);
                      setTimeMultiplier(60);
                    } else {
                      showToast("Simulating Next 24h Satellite Pass");
                      setTimeMultiplier(300);
                      setIsPlaying(true);
                    }
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl font-bold bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/40 text-white text-xs transition flex items-center justify-center gap-1 shadow-md cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Simulate Next Pass</span>
                </button>

                <button
                  onClick={() => {
                    setTimeMultiplier(3600);
                    setIsPlaying(true);
                    showToast("24-Hour Fast Scan (1h/sec)");
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl font-bold bg-pink-600/90 hover:bg-pink-500 border border-pink-400/40 text-white text-xs transition flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(236,72,153,0.4)] font-extrabold cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  <span>Fast 24h Scan</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: 24-Hour Interactive Timeline Scrubber Slider */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
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
          <div className="absolute bottom-36 right-6 z-40 w-full sm:w-[380px] max-h-[calc(100vh-200px)] overflow-y-auto p-4 rounded-2xl bg-slate-950/70 border border-white/[0.14] shadow-[0_16px_48px_0_rgba(0,0,0,0.65),0_0_30px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-3xl font-sans animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                  <Satellite className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-extrabold text-white text-sm tracking-wide">{detailedSelectedSat.name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-medium">
                    {detailedSelectedSat.category} • NORAD #{detailedSelectedSat.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSat(null);
                  setIsAimLocked(false);
                  setIsGuideActive(false);
                  if (controlsRef.current) {
                    controlsRef.current.target.set(0, is180DomeView ? 60 : 25, 0);
                    controlsRef.current.update();
                  }
                  showToast("Tracking Reset: Reverted to Neutral Sight");
                }}
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition shadow-md cursor-pointer"
                title="Close satellite details and undo tracking"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Primary Satellite Physics Grid: Magnitude, Inclination, Elevation & Altitude */}
            <div className="grid grid-cols-4 gap-1.5 text-[10px] text-slate-200 bg-white/[0.03] backdrop-blur-xl p-2.5 rounded-xl border border-white/[0.08] mb-3 font-mono">
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
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-200 bg-white/[0.03] backdrop-blur-xl p-2.5 rounded-xl border border-white/[0.08] mb-3 font-mono">
                <div>
                  <div className="text-slate-400 flex items-center gap-1">
                    <Compass className="h-3 w-3 text-cyan-400" />
                    <span>RA (Right Ascension)</span>
                  </div>
                  <div className="font-bold text-emerald-300">{detailedSelectedSat.coordsEq.raStr}</div>
                </div>
                <div>
                  <div className="text-slate-400 flex items-center gap-1">
                    <Crosshair className="h-3 w-3 text-emerald-400" />
                    <span>DEC (Declination)</span>
                  </div>
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
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer ${
                isAimLocked
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              }`}
            >
              <Target className="h-4 w-4" />
              <span>{isAimLocked ? "AIM ROBOT SIGHT LOCKED" : "AIM ROBOT SIGHT & TRACK CAMERA"}</span>
            </button>
          </div>
        )}

        {/* 24-HOUR PASS TELEMETRY COMPRESSIBLE DRAWER OVERLAY */}
        <AnimatePresence>
          {isTelemetryPanelOpen && (
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute top-20 right-4 sm:right-6 bottom-6 z-50 w-full sm:w-[410px] max-w-[calc(100vw-2rem)] bg-slate-950/75 border border-white/[0.15] rounded-3xl shadow-[0_24px_64px_0_rgba(0,0,0,0.7),0_0_35px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-3xl p-4 flex flex-col justify-between pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-right-4"
            >
              <div className="flex flex-col flex-1 min-h-0">
                {/* Header */}
                <div className="flex flex-col gap-1 border-b border-white/10 pb-3 mb-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                      <span className="font-extrabold text-sm text-slate-100 font-sans tracking-wide">
                        24-Hour Sky Pass Telemetry
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => loadRealTimeTles(true)}
                        disabled={isRefreshingTles}
                        className="p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-slate-400 hover:text-emerald-300 hover:bg-white/[0.08] transition text-xs flex items-center gap-1 cursor-pointer"
                        title="Refresh 24h passes now (Auto-refreshes every 3 hours)"
                      >
                        <RotateCcw className={`h-3.5 w-3.5 ${isRefreshingTles ? "animate-spin text-emerald-400" : ""}`} />
                        <span className="text-[10px] font-mono hidden sm:inline">Refresh</span>
                      </button>
                      <button
                        onClick={() => setIsTelemetryPanelOpen(false)}
                        className="w-7 h-7 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition shadow-md cursor-pointer"
                        title="Compress into upper right icon"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300 bg-white/[0.03] backdrop-blur-xl px-2.5 py-1 rounded-xl border border-white/[0.08] mt-1">
                    <span className="flex items-center gap-1.5">
                      <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                      <span>3H SYNC: {lastRefreshedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                    <span className="font-bold text-emerald-200 truncate max-w-[190px]">{tleStatusText}</span>
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
                    className="w-full bg-white/[0.04] backdrop-blur-md border border-white/[0.1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-400/60 font-mono"
                  />
                </div>

                {/* Filter Tabs: Strictly Visible in Next 24 Hours, Naked-Eye Visible, or Overhead Now */}
                <div className="flex items-center gap-1 mb-3.5 text-[10px] font-medium shrink-0">
                  <button
                    onClick={() => setSelectedCategory("Visible in 24 Hours")}
                    className={`flex-1 py-1.5 px-2 rounded-xl transition text-center font-bold flex items-center justify-center gap-1 cursor-pointer border ${
                      selectedCategory === "Visible in 24 Hours"
                        ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                        : "bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.08]"
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>Visible 24h ({visible24hCount})</span>
                  </button>

                  <button
                    onClick={() => setSelectedCategory("Naked-Eye Visible")}
                    className={`flex-1 py-1.5 px-2 rounded-xl transition text-center font-bold flex items-center justify-center gap-1 cursor-pointer border ${
                      selectedCategory === "Naked-Eye Visible"
                        ? "bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)] font-extrabold"
                        : "bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.08]"
                    }`}
                    title="Physically Visible to the Human Eye (Sunlit + Dark Sky + Mag <= 6.0)"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Naked Eye ({nakedEyeCount})</span>
                  </button>

                  <button
                    onClick={() => setSelectedCategory("Overhead Now")}
                    className={`py-1.5 px-2.5 rounded-xl transition text-center font-bold cursor-pointer border ${
                      selectedCategory === "Overhead Now"
                        ? "bg-pink-500/20 border-pink-400/60 text-pink-200 shadow-[0_0_12px_rgba(236,72,153,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                        : "bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.08]"
                    }`}
                  >
                    <span>Overhead ({visibleCount})</span>
                  </button>
                </div>

                {/* Satellite Telemetry List */}
                <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 text-xs">
                  {filteredSatellites.map((sat) => {
                    const isSelected = selectedSat?.id === sat.id;
                    const catStyle = getSatelliteCategoryStyle(sat.category, sat.name);

                    return (
                      <div
                        key={sat.id}
                        onClick={() => handleTrackSatellite(sat)}
                        className={`p-3 rounded-2xl border transition cursor-pointer backdrop-blur-xl ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.2),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                            : sat.isAboveHorizon
                            ? "bg-white/[0.04] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.07]"
                            : "bg-white/[0.02] border-white/[0.04] opacity-80 hover:opacity-100 hover:border-white/[0.1]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: catStyle.colorHex }} />
                            <span className="font-extrabold text-white text-xs truncate max-w-[130px]">
                              {sat.name}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${catStyle.badgeClass}`}>
                              {catStyle.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {sat.isNakedEyeVisible && (
                              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                                <Eye className="h-2.5 w-2.5 text-amber-400" />
                                <span>NAKED EYE</span>
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1 ${
                                sat.isAboveHorizon
                                  ? sat.isSunlit
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                    : "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {sat.isAboveHorizon ? (
                                sat.isSunlit ? (
                                  <>
                                    <Sun className="h-2.5 w-2.5 text-amber-400" />
                                    <span>SUNLIT</span>
                                  </>
                                ) : (
                                  <>
                                    <Moon className="h-2.5 w-2.5 text-purple-300" />
                                    <span>ECLIPSED</span>
                                  </>
                                )
                              ) : sat.maxPassElevationDeg ? (
                                `Peak: ${sat.maxPassElevationDeg}°`
                              ) : (
                                "Pass in 24h"
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Telemetry Grid */}
                        <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-300 bg-slate-950/40 backdrop-blur-md p-2 rounded-xl border border-white/[0.06] mb-2 font-mono">
                          <div>
                            <div className="text-slate-400">Elevation</div>
                            <div className="font-bold text-emerald-300">{sat.elevationDeg.toFixed(1)}°</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Azimuth</div>
                            <div className="font-bold text-emerald-300">{Math.round(sat.azimuthDeg)}°</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Sat Alt</div>
                            <div className="font-bold text-amber-300">{Math.round(sat.satAltitudeKm)} km</div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrackSatellite(sat);
                          }}
                          className={`w-full py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1 text-[10px] cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500 text-slate-950 font-bold shadow-md"
                              : "bg-white/[0.04] border border-white/[0.1] text-emerald-300 hover:bg-emerald-600 hover:text-white"
                          }`}
                        >
                          <span>{isSelected ? "SIGHT LOCKED" : "AIM ROBOT SIGHT & TRACK"}</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3.5 border-t border-white/10 text-[10px] font-mono text-slate-400 flex items-center justify-between mt-3 shrink-0">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FIXED FLOATING MANUAL BUTTON AT VERY RIGHTMOST BOTTOM CORNER OF SCREEN */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setShowManual(true)}
        className="fixed bottom-5 right-5 z-[9999] px-4 py-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-900/80 border border-white/[0.12] hover:border-emerald-400/50 text-emerald-300 font-bold text-xs flex items-center gap-2.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-2xl transition pointer-events-auto font-mono tracking-wider group cursor-pointer"
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
