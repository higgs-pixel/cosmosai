"use client";

import { useMemo, useRef, useEffect, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line, useTexture } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as satellite from "satellite.js";
import { ObserverCoords, SatellitePass } from "./PassPredictor";

const EARTH_RADIUS_3D = 4.0;
const EARTH_RADIUS_KM = 6371.0;

function safeLatLon(lat: any, lon: any): { lat: number; lon: number } {
  const safeLat = typeof lat === "number" && !isNaN(lat) ? lat : 0;
  const safeLon = typeof lon === "number" && !isNaN(lon) ? lon : 0;
  return { lat: safeLat, lon: safeLon };
}

function latLonToVector3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const safeLat = isNaN(latDeg) ? 0 : latDeg;
  const safeLon = isNaN(lonDeg) ? 0 : lonDeg;
  const phi = (90 - safeLat) * (Math.PI / 180);
  const theta = (safeLon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function get3DOrbitRadius(altKm: number): number {
  const safeAlt = Math.max(150, altKm || 500);
  const normAlt = Math.log10(1 + safeAlt / 350);
  return EARTH_RADIUS_3D + 0.12 + normAlt * 0.70;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleek 3D Satellite Geometry Generator (Bus, Wings, Antenna, Thruster)
// ─────────────────────────────────────────────────────────────────────────────
function create3DSatelliteGeometry(): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  const bus = new THREE.BoxGeometry(0.14, 0.20, 0.14);
  geometries.push(bus);

  const leftWing1 = new THREE.BoxGeometry(0.24, 0.12, 0.02);
  leftWing1.translate(-0.20, 0, 0);
  geometries.push(leftWing1);

  const leftWing2 = new THREE.BoxGeometry(0.24, 0.12, 0.02);
  leftWing2.translate(-0.46, 0, 0);
  geometries.push(leftWing2);

  const rightWing1 = new THREE.BoxGeometry(0.24, 0.12, 0.02);
  rightWing1.translate(0.20, 0, 0);
  geometries.push(rightWing1);

  const rightWing2 = new THREE.BoxGeometry(0.24, 0.12, 0.02);
  rightWing2.translate(0.46, 0, 0);
  geometries.push(rightWing2);

  const boomLeft = new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8);
  boomLeft.rotateZ(Math.PI / 2);
  boomLeft.translate(-0.31, 0, 0);
  geometries.push(boomLeft);

  const boomRight = new THREE.CylinderGeometry(0.012, 0.012, 0.62, 8);
  boomRight.rotateZ(Math.PI / 2);
  boomRight.translate(0.31, 0, 0);
  geometries.push(boomRight);

  const dish = new THREE.ConeGeometry(0.09, 0.06, 16);
  dish.rotateX(-Math.PI / 2);
  dish.translate(0, 0.14, 0.05);
  geometries.push(dish);

  const sensorTop = new THREE.CylinderGeometry(0.025, 0.035, 0.06, 8);
  sensorTop.translate(0, 0.13, 0);
  geometries.push(sensorTop);

  const thrusterBot = new THREE.ConeGeometry(0.035, 0.06, 8);
  thrusterBot.rotateX(Math.PI);
  thrusterBot.translate(0, -0.13, 0);
  geometries.push(thrusterBot);

  const beaconCore = new THREE.SphereGeometry(0.05, 12, 12);
  geometries.push(beaconCore);

  return mergeGeometries(geometries);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracked 3D Satellite Model (Prominent Magenta Pink #dc0ec4)
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
      <group ref={modelRef} scale={[1.3, 1.3, 1.3]}>
        <mesh geometry={sat3DGeometry}>
          <meshStandardMaterial
            color="#dc0ec4"
            emissive="#dc0ec4"
            emissiveIntensity={1.5}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      </group>
      <pointLight color="#dc0ec4" intensity={2.5} distance={2.0} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subpoint Connector Line (Yellow #ffcc00)
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

// ─────────────────────────────────────────────────────────────────────────────
// Procedural Cloud Texture Generator (HTML5 Canvas Turbulence)
// ─────────────────────────────────────────────────────────────────────────────
function createProceduralCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "rgba(0, 0, 0, 0)";
  ctx.fillRect(0, 0, 1024, 512);

  // Soft atmospheric cloud masses
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * 1024;
    const latZone = (Math.random() - 0.5) * 2;
    const y = 256 + latZone * 180;
    const r = 25 + Math.random() * 60;
    const alpha = 0.08 + Math.random() * 0.22;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.6, `rgba(240, 248, 255, ${alpha * 0.5})`);
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cyclonic spirals & storm belts
  for (let c = 0; c < 8; c++) {
    const cx = Math.random() * 1024;
    const cy = 80 + Math.random() * 350;
    const swirlRadius = 35 + Math.random() * 40;
    for (let s = 0; s < 14; s++) {
      const angle = (s / 14) * Math.PI * 2;
      const dist = (s / 14) * swirlRadius;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.28)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// ─────────────────────────────────────────────────────────────────────────────
// Real Earth Daymap Mesh with Specular Oceans & Procedural Clouds
// ─────────────────────────────────────────────────────────────────────────────
function EarthMesh({ texturePath }: { texturePath: string }) {
  const texture = useTexture(texturePath);
  const cloudTex = useMemo(() => (typeof document !== "undefined" ? createProceduralCloudTexture() : null), []);
  const cloudRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <group>
      {/* Real Earth Surface (Ocean Specular Gloss) */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.45} metalness={0.15} />
      </mesh>

      {/* Procedural Atmospheric Cloud Layer */}
      {cloudTex && (
        <mesh ref={cloudRef}>
          <sphereGeometry args={[EARTH_RADIUS_3D * 1.012, 64, 64]} />
          <meshStandardMaterial
            map={cloudTex}
            transparent
            opacity={0.82}
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </mesh>
      )}

      {/* Inner Atmospheric Rim Glow */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D * 1.025, 48, 48]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>

      {/* Outer Rayleigh Scattering Exosphere */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D * 1.06, 32, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function FallbackEarthMesh() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D, 48, 48]} />
        <meshStandardMaterial color="#0c2340" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS_3D * 1.025, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

interface Observer3DViewProps {
  observer: ObserverCoords;
  selectedPass: SatellitePass | null;
  simPoint?: {
    lat: number;
    lon: number;
    altKm: number;
    satName: string;
    elDeg: number;
    line1?: string;
    line2?: string;
  } | null;
  timeMs?: number;
}

function CameraAndControls({ observer }: { observer: ObserverCoords }) {
  const { camera } = useThree();
  const prevCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const { lat, lon } = safeLatLon(observer?.lat, observer?.lon);
    // Only re-orient camera if GPS coordinates genuinely change
    if (
      !prevCoordsRef.current ||
      Math.abs(prevCoordsRef.current.lat - lat) > 0.0001 ||
      Math.abs(prevCoordsRef.current.lon - lon) > 0.0001
    ) {
      prevCoordsRef.current = { lat, lon };
      const vec = latLonToVector3(lat, lon, EARTH_RADIUS_3D * 2.35);
      if (!isNaN(vec.x) && !isNaN(vec.y) && !isNaN(vec.z)) {
        camera.position.copy(vec);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      }
    }
  }, [observer?.lat, observer?.lon, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableZoom={true}
      zoomSpeed={1.2}
      minDistance={4.4}
      maxDistance={40}
      enablePan={false}
      enableRotate={true}
      rotateSpeed={0.8}
      enableDamping={true}
      dampingFactor={0.08}
    />
  );
}

function ObserverScene({ observer, selectedPass, simPoint, timeMs = Date.now() }: Observer3DViewProps) {
  const obsPos = useMemo(() => {
    const { lat, lon } = safeLatLon(observer?.lat, observer?.lon);
    return latLonToVector3(lat, lon, EARTH_RADIUS_3D + 0.02);
  }, [observer]);

  // Live Simulated Satellite ECEF Position Vector
  const satSimVec = useMemo(() => {
    if (!simPoint) return null;
    let { lat, lon } = safeLatLon(simPoint.lat, simPoint.lon);
    let altKm = simPoint.altKm || 500;

    if (simPoint.line1 && simPoint.line2) {
      try {
        const satrec = satellite.twoline2satrec(simPoint.line1, simPoint.line2);
        const targetDate = new Date(timeMs);
        const posVel = satellite.propagate(satrec, targetDate);
        if (posVel && posVel.position && typeof posVel.position === "object") {
          const gmst = satellite.gstime(targetDate);
          const posGd = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
          lat = satellite.degreesLat(posGd.latitude);
          lon = satellite.degreesLong(posGd.longitude);
          if (lon > 180) lon -= 360;
          if (lon < -180) lon += 360;
          altKm = posGd.height || altKm;
        }
      } catch {
        /* fallback to simPoint lat/lon */
      }
    }

    const r = get3DOrbitRadius(altKm);
    return latLonToVector3(lat, lon, r);
  }, [simPoint, timeMs]);

  // Full 3D Orbital Ground Track Line (Electric Green #00ff88)
  const orbitPathPoints = useMemo(() => {
    if (!simPoint) return [];

    if (simPoint.line1 && simPoint.line2) {
      try {
        const satrec = satellite.twoline2satrec(simPoint.line1, simPoint.line2);
        const pts: THREE.Vector3[] = [];
        const periodMins = 95;
        const steps = 90;

        for (let i = 0; i <= steps; i++) {
          const offsetMins = (i / steps - 0.5) * periodMins;
          const targetDate = new Date(timeMs + offsetMins * 60 * 1000);
          const posVel = satellite.propagate(satrec, targetDate);

          if (posVel && posVel.position && typeof posVel.position === "object") {
            const gmst = satellite.gstime(targetDate);
            const posGd = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);
            const lat = satellite.degreesLat(posGd.latitude);
            let lon = satellite.degreesLong(posGd.longitude);
            if (lon > 180) lon -= 360;
            if (lon < -180) lon += 360;
            const r = get3DOrbitRadius(posGd.height || simPoint.altKm || 500);
            pts.push(latLonToVector3(lat, lon, r));
          }
        }
        if (pts.length >= 10) return pts;
      } catch {
        /* fallback */
      }
    }

    if (selectedPass && selectedPass.points && selectedPass.points.length > 1) {
      const { lat: obsLat, lon: obsLon } = safeLatLon(observer?.lat, observer?.lon);
      return selectedPass.points.map((p) => {
        const r = get3DOrbitRadius(p.altitudeKm);
        const lat = p.satLat !== undefined ? p.satLat : obsLat + (p.slantRangeKm / 111) * Math.cos((p.azimuthDeg * Math.PI) / 180);
        const lon = p.satLon !== undefined ? p.satLon : obsLon + (p.slantRangeKm / (111 * Math.cos((obsLat * Math.PI) / 180))) * Math.sin((p.azimuthDeg * Math.PI) / 180);
        return latLonToVector3(lat, lon, r);
      });
    }

    let incRad = (51.6 * Math.PI) / 180;
    const { lat: simLat, lon: simLon } = safeLatLon(simPoint?.lat, simPoint?.lon);
    if (simPoint.line1 && simPoint.line2) {
      try {
        const satrec = satellite.twoline2satrec(simPoint.line1, simPoint.line2);
        if (typeof satrec.inclo === "number" && !isNaN(satrec.inclo)) {
          incRad = satrec.inclo;
        }
      } catch {
        /* fallback */
      }
    } else if (simLat) {
      incRad = Math.max((Math.abs(simLat) + 5) * (Math.PI / 180), 0.3);
    }

    const pts: THREE.Vector3[] = [];
    const altKm = simPoint.altKm || 500;
    const r = get3DOrbitRadius(altKm);
    const steps = 90;

    for (let i = 0; i <= steps; i++) {
      const frac = (i / steps) * 2 * Math.PI;
      const lat = Math.asin(Math.sin(incRad) * Math.sin(frac)) * (180 / Math.PI);
      let lon = simLon + (frac - Math.PI) * (180 / Math.PI);
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      pts.push(latLonToVector3(lat, lon, r));
    }

    return pts;
  }, [simPoint, selectedPass, timeMs, observer]);

  return (
    <>
      <group>
        <Suspense fallback={<FallbackEarthMesh />}>
          <EarthMesh texturePath="/textures/planets/2k_earth_daymap.jpg" />
        </Suspense>

        {/* Observer GPS Pin with Pulsing Radar Target Ring */}
        <group position={obsPos}>
          <mesh>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshBasicMaterial color="#ff3366" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.13, 0.20, 24]} />
            <meshBasicMaterial color="#ff3366" side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
          <pointLight color="#ff3366" intensity={2.0} distance={1.5} />
        </group>

        {/* 3D Tracked Satellite Model & Subpoint Connector Line */}
        {satSimVec && (
          <>
            <Selected3DSatelliteModel position={satSimVec} />
            <SelectedSubpointConnector ecefPos={satSimVec} />
          </>
        )}

        {/* Full 3D Orbital Trajectory Line (Electric Green #00ff88) */}
        {orbitPathPoints.length > 1 && (
          <Line points={orbitPathPoints} color="#00ff88" lineWidth={2.0} opacity={0.9} transparent />
        )}
      </group>

      <CameraAndControls observer={observer} />
    </>
  );
}

export default function Observer3DView({ observer, selectedPass, simPoint, timeMs }: Observer3DViewProps) {
  return (
    <div className="h-full w-full min-h-[460px] bg-[#03040a] relative flex items-center justify-center isolate z-0">
      {/* Top-Left Corner HUD Satellite Tracking Badge (Matching Orbit Page) */}
      {simPoint && (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2 bg-slate-950/90 border border-[#00ff88]/80 px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(0,255,136,0.4)] pointer-events-none select-none">
          <span className="flex h-2 w-2 rounded-full bg-[#00ff88] animate-ping" />
          <span className="font-mono text-[9px] font-bold text-[#00ff88] uppercase tracking-widest">
            Tracking:
          </span>
          <span className="font-mono text-[10px] font-bold text-white tracking-wide">
            {simPoint.satName}
          </span>
        </div>
      )}

      {/* Top-Right Corner HUD Satellite Hover Details Overlay Window (Matching Orbit Page) */}
      {simPoint && (
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-1 bg-slate-950/95 border border-[#00e5ff]/60 px-3.5 py-2.5 rounded-lg shadow-[0_0_20px_rgba(0,229,255,0.25)] pointer-events-none select-none min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-3">
            <span className="font-mono text-[9px] font-bold text-[#00e5ff] uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
              TARGET SATELLITE
            </span>
            <span className="font-mono text-[9px] font-bold text-[#00ff88]">{simPoint.elDeg}° EL</span>
          </div>
          <div className="font-mono text-[11px] font-bold text-white truncate max-w-[210px]">
            {simPoint.satName}
          </div>
          <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 pt-0.5 gap-2">
            <span>OBS: <strong className="text-cyan-300">{observer?.name?.split(",")[0] || "GPS"}</strong></span>
            <span>ALT: <strong className="text-cyan-300">{Math.round(simPoint.altKm || 500)} km</strong></span>
          </div>
        </div>
      )}

      <Canvas
        className="w-full h-full min-h-[460px]"
        camera={{ position: [0, 10, 18], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
          });
        }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[15, 12, 15]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[-15, -8, -12]} intensity={0.7} color="#00e5ff" />
        <Stars radius={200} depth={50} count={3500} factor={4} saturation={0.5} fade speed={1.5} />
        <ObserverScene observer={observer} selectedPass={selectedPass} simPoint={simPoint} timeMs={timeMs} />
      </Canvas>
    </div>
  );
}
