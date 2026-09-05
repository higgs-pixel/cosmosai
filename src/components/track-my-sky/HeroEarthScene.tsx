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

// 3D Orbital Trajectory Ring with Moving Satellite Beacon
function OrbitRingWithSatellite({
  radius,
  inclinationDeg,
  color,
  speed,
  satName,
  size = 0.08,
}: {
  radius: number;
  inclinationDeg: number;
  color: string;
  speed: number;
  satName: string;
  size?: number;
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
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  useFrame(({ clock }) => {
    if (satRef.current) {
      const t = clock.getElapsedTime() * speed;
      const incRad = (inclinationDeg * Math.PI) / 180;
      const x = radius * Math.cos(t);
      const y = radius * Math.sin(t) * Math.sin(incRad);
      const z = radius * Math.sin(t) * Math.cos(incRad);
      satRef.current.position.set(x, y, z);
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

      {/* Moving Satellite Marker */}
      <group ref={satRef}>
        <mesh>
          <sphereGeometry args={[size, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh scale={[2.2, 2.2, 2.2]}>
          <sphereGeometry args={[size, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} />
        </mesh>
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
          size={0.11}
        />

        {/* Tiangong Orbit (41.5° inclination) */}
        <OrbitRingWithSatellite
          radius={EARTH_RADIUS + 0.48}
          inclinationDeg={41.5}
          color="#a855f7"
          speed={0.38}
          satName="TIANGONG"
          size={0.09}
        />

        {/* Polar Earth Observation Orbit (98.2° inclination) */}
        <OrbitRingWithSatellite
          radius={EARTH_RADIUS + 0.85}
          inclinationDeg={98.2}
          color="#10b981"
          speed={0.28}
          satName="NOAA"
          size={0.08}
        />

        {/* Navigation Medium Earth Orbit (55° inclination) */}
        <OrbitRingWithSatellite
          radius={EARTH_RADIUS + 1.45}
          inclinationDeg={55.0}
          color="#f59e0b"
          speed={0.16}
          satName="NAVSTAR"
          size={0.08}
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
