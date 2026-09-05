"use client";

import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";

const EARTH_RADIUS = 3.6;

function EarthGlobe() {
  const earthRef = useRef<THREE.Group>(null);
  const texture = useTexture("/textures/planets/2k_earth_daymap.jpg");

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.035;
    }
  });

  return (
    <group ref={earthRef}>
      {/* Earth Surface */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.75}
          metalness={0.12}
        />
      </mesh>

      {/* Atmospheric Rim Glow */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.025, 48, 48]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer Atmospheric Haze */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.06, 32, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function FallbackEarth() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.025, 32, 32]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// Realistic 3D Satellite Spacecraft Model with Central Bus, Solar Panels & Dish Antenna
function SatelliteSpacecraftModel({ color = "#00e5ff", scale = 1.0 }: { color?: string; scale?: number }) {
  return (
    <group scale={[scale, scale, scale]}>
      {/* Central Equipment Bus (Gold/Beryllium Thermal Insulation) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.12, 0.16, 0.12]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* Instrument Module Top */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 0.04, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Parabolic Communications Antenna Dish */}
      <group position={[0, 0.07, 0.09]} rotation={[-0.4, 0, 0]}>
        <mesh>
          <coneGeometry args={[0.08, 0.035, 16, 1, true]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        {/* Feed Horn */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.04, 8]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Solar Array Booms */}
      <mesh position={[-0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* Left Dual Photovoltaic Solar Array Wings */}
      <group position={[-0.42, 0, 0]}>
        {/* Solar Cell Panel */}
        <mesh>
          <boxGeometry args={[0.24, 0.11, 0.012]} />
          <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.2} />
        </mesh>
        {/* Panel Frame */}
        <mesh>
          <boxGeometry args={[0.246, 0.116, 0.01]} />
          <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.3} />
        </mesh>
      </group>

      {/* Right Dual Photovoltaic Solar Array Wings */}
      <group position={[0.42, 0, 0]}>
        {/* Solar Cell Panel */}
        <mesh>
          <boxGeometry args={[0.24, 0.11, 0.012]} />
          <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.2} />
        </mesh>
        {/* Panel Frame */}
        <mesh>
          <boxGeometry args={[0.246, 0.116, 0.01]} />
          <meshStandardMaterial color="#d4af37" metalness={0.85} roughness={0.3} />
        </mesh>
      </group>

      {/* Thruster Nozzle Aft */}
      <mesh position={[0, -0.10, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.035, 0.05, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.4} />
      </mesh>

      {/* Strobe / Laser Tracking Beacon Glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.10, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// Authentic ISS (International Space Station) Model with Modules, Truss & 4 Solar Arrays
function ISSSpaceStationModel({ scale = 1.0 }: { scale?: number }) {
  return (
    <group scale={[scale, scale, scale]}>
      {/* Integrated Truss Structure (Main Beam) */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.03, 0.9, 0.03]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Central Pressurized Modules Cluster (Zvezda / Destiny / Harmony) */}
      <group position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.28, 16]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.16, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.14, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* 4 Giant Photovoltaic Solar Array Wings */}
      {/* Port Outer Wing */}
      <group position={[-0.38, 0, 0]}>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.13, 0.24, 0.01]} />
          <meshStandardMaterial color="#b45309" metalness={0.65} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.14, 0]}>
          <boxGeometry args={[0.13, 0.24, 0.01]} />
          <meshStandardMaterial color="#b45309" metalness={0.65} roughness={0.25} />
        </mesh>
      </group>

      {/* Starboard Outer Wing */}
      <group position={[0.38, 0, 0]}>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.13, 0.24, 0.01]} />
          <meshStandardMaterial color="#b45309" metalness={0.65} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.14, 0]}>
          <boxGeometry args={[0.13, 0.24, 0.01]} />
          <meshStandardMaterial color="#b45309" metalness={0.65} roughness={0.25} />
        </mesh>
      </group>

      {/* Thermal Radiators */}
      <mesh position={[-0.12, 0, 0.08]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.12, 0.16, 0.008]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0.12, 0, 0.08]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.12, 0.16, 0.008]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Status Beacon */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color="#00e5ff" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// 3D Orbital Trajectory Ring with Moving Satellite Craft
function OrbitRingWithSatellite({
  radius,
  inclinationDeg,
  color,
  speed,
  satName,
  isStation = false,
  modelScale = 1.0,
}: {
  radius: number;
  inclinationDeg: number;
  color: string;
  speed: number;
  satName: string;
  isStation?: boolean;
  modelScale?: number;
}) {
  const satRef = useRef<THREE.Group>(null);

  // Generate 3D ring points
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 120;
    const incRad = (inclinationDeg * Math.PI) / 180;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta) * Math.sin(incRad);
      const z = radius * Math.sin(theta) * Math.cos(incRad);
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, [radius, inclinationDeg]);

  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  useFrame(({ clock }) => {
    if (satRef.current) {
      const t = clock.getElapsedTime() * speed;
      const incRad = (inclinationDeg * Math.PI) / 180;
      const x = radius * Math.cos(t);
      const y = radius * Math.sin(t) * Math.sin(incRad);
      const z = radius * Math.sin(t) * Math.cos(incRad);
      satRef.current.position.set(x, y, z);

      // Tangent velocity vector to orient satellite head-first along orbital track
      const dt = 0.05;
      const tNext = t + dt;
      const nextX = radius * Math.cos(tNext);
      const nextY = radius * Math.sin(tNext) * Math.sin(incRad);
      const nextZ = radius * Math.sin(tNext) * Math.cos(incRad);
      satRef.current.lookAt(nextX, nextY, nextZ);
    }
  });

  const lineObj = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
    return new THREE.LineLoop(lineGeo, mat);
  }, [lineGeo, color]);

  return (
    <group>
      {/* Delicate Trajectory Line */}
      <primitive object={lineObj} />

      {/* Moving Authentic 3D Satellite Spacecraft Model */}
      <group ref={satRef}>
        {isStation ? (
          <ISSSpaceStationModel scale={modelScale} />
        ) : (
          <SatelliteSpacecraftModel color={color} scale={modelScale} />
        )}
      </group>
    </group>
  );
}

export function HeroEarthScene() {
  return (
    <div className="relative w-full h-full min-h-[420px] lg:min-h-[560px] pointer-events-auto">
      <Canvas
        camera={{ position: [0, 2.5, 9.5], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[12, 8, 10]} intensity={1.8} color="#ffffff" />
        <directionalLight position={[-10, -5, -8]} intensity={0.25} color="#00e5ff" />

        <Suspense fallback={<FallbackEarth />}>
          <EarthGlobe />
        </Suspense>

        {/* Realistic Orbital Trajectory Arcs */}
        {/* ISS Orbit (51.6° inclination) */}
        <OrbitRingWithSatellite
          radius={EARTH_RADIUS + 0.55}
          inclinationDeg={51.6}
          color="#00e5ff"
          speed={0.45}
          satName="ISS"
          isStation={true}
          modelScale={1.35}
        />

        {/* Tiangong Orbit (41.5° inclination) */}
        <OrbitRingWithSatellite
          radius={EARTH_RADIUS + 0.48}
          inclinationDeg={41.5}
          color="#a855f7"
          speed={0.38}
          satName="TIANGONG"
          modelScale={1.15}
        />

        {/* Polar Earth Observation Orbit (98.2° inclination) */}
        <OrbitRingWithSatellite
          radius={EARTH_RADIUS + 0.85}
          inclinationDeg={98.2}
          color="#10b981"
          speed={0.28}
          satName="NOAA"
          modelScale={1.0}
        />

        {/* Navigation Medium Earth Orbit (55° inclination) */}
        <OrbitRingWithSatellite
          radius={EARTH_RADIUS + 1.45}
          inclinationDeg={55.0}
          color="#f59e0b"
          speed={0.16}
          satName="NAVSTAR"
          modelScale={1.05}
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          autoRotate
          autoRotateSpeed={0.4}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(Math.PI * 3) / 4}
        />
      </Canvas>

      {/* Atmospheric Horizon Gradient Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_45%,#02040a_85%)]" />
    </div>
  );
}
