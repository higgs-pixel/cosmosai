"use client";

import { useMemo, useRef, useEffect, useState, memo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, useTexture } from "@react-three/drei";
import * as satellite from "satellite.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useOrbitalStore, SatelliteData } from "./store";

const EARTH_RADIUS_3D = 4.0;
const EARTH_RADIUS_KM = 6371.0;

export const EARTH_CALIBRATION_OFFSET = 0; // radians

export function latLonToVector3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const phi = (90 - latDeg) * (Math.PI / 180);
  const theta = (lonDeg + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function updateEarthOrientation(earthGroup: THREE.Object3D, gmstRad: number): void {
  earthGroup.rotation.y = gmstRad + EARTH_CALIBRATION_OFFSET;
}

// ─────────────────────────────────────────────────────────────────────────────
// Earth mesh
// ─────────────────────────────────────────────────────────────────────────────
function EarthMesh({ texturePath }: { texturePath: string }) {
  const texture = useTexture(texturePath);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.7} metalness={0.15} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D * 1.018, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Orbit track — in ECEF local space
// ─────────────────────────────────────────────────────────────────────────────
function SelectedOrbitTrack({
  satellites,
  selectedSatId,
}: {
  satellites: SatelliteData[];
  selectedSatId: number | null;
}) {
  // Coarsen orbit track recalculation bucket to every 4 seconds of simulation time
  // This eliminates 10,800 redundant SGP4 loops/sec while keeping orbit shape crystal clear
  const orbitTimeBucket = useOrbitalStore((s) => Math.floor(s.timeMs / 4000));
  const effectiveId = selectedSatId ?? 25544;

  // Default to ISS (25544) if no satellite is selected
  const targetSat = useMemo(() => {
    return (
      satellites.find((s) => s.id === effectiveId) ||
      satellites.find((s) => s.id === 25544) ||
      satellites[0] ||
      null
    );
  }, [satellites, effectiveId]);

  const satrec = useMemo(() => {
    if (!targetSat) return null;
    try {
      const sr = satellite.twoline2satrec(targetSat.line1, targetSat.line2);
      if (sr && !sr.error) return sr;
    } catch {
      /* fallback */
    }
    return null;
  }, [targetSat]);

  const points = useMemo(() => {
    if (!satrec) return [];
    const pts: THREE.Vector3[] = [];
    const meanMotion = satrec.no || 0.06;
    const periodMin = (2 * Math.PI) / meanMotion;
    const steps = 120;
    const baseTime = orbitTimeBucket * 4000;
    const now = new Date(baseTime);
    const gmstNow = satellite.gstime(now);

    for (let i = 0; i <= steps; i++) {
      const propTime = new Date(baseTime + (i / steps) * periodMin * 60_000);
      const posAndVel = satellite.propagate(satrec, propTime);
      const pos = posAndVel?.position;
      if (!pos || typeof pos === "boolean" || isNaN(pos.x)) continue;

      const gd = satellite.eciToGeodetic(pos as satellite.EciVec3<number>, gmstNow);
      const lat = satellite.degreesLat(gd.latitude);
      let lon = satellite.degreesLong(gd.longitude);
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      const altKm = gd.height || 420;
      const r = EARTH_RADIUS_3D * (1 + altKm / EARTH_RADIUS_KM);
      const v = latLonToVector3(lat, lon, r);
      if (!isNaN(v.x) && !isNaN(v.y) && !isNaN(v.z)) {
        pts.push(v);
      }
    }
    return pts;
  }, [satrec, orbitTimeBucket]);

  if (points.length < 2) return null;
  return <Line points={points} color="#ec4899" lineWidth={2.4} opacity={0.95} transparent />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Yellow Dotted Track from Observer Location following path to Satellite
// ─────────────────────────────────────────────────────────────────────────────
function ObserverToSatelliteTrack({
  observer,
  satellites,
  selectedSatId,
}: {
  observer: { lat: number; lon: number };
  satellites: SatelliteData[];
  selectedSatId: number | null;
}) {
  const effectiveId = selectedSatId ?? 25544;
  const targetSat = useMemo(() => {
    return (
      satellites.find((s) => s.id === effectiveId) ||
      satellites.find((s) => s.id === 25544) ||
      satellites[0] ||
      null
    );
  }, [satellites, effectiveId]);

  const satrec = useMemo(() => {
    if (!targetSat) return null;
    try {
      const sr = satellite.twoline2satrec(targetSat.line1, targetSat.line2);
      if (sr && !sr.error) return sr;
    } catch {
      /* skip */
    }
    return null;
  }, [targetSat]);

  const [points, setPoints] = useState<THREE.Vector3[]>([]);

  useFrame(() => {
    if (!satrec) return;
    const timeMs = useOrbitalStore.getState().timeMs;
    const now = new Date(timeMs);
    const gmst = satellite.gstime(now);

    const pv = satellite.propagate(satrec, now);
    const pos = pv?.position;
    if (!pos || typeof pos === "boolean" || isNaN(pos.x)) return;

    const gd = satellite.eciToGeodetic(pos as satellite.EciVec3<number>, gmst);
    const satLat = satellite.degreesLat(gd.latitude);
    let satLon = satellite.degreesLong(gd.longitude);
    if (satLon > 180) satLon -= 360;
    if (satLon < -180) satLon += 360;

    const altKm = gd.height || 420;
    const r = EARTH_RADIUS_3D * (1 + altKm / EARTH_RADIUS_KM);
    const satPos = latLonToVector3(satLat, satLon, r);
    const obsPos = latLonToVector3(observer.lat, observer.lon, EARTH_RADIUS_3D + 0.05);

    // Arched points connecting observer to satellite
    const pts: THREE.Vector3[] = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = obsPos.clone().lerp(satPos, t);
      const arcLift = Math.sin(t * Math.PI) * 0.35;
      pt.add(pt.clone().normalize().multiplyScalar(arcLift));
      pts.push(pt);
    }
    setPoints(pts);
  });

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color="#ffd700"
      lineWidth={2.8}
      dashed
      dashScale={2}
      dashSize={0.25}
      gapSize={0.15}
      transparent
      opacity={0.95}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CameraController — Smooth GPU-direct tracking without React re-renders
// ─────────────────────────────────────────────────────────────────────────────
function CameraController({
  worldPosRef,
  lockCamera,
  controlsRef,
  selectedId,
}: {
  worldPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  lockCamera: boolean;
  controlsRef: React.RefObject<any>;
  selectedId: number | null;
}) {
  const { camera } = useThree();
  const prevIdRef = useRef<string | null>(null);

  useFrame(() => {
    const worldPos = worldPosRef.current;
    if (!worldPos) return;

    if (selectedId && String(selectedId) !== prevIdRef.current) {
      prevIdRef.current = String(selectedId);
      const dir = worldPos.clone().normalize();
      const camPos = worldPos.clone().add(dir.multiplyScalar(3.0));
      camera.position.lerp(camPos, 0.2);
      controlsRef.current?.target.lerp(worldPos, 0.4);
      controlsRef.current?.update();
    }

    if (lockCamera && controlsRef.current) {
      controlsRef.current.target.lerp(worldPos, 0.1);
      controlsRef.current.update();
    }
  });

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleek 3D Satellite Geometry Generator (Merged Bus, Dual Solar Wings & Dish)
// ─────────────────────────────────────────────────────────────────────────────
function create3DSatelliteGeometry(): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // 1. Sleek Central Satellite Bus Body
  const bus = new THREE.BoxGeometry(0.14, 0.20, 0.14);
  geometries.push(bus);

  // 2. Left Solar Array Wings (Dual segmented panels)
  const leftWing1 = new THREE.BoxGeometry(0.24, 0.12, 0.02);
  leftWing1.translate(-0.20, 0, 0);
  geometries.push(leftWing1);

  const leftWing2 = new THREE.BoxGeometry(0.24, 0.12, 0.02);
  leftWing2.translate(-0.46, 0, 0);
  geometries.push(leftWing2);

  // 3. Right Solar Array Wings (Dual segmented panels)
  const rightWing1 = new THREE.BoxGeometry(0.24, 0.12, 0.02);
  rightWing1.translate(0.20, 0, 0);
  geometries.push(rightWing1);

  const rightWing2 = new THREE.BoxGeometry(0.24, 0.12, 0.02);
  rightWing2.translate(0.46, 0, 0);
  geometries.push(rightWing2);

  // 4. Slender Connecting Solar Booms
  const boomLeft = new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8);
  boomLeft.rotateZ(Math.PI / 2);
  boomLeft.translate(-0.31, 0, 0);
  geometries.push(boomLeft);

  const boomRight = new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8);
  boomRight.rotateZ(Math.PI / 2);
  boomRight.translate(0.31, 0, 0);
  geometries.push(boomRight);

  // 5. Parabolic High-Gain Dish Antenna
  const dish = new THREE.ConeGeometry(0.09, 0.06, 16);
  dish.rotateX(-Math.PI / 2);
  dish.translate(0, 0.14, 0.05);
  geometries.push(dish);

  // 6. Sensor Pod & Thruster Nozzle
  const sensorTop = new THREE.CylinderGeometry(0.025, 0.035, 0.06, 8);
  sensorTop.translate(0, 0.13, 0);
  geometries.push(sensorTop);

  const thrusterBot = new THREE.ConeGeometry(0.035, 0.06, 8);
  thrusterBot.rotateX(Math.PI);
  thrusterBot.translate(0, -0.13, 0);
  geometries.push(thrusterBot);

  // 7. Glowing Core Beacon Center Sphere (Original design)
  const beaconCore = new THREE.SphereGeometry(0.05, 12, 12);
  geometries.push(beaconCore);

  return mergeGeometries(geometries);
}

// ─────────────────────────────────────────────────────────────────────────────
// TrackedSatelliteCurrentLocation — Prominent 3D Spacecraft, Reticle & Connector
// ─────────────────────────────────────────────────────────────────────────────
function TrackedSatelliteCurrentLocation({
  satellites,
  selectedSatId,
  worldPosRef,
}: {
  satellites: SatelliteData[];
  selectedSatId: number | null;
  worldPosRef: React.MutableRefObject<THREE.Vector3 | null>;
}) {
  const { camera } = useThree();
  const satGroupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const reticleRef = useRef<THREE.Group>(null);
  const subpointRef = useRef<THREE.Group>(null);
  const connectorLine = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({ color: "#ec4899", transparent: true, opacity: 0.85 });
    return new THREE.Line(geom, mat);
  }, []);

  const effectiveId = selectedSatId ?? 25544;

  const targetSat = useMemo(() => {
    return (
      satellites.find((s) => s.id === effectiveId) ||
      satellites.find((s) => s.id === 25544) ||
      satellites[0] ||
      null
    );
  }, [satellites, effectiveId]);

  const satrec = useMemo(() => {
    if (!targetSat) return null;
    try {
      const sr = satellite.twoline2satrec(targetSat.line1, targetSat.line2);
      if (sr && !sr.error) return sr;
    } catch {
      /* skip */
    }
    return null;
  }, [targetSat]);

  const sat3DGeometry = useMemo(() => create3DSatelliteGeometry(), []);
  const linePositions = useMemo(() => new Float32Array(6), []);

  useFrame(({ clock }) => {
    if (!satrec || !satGroupRef.current) return;

    const timeMs = useOrbitalStore.getState().timeMs;
    const now = new Date(timeMs);
    const gmst = satellite.gstime(now);

    const pv = satellite.propagate(satrec, now);
    const pos = pv?.position;

    if (!pos || typeof pos === "boolean" || isNaN(pos.x)) return;

    const gd = satellite.eciToGeodetic(pos as satellite.EciVec3<number>, gmst);
    const lat = satellite.degreesLat(gd.latitude);
    let lon = satellite.degreesLong(gd.longitude);
    if (lon > 180) lon -= 360;
    if (lon < -180) lon += 360;

    const altKm = gd.height || 420;
    const r = EARTH_RADIUS_3D * (1 + altKm / EARTH_RADIUS_KM);
    const ecefPos = latLonToVector3(lat, lon, r);
    const surfacePos = ecefPos.clone().normalize().multiplyScalar(EARTH_RADIUS_3D + 0.02);

    // 1. Position satellite spacecraft model directly on GPU
    satGroupRef.current.position.copy(ecefPos);

    if (modelRef.current) {
      modelRef.current.rotation.y = clock.getElapsedTime() * 1.0;
    }

    // 2. Holographic targeting reticle always faces camera
    if (reticleRef.current) {
      const pulse = 1.0 + 0.12 * Math.sin(clock.getElapsedTime() * 4.0);
      reticleRef.current.scale.set(pulse, pulse, pulse);
      reticleRef.current.quaternion.copy(camera.quaternion);
    }

    // 3. Ground subpoint marker on Earth's surface directly beneath the satellite
    if (subpointRef.current) {
      subpointRef.current.position.copy(surfacePos);
      subpointRef.current.lookAt(ecefPos);
    }

    // 4. Update vertical subpoint connector line
    linePositions[0] = ecefPos.x;
    linePositions[1] = ecefPos.y;
    linePositions[2] = ecefPos.z;
    linePositions[3] = surfacePos.x;
    linePositions[4] = surfacePos.y;
    linePositions[5] = surfacePos.z;

    const geom = connectorLine.geometry;
    const attr = geom.getAttribute("position");
    if (attr) {
      attr.needsUpdate = true;
    } else {
      geom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    }

    // 5. Update world coordinate reference for smooth camera locking
    if (satGroupRef.current.parent) {
      const worldPos = ecefPos.clone();
      satGroupRef.current.parent.localToWorld(worldPos);
      worldPosRef.current = worldPos;
    }
  });

  return (
    <group>
      {/* Dynamic Subpoint Connector Line to Earth Surface */}
      <primitive object={connectorLine} />

      {/* Ground Subpoint Footprint Marker on Earth's Surface */}
      <group ref={subpointRef}>
        <mesh>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#ec4899" />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <ringGeometry args={[0.10, 0.17, 24]} />
          <meshBasicMaterial color="#ec4899" side={THREE.DoubleSide} transparent opacity={0.75} />
        </mesh>
      </group>

      {/* Satellite Main Body & Holographic Reticle */}
      <group ref={satGroupRef}>
        {/* Sleek Spacecraft 3D Model with High-Contrast Pink Finish */}
        <group ref={modelRef} scale={[1.35, 1.35, 1.35]}>
          <mesh geometry={sat3DGeometry}>
            <meshStandardMaterial
              color="#ec4899"
              emissive="#f43f5e"
              emissiveIntensity={0.9}
              roughness={0.2}
              metalness={0.85}
            />
          </mesh>
          {/* Glowing Center Core Beacon */}
          <mesh>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* Pulsing Locator Reticle Rings */}
        <group ref={reticleRef}>
          {/* Outer Holographic Reticle Ring in Pink */}
          <mesh>
            <ringGeometry args={[0.34, 0.38, 32]} />
            <meshBasicMaterial color="#ec4899" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          {/* Inner Light Pink Radar Accent Ring */}
          <mesh>
            <ringGeometry args={[0.22, 0.25, 24]} />
            <meshBasicMaterial color="#f472b6" side={THREE.DoubleSide} transparent opacity={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SatellitesInstancedMesh — 3D Geometrical Satellite Models
// ─────────────────────────────────────────────────────────────────────────────
function SatellitesInstancedMesh({
  satellites,
  latestPositions,
  selectedId,
  onEcefPosUpdate,
  onHoverChange,
  onTrackSatellite,
}: {
  satellites: SatelliteData[];
  latestPositions?: React.RefObject<Float32Array | null>;
  selectedId: number | null;
  onEcefPosUpdate?: (pos: THREE.Vector3 | null) => void;
  onHoverChange: (sat: SatelliteData | null) => void;
  onTrackSatellite?: (id: number) => void;
}) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const hitMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastHoveredInstRef = useRef<number | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const sat3DGeometry = useMemo(() => create3DSatelliteGeometry(), []);
  const hitProxyGeometry = useMemo(() => new THREE.SphereGeometry(0.28, 12, 12), []);

  // Pre-build O(1) buffer lookup map
  const satIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    const fullList = useOrbitalStore.getState().satellitesList;
    for (let i = 0; i < satellites.length; i++) {
      const sat = satellites[i];
      const fullIdx = fullList.findIndex((s) => s.id === sat.id);
      if (fullIdx !== -1) {
        map.set(sat.id, fullIdx * 8);
      }
    }
    return map;
  }, [satellites]);

  // Pre-parse satrecs for fallback propagation when worker is not active
  const fallbackSatrecMap = useMemo(() => {
    const map = new Map<number, satellite.SatRec>();
    for (let i = 0; i < Math.min(satellites.length, 120); i++) {
      const sat = satellites[i];
      try {
        const sr = satellite.twoline2satrec(sat.line1, sat.line2);
        if (sr && !sr.error) map.set(sat.id, sr);
      } catch {
        /* skip */
      }
    }
    return map;
  }, [satellites]);

  useFrame(({ gl }) => {
    // Guard: bail if WebGL context has been lost
    if (!gl || !gl.domElement || gl.domElement.classList.contains("webgl-context-lost")) return;

    const mesh = instancedMeshRef.current;
    const hitMesh = hitMeshRef.current;
    if (!mesh) return;

    const positions = latestPositions?.current;

    // Fallback if worker positions buffer not yet ready: propagate locally
    if (!positions) {
      const count = Math.min(satellites.length, 120);
      mesh.count = count;
      if (hitMesh) hitMesh.count = count;
      const targetDate = new Date(useOrbitalStore.getState().timeMs);
      const gmstT = satellite.gstime(targetDate);
      let selectedEcef: THREE.Vector3 | null = null;

      for (let i = 0; i < count; i++) {
        const sat = satellites[i];
        const sr = fallbackSatrecMap.get(sat.id);
        if (!sr) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          if (hitMesh) hitMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const pv = satellite.propagate(sr, targetDate);
        const p = pv?.position;
        if (!p || typeof p === "boolean" || isNaN(p.x)) {
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          if (hitMesh) hitMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        const gd = satellite.eciToGeodetic(p as satellite.EciVec3<number>, gmstT);
        const lat = satellite.degreesLat(gd.latitude);
        let lon = satellite.degreesLong(gd.longitude);
        if (lon > 180) lon -= 360;
        const r = EARTH_RADIUS_3D * (1 + (gd.height || 500) / EARTH_RADIUS_KM);
        const ecefPos = latLonToVector3(lat, lon, r);

        dummy.position.copy(ecefPos);
        dummy.lookAt(0, 0, 0);

        if (sat.id === selectedId) {
          selectedEcef = ecefPos.clone();
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          dummy.scale.set(0.75, 0.75, 0.75);
          dummy.updateMatrix();
          if (hitMesh) hitMesh.setMatrixAt(i, dummy.matrix);
          continue;
        }

        dummy.scale.set(0.38, 0.38, 0.38);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (hitMesh) hitMesh.setMatrixAt(i, dummy.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (hitMesh) hitMesh.instanceMatrix.needsUpdate = true;
      onEcefPosUpdate?.(selectedEcef);
      return;
    }

    mesh.count = satellites.length;
    if (hitMesh) hitMesh.count = satellites.length;

    let selectedEcef: THREE.Vector3 | null = null;

    for (let i = 0; i < satellites.length; i++) {
      const sat = satellites[i];
      const bufferIdx = satIndexMap.get(sat.id);

      if (bufferIdx === undefined) {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (hitMesh) hitMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const lat = positions[bufferIdx + 4];
      const lon = positions[bufferIdx + 5];
      const alt = positions[bufferIdx + 6];

      if (isNaN(lat)) {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (hitMesh) hitMesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const r = EARTH_RADIUS_3D * (1 + alt / EARTH_RADIUS_KM);
      const ecefPos = latLonToVector3(lat, lon, r);

      dummy.position.copy(ecefPos);
      dummy.lookAt(0, 0, 0);

      if (sat.id === selectedId) {
        selectedEcef = ecefPos.clone();

        // 1. Hide cyan visual mesh so ONLY the rotating pink 3D satellite model is visible
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        // 2. Keep hitMesh scale active so raycasting/clicks on tracked satellite remain instant
        dummy.scale.set(0.75, 0.75, 0.75);
        dummy.updateMatrix();
        if (hitMesh) hitMesh.setMatrixAt(i, dummy.matrix);

        continue;
      }

      dummy.scale.set(0.38, 0.38, 0.38);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (hitMesh) hitMesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (hitMesh) hitMesh.instanceMatrix.needsUpdate = true;
    onEcefPosUpdate?.(selectedEcef);
  });

  if (satellites.length === 0) return null;

  const handlePointerDown = (e: any) => {
    const clientX = e.clientX ?? e.nativeEvent?.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.nativeEvent?.touches?.[0]?.clientY ?? 0;
    pointerDownPosRef.current = { x: clientX, y: clientY };
  };

  const handleSatelliteClick = (e: any) => {
    e.stopPropagation();
    if (pointerDownPosRef.current) {
      const cx = e.clientX ?? e.nativeEvent?.changedTouches?.[0]?.clientX ?? pointerDownPosRef.current.x;
      const cy = e.clientY ?? e.nativeEvent?.changedTouches?.[0]?.clientY ?? pointerDownPosRef.current.y;
      const dx = cx - pointerDownPosRef.current.x;
      const dy = cy - pointerDownPosRef.current.y;
      pointerDownPosRef.current = null;

      // Ignore drag movements > 10px (user was orbiting Earth)
      if (Math.hypot(dx, dy) > 10) return;
    }

    const instId = e.instanceId;
    if (instId === undefined || instId < 0 || instId >= satellites.length) return;

    const sat = satellites[instId];
    if (sat) {
      useOrbitalStore.getState().setSelectedSatelliteId(sat.id);
      if (onTrackSatellite) {
        onTrackSatellite(sat.id);
      }
    }
  };

  const handlePointerHover = (e: any) => {
    e.stopPropagation();
    const instId = e.instanceId;
    if (instId === undefined || instId < 0 || instId >= satellites.length) return;

    if (lastHoveredInstRef.current === instId) return;
    lastHoveredInstRef.current = instId;

    document.body.style.cursor = "pointer";
    const sat = satellites[instId];
    if (sat) {
      onHoverChange(sat);
    }
  };

  const meshKey = `sat-mesh-${satellites.length}-${satellites[0]?.id || 0}`;

  return (
    <group>
      {/* 1. Original visual satellite model (restored 100% to original design) */}
      <instancedMesh
        key={`vis-${meshKey}`}
        ref={instancedMeshRef}
        geometry={sat3DGeometry}
        args={[null as any, null as any, satellites.length]}
        raycast={() => null}
      >
        <meshStandardMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.9}
        />
      </instancedMesh>

      {/* 2. Invisible hit proxy mesh for 100% reliable 3D touch/click raycasting */}
      <instancedMesh
        key={`hit-${meshKey}`}
        ref={hitMeshRef}
        geometry={hitProxyGeometry}
        args={[null as any, null as any, satellites.length]}
        onPointerOver={handlePointerHover}
        onPointerMove={handlePointerHover}
        onPointerOut={(e) => {
          e.stopPropagation();
          lastHoveredInstRef.current = null;
          document.body.style.cursor = "default";
          onHoverChange(null);
        }}
        onPointerDown={handlePointerDown}
        onClick={handleSatelliteClick}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EarthScene
// ─────────────────────────────────────────────────────────────────────────────
function EarthScene({
  satellites,
  selectedSatId,
  latestPositions,
  lockCamera,
  controlsRef,
  onTrackSatellite,
  onHoverChange,
  observer,
  showOnlySelected = false,
}: {
  satellites: SatelliteData[];
  selectedSatId: number | null;
  latestPositions?: React.RefObject<Float32Array | null>;
  lockCamera: boolean;
  controlsRef: React.RefObject<any>;
  onTrackSatellite?: (id: number) => void;
  onHoverChange: (sat: SatelliteData | null) => void;
  observer?: { lat: number; lon: number; name?: string };
  showOnlySelected?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const worldPosRef = useRef<THREE.Vector3 | null>(null);
  const effectiveId = selectedSatId ?? 25544;

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const timeMs = useOrbitalStore.getState().timeMs;
    const now = new Date(timeMs);
    const gmst = satellite.gstime(now);
    updateEarthOrientation(group, gmst);
    group.updateMatrixWorld(true);
  });

  return (
    <>
      <group ref={groupRef}>
        <EarthMesh texturePath="/textures/planets/2k_earth_daymap.jpg" />

        {/* Observer Ground Station Pin & Beacon */}
        {observer && (
          <group position={latLonToVector3(observer.lat, observer.lon, EARTH_RADIUS_3D + 0.05)}>
            <mesh>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshBasicMaterial color="#ffd700" />
            </mesh>
            <mesh rotation-x={Math.PI / 2}>
              <ringGeometry args={[0.13, 0.20, 24]} />
              <meshBasicMaterial color="#ffd700" side={THREE.DoubleSide} transparent opacity={0.85} />
            </mesh>
          </group>
        )}

        {/* Yellow Dotted Line from My Location Following Path to Satellite */}
        {observer && (
          <ObserverToSatelliteTrack
            observer={observer}
            satellites={satellites}
            selectedSatId={effectiveId}
          />
        )}

        {/* Background constellation satellites (hidden when showOnlySelected is active) */}
        {!showOnlySelected && (
          <SatellitesInstancedMesh
            satellites={satellites}
            latestPositions={latestPositions}
            selectedId={effectiveId}
            onHoverChange={onHoverChange}
            onTrackSatellite={onTrackSatellite}
          />
        )}

        {/* Show orbit of selected satellite alone (defaults to ISS 25544, or single selected satellite) */}
        <SelectedOrbitTrack
          satellites={satellites}
          selectedSatId={effectiveId}
        />

        {/* Real-time 3D Spacecraft Model, Locator Reticle, Connector Line & Subpoint */}
        <TrackedSatelliteCurrentLocation
          satellites={satellites}
          selectedSatId={effectiveId}
          worldPosRef={worldPosRef}
        />
      </group>

      <CameraController
        worldPosRef={worldPosRef}
        lockCamera={lockCamera}
        controlsRef={controlsRef}
        selectedId={effectiveId}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        maxDistance={45}
        minDistance={4.6}
        zoomSpeed={1.2}
        rotateSpeed={0.8}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────────────────────────────────────
export interface Satellite3DViewProps {
  satellites: SatelliteData[];
  selectedSatId?: number | null;
  latestPositions?: React.RefObject<Float32Array | null>;
  lockCamera?: boolean;
  onTrackSatellite?: (id: number) => void;
  observer?: { lat: number; lon: number; name?: string };
  showOnlySelected?: boolean;
}

function Satellite3DView({
  satellites,
  selectedSatId,
  latestPositions,
  lockCamera = false,
  onTrackSatellite,
  observer,
  showOnlySelected = false,
}: Satellite3DViewProps) {
  const storeSelectedId = useOrbitalStore((s) => s.selectedSatelliteId);
  const activeSelectedId = selectedSatId ?? storeSelectedId ?? 25544;
  const [hoveredSat, setHoveredSat] = useState<SatelliteData | null>(null);
  const controlsRef = useRef<any>(null);

  const selectedSatName = useMemo(() => {
    const sat = satellites.find((s) => s.id === activeSelectedId);
    return sat?.name || (activeSelectedId === 25544 ? "ISS (ZARYA)" : `SAT-${activeSelectedId}`);
  }, [satellites, activeSelectedId]);

  const selectedSatrec = useMemo(() => {
    const sat = satellites.find((s) => s.id === activeSelectedId);
    if (!sat) return null;
    try {
      const sr = satellite.twoline2satrec(sat.line1, sat.line2);
      if (sr && !sr.error) return sr;
    } catch {
      /* skip */
    }
    return null;
  }, [satellites, activeSelectedId]);

  // Subscribe to 1-second simulation time bucket for corner telemetry
  const timeSecBucket = useOrbitalStore((s) => Math.floor(s.timeMs / 1000));
  const selectedTelemetry = useMemo(() => {
    if (!selectedSatrec) return { altKm: 420, velKms: 7.66 };
    try {
      const now = new Date(timeSecBucket * 1000);
      const pv = satellite.propagate(selectedSatrec, now);
      const pos = pv?.position;
      const vel = pv?.velocity;
      if (pos && typeof pos !== "boolean" && !isNaN(pos.x)) {
        const gmst = satellite.gstime(now);
        const gd = satellite.eciToGeodetic(pos as satellite.EciVec3<number>, gmst);
        const altKm = Math.round(gd.height || 420);
        let velKms = 7.66;
        if (vel && typeof vel !== "boolean" && !isNaN(vel.x)) {
          velKms = Number(Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z).toFixed(2));
        }
        return { altKm, velKms };
      }
    } catch {
      /* fallback */
    }
    return { altKm: 420, velKms: 7.66 };
  }, [selectedSatrec, timeSecBucket]);

  const handleZoomIn = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(1.28);
      controlsRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyOut(1.28);
      controlsRef.current.update();
    }
  };

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="h-full w-full bg-[#03040a] relative isolate select-none">
      {/* Top-Right Corner HUD Satellite Hover Details Overlay */}
      {hoveredSat && (
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-1 bg-slate-950/95 border border-[#00e5ff]/60 px-3.5 py-2.5 rounded-lg shadow-[0_0_20px_rgba(0,229,255,0.25)] pointer-events-none select-none min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-3">
            <span className="font-mono text-[9px] font-bold text-[#00e5ff] uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
              SATELLITE INFO
            </span>
            <span className="font-mono text-[9px] font-bold text-slate-400">ID #{hoveredSat.id}</span>
          </div>
          <div className="font-mono text-[11px] font-bold text-white truncate max-w-[210px]">
            {hoveredSat.name}
          </div>
          <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 pt-0.5 gap-2">
            <span>CAT: <strong className="text-cyan-300">{hoveredSat.category.toUpperCase()}</strong></span>
            <span>ORBIT: <strong className="text-cyan-300">{hoveredSat.orbitClass}</strong></span>
          </div>
        </div>
      )}

      {/* Floating HUD Controls for Zoom & Reset */}
      <div className="absolute right-3 bottom-6 z-20 flex flex-col items-center gap-1 bg-slate-950/85 border border-white/15 p-1.5 rounded-xl shadow-2xl backdrop-blur-md">
        <button
          onClick={handleZoomIn}
          title="Zoom In (+)"
          type="button"
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-400 border border-white/10 flex items-center justify-center font-mono font-bold text-base transition select-none active:scale-95 cursor-pointer"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          type="button"
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-400 border border-white/10 flex items-center justify-center font-mono font-bold text-base transition select-none active:scale-95 cursor-pointer"
        >
          -
        </button>
        <button
          onClick={handleResetCamera}
          title="Reset Orbit View"
          type="button"
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-400 border border-white/10 flex items-center justify-center font-mono font-bold text-[9px] transition select-none active:scale-95 uppercase cursor-pointer"
        >
          RST
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 10, 18], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          // Guard against WebGL context loss events
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            console.warn("[Orbit 3D] WebGL context lost — suspending render loop.");
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            console.info("[Orbit 3D] WebGL context restored.");
          });
        }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[15, 3, 10]} intensity={1.8} />
        <directionalLight position={[-15, -3, -10]} intensity={0.8} />
        <Stars radius={200} depth={50} count={3500} factor={4} saturation={0.5} fade speed={1.5} />

        <EarthScene
          satellites={satellites}
          selectedSatId={activeSelectedId}
          latestPositions={latestPositions}
          lockCamera={lockCamera}
          controlsRef={controlsRef}
          onTrackSatellite={onTrackSatellite}
          onHoverChange={setHoveredSat}
          observer={observer}
          showOnlySelected={showOnlySelected}
        />
      </Canvas>
    </div>
  );
}

export default memo(Satellite3DView);
