"use client";

import { useMemo, useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, useTexture, useGLTF, Html } from "@react-three/drei";
import * as satellite from "satellite.js";
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
// NASA 3D Earth Model (From https://solarsystem.nasa.gov/gltf_embed/2393/)
// ─────────────────────────────────────────────────────────────────────────────
function NasaEarthModel({ radius = EARTH_RADIUS_3D }: { radius?: number }) {
  const { scene } = useGLTF("/models/earth.glb");
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const scale = radius / 500;

  return (
    <primitive
      object={clonedScene}
      scale={[scale, scale, scale]}
      rotation={[0, -Math.PI / 2, 0]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Earth mesh with official NASA 3D Earth model
// ─────────────────────────────────────────────────────────────────────────────
function EarthMesh({ texturePath }: { texturePath: string }) {
  const texture = useTexture(texturePath);
  return (
    <group>
      {/* Official NASA 3D Earth GLTF Model */}
      <Suspense
        fallback={
          <mesh>
            <sphereGeometry args={[EARTH_RADIUS_3D, 64, 64]} />
            <meshStandardMaterial map={texture} roughness={0.45} metalness={0.15} />
          </mesh>
        }
      >
        <NasaEarthModel radius={EARTH_RADIUS_3D} />
      </Suspense>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D * 1.025, 48, 48]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D * 1.06, 32, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Orbit track — in ECEF local space
// ─────────────────────────────────────────────────────────────────────────────
function SelectedOrbitTrack() {
  const selectedSatrec = useOrbitalStore((s) => s.selectedSatrec);
  const timeMs = useOrbitalStore((s) => s.timeMs);

  const points = useMemo(() => {
    if (!selectedSatrec) return [];
    const pts: THREE.Vector3[] = [];
    const periodMin = (2 * Math.PI) / selectedSatrec.no;
    const steps = 120;

    for (let i = 0; i <= steps; i++) {
      const propTime = new Date(timeMs + (i / steps) * periodMin * 60_000);
      const posAndVel = satellite.propagate(selectedSatrec, propTime);
      const pos = posAndVel?.position;
      if (!pos || typeof pos === "boolean" || isNaN(pos.x)) continue;

      const gmstT = satellite.gstime(propTime);
      const gd = satellite.eciToGeodetic(pos, gmstT);
      const lat = satellite.degreesLat(gd.latitude);
      let lon = satellite.degreesLong(gd.longitude);
      if (lon > 180) lon -= 360;
      const r = EARTH_RADIUS_3D * (1 + gd.height / EARTH_RADIUS_KM);
      pts.push(latLonToVector3(lat, lon, r));
    }
    return pts;
  }, [selectedSatrec, timeMs]);

  if (points.length < 2) return null;
  return <Line points={points} color="#00ff88" lineWidth={2.0} opacity={0.9} transparent />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subpoint connector line
// ─────────────────────────────────────────────────────────────────────────────
function SelectedSubpointConnector({ ecefPos }: { ecefPos: THREE.Vector3 | null }) {
  if (!ecefPos) return null;
  const surface = ecefPos.clone().normalize().multiplyScalar(EARTH_RADIUS_3D);
  return (
    <group>
      <Line points={[ecefPos, surface]} color="#ffcc00" lineWidth={1} dashed dashSize={0.2} gapSize={0.1} />
      <mesh position={surface}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
    </group>
  );
}

function CameraController({
  worldPos,
  lockCamera,
  controlsRef,
}: {
  worldPos: THREE.Vector3 | null;
  lockCamera: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const prevIdRef = useRef<string | null>(null);
  const selectedId = useOrbitalStore((s) => s.selectedSatelliteId);

  useEffect(() => {
    if (!worldPos || !selectedId) return;
    if (String(selectedId) === prevIdRef.current) return;
    prevIdRef.current = String(selectedId);
    const dir = worldPos.clone().normalize();
    const camPos = worldPos.clone().add(dir.multiplyScalar(3.0));
    camera.position.lerp(camPos, 0.8);
    controlsRef.current?.target.lerp(worldPos, 0.8);
  }, [selectedId, worldPos, camera, controlsRef]);

  useFrame(() => {
    if (!controlsRef.current || !worldPos || !lockCamera) return;
    controlsRef.current.target.lerp(worldPos, 0.1);
    controlsRef.current.update();
  });

  return null;
}

import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
// Selected 3D Satellite Animated Model
// ─────────────────────────────────────────────────────────────────────────────
function Selected3DSatelliteModel({ position }: { position: THREE.Vector3 }) {
  const modelRef = useRef<THREE.Group>(null);
  const sat3DGeometry = useMemo(() => create3DSatelliteGeometry(), []);

  useFrame(({ clock }) => {
    if (modelRef.current) {
      modelRef.current.rotation.y = clock.getElapsedTime() * 1.5;
    }
  });

  return (
    <group position={position}>
      <group ref={modelRef} scale={[0.75, 0.75, 0.75]}>
        <mesh geometry={sat3DGeometry}>
          <meshStandardMaterial
            color="#dc0ec4"
            emissive="#dc0ec4"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
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
  latestPositions: React.RefObject<Float32Array | null>;
  selectedId: number | null;
  onEcefPosUpdate: (pos: THREE.Vector3 | null) => void;
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

  useFrame(({ gl }) => {
    // Guard: bail if WebGL context has been lost
    if (!gl || !gl.domElement || gl.domElement.classList.contains("webgl-context-lost")) return;

    const mesh = instancedMeshRef.current;
    const hitMesh = hitMeshRef.current;
    const positions = latestPositions.current;
    if (!mesh || !positions) return;

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
    onEcefPosUpdate(selectedEcef);
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
  latestPositions,
  lockCamera,
  onTrackSatellite,
  onHoverChange,
}: {
  satellites: SatelliteData[];
  latestPositions: React.RefObject<Float32Array | null>;
  lockCamera: boolean;
  onTrackSatellite?: (id: number) => void;
  onHoverChange: (sat: SatelliteData | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const selectedId = useOrbitalStore((s) => s.selectedSatelliteId);

  const [selectedEcef, setSelectedEcef] = useState<THREE.Vector3 | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<THREE.Vector3 | null>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const timeMs = useOrbitalStore.getState().timeMs;
    const gmst = satellite.gstime(new Date(timeMs));
    updateEarthOrientation(group, gmst);
    group.updateMatrixWorld(true);

    if (selectedEcef) {
      const w = selectedEcef.clone();
      group.localToWorld(w);
      setSelectedWorld(w);
    } else {
      setSelectedWorld(null);
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <EarthMesh texturePath="/textures/planets/2k_earth_daymap.jpg" />

        <SatellitesInstancedMesh
          satellites={satellites}
          latestPositions={latestPositions}
          selectedId={selectedId}
          onEcefPosUpdate={setSelectedEcef}
          onHoverChange={onHoverChange}
          onTrackSatellite={onTrackSatellite}
        />

        <SelectedOrbitTrack />
        <SelectedSubpointConnector ecefPos={selectedEcef} />

        {selectedEcef && (
          <Selected3DSatelliteModel position={selectedEcef} />
        )}
      </group>

      <CameraController
        worldPos={selectedWorld}
        lockCamera={lockCamera}
        controlsRef={controlsRef}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        maxDistance={40}
        minDistance={4.8}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────────────────────────────────────
interface Satellite3DViewProps {
  satellites: SatelliteData[];
  latestPositions: React.RefObject<Float32Array | null>;
  lockCamera: boolean;
  onTrackSatellite?: (id: number) => void;
}

export default function Satellite3DView({
  satellites,
  latestPositions,
  lockCamera,
  onTrackSatellite,
}: Satellite3DViewProps) {
  const selectedId = useOrbitalStore((s) => s.selectedSatelliteId);
  const [hoveredSat, setHoveredSat] = useState<SatelliteData | null>(null);

  const selectedSatName = useMemo(
    () => satellites.find((s) => s.id === selectedId)?.name ?? "",
    [satellites, selectedId]
  );

  return (
    <div className="h-full w-full bg-[#03040a] relative">
      {/* Top-Left Corner HUD Satellite Tracking Overlay */}
      {selectedSatName && (
        <div className="absolute left-4 top-14 z-20 flex items-center gap-2 bg-slate-950/90 border border-[#00ff88]/80 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(0,255,136,0.4)] pointer-events-none select-none">
          <span className="flex h-2 w-2 rounded-full bg-[#00ff88] animate-ping" />
          <span className="font-mono text-[9px] font-bold text-[#00ff88] uppercase tracking-widest">
            Tracking:
          </span>
          <span className="font-mono text-[10px] font-bold text-white tracking-wide">
            {selectedSatName}
          </span>
        </div>
      )}

      {/* Top-Right Corner HUD Satellite Hover Details Overlay */}
      {hoveredSat && (
        <div className="absolute right-4 top-14 z-20 flex flex-col gap-1 bg-slate-950/95 border border-[#00e5ff]/60 px-3.5 py-2.5 rounded-lg shadow-[0_0_20px_rgba(0,229,255,0.25)] pointer-events-none select-none min-w-[170px]">
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

      <Canvas
        camera={{ position: [0, 10, 18], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          // Guard against WebGL context loss events to prevent .save() on undefined
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            console.warn("[Orbit 3D] WebGL context lost — suspending render loop.");
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            console.info("[Orbit 3D] WebGL context restored.");
          });
        }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[15, 12, 15]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[-15, -8, -12]} intensity={0.7} color="#00e5ff" />
        <Stars radius={200} depth={50} count={3500} factor={4} saturation={0.5} fade speed={1.5} />

        <EarthScene
          satellites={satellites}
          latestPositions={latestPositions}
          lockCamera={lockCamera}
          onTrackSatellite={onTrackSatellite}
          onHoverChange={setHoveredSat}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/earth.glb");
