"use client";

import { useMemo, useRef, Suspense, memo, useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";

const PLANET_RADIUS = 5.2;

function RealisticPlanet({ mouse }: { mouse: { x: number; y: number } }) {
  const planetGroupRef = useRef<THREE.Group>(null);
  const planetMeshRef = useRef<THREE.Mesh>(null);
  const orbitsGroupRef = useRef<THREE.Group>(null);

  // Load Earth texture
  const texture = useTexture("/textures/planets/2k_earth_daymap.jpg");

  // Generate 3 elegant orbital ellipses with high inclination
  const orbitTrajectories = useMemo(() => {
    const trajectories = [];
    const configs = [
      { a: 6.8, b: 6.5, inc: 0.65, rotZ: 0.2, color: "#38bdf8", speed: 0.35 },
      { a: 7.4, b: 7.0, inc: -0.5, rotZ: -0.4, color: "#ec4899", speed: -0.28 },
      { a: 8.0, b: 7.5, inc: 0.85, rotZ: 0.7, color: "#00e5ff", speed: 0.42 },
    ];

    for (const c of configs) {
      const points: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = c.a * Math.cos(theta);
        const z = c.b * Math.sin(theta);
        const v = new THREE.Vector3(x, 0, z);
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), c.inc);
        v.applyAxisAngle(new THREE.Vector3(0, 0, 1), c.rotZ);
        points.push(v);
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: c.color, transparent: true, opacity: 0.35 });
      const line = new THREE.Line(geom, mat);
      trajectories.push({ geom, line, color: c.color, speed: c.speed, a: c.a, b: c.b, inc: c.inc, rotZ: c.rotZ });
    }
    return trajectories;
  }, []);

  useFrame((_, delta) => {
    // Rotate planet surface
    if (planetMeshRef.current) {
      planetMeshRef.current.rotation.y += delta * 0.025;
    }

    // Gentle parallax response to mouse
    if (planetGroupRef.current) {
      const targetX = 2.4 + mouse.x * 0.4;
      const targetY = -0.2 + mouse.y * 0.3;
      planetGroupRef.current.position.x = THREE.MathUtils.lerp(planetGroupRef.current.position.x, targetX, 0.05);
      planetGroupRef.current.position.y = THREE.MathUtils.lerp(planetGroupRef.current.position.y, targetY, 0.05);
    }

    // Slowly rotate orbital paths
    if (orbitsGroupRef.current) {
      orbitsGroupRef.current.rotation.y += delta * 0.012;
    }
  });

  return (
    <group ref={planetGroupRef} position={[2.4, -0.2, 0]}>
      {/* Central Celestial Planet Mesh */}
      <mesh ref={planetMeshRef}>
        <sphereGeometry args={[PLANET_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Atmospheric Rayleigh Blue Inner Rim Glow */}
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS * 1.018, 48, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Deep Space Atmospheric Haze */}
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS * 1.045, 32, 32]} />
        <meshBasicMaterial
          color="#0284c7"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Orbital Trajectory Lines & Satellite Beacons */}
      <group ref={orbitsGroupRef}>
        {orbitTrajectories.map((orbit, idx) => (
          <group key={`orbit-path-${idx}`}>
            <primitive object={orbit.line} />
            {/* Orbiting Satellite Beacon */}
            <SatelliteBeacon orbit={orbit} idx={idx} />
          </group>
        ))}
      </group>
    </group>
  );
}

function SatelliteBeacon({
  orbit,
  idx,
}: {
  orbit: { a: number; b: number; inc: number; rotZ: number; color: string; speed: number };
  idx: number;
}) {
  const satRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!satRef.current) return;
    const t = clock.getElapsedTime() * orbit.speed + idx * 2.1;
    const x = orbit.a * Math.cos(t);
    const z = orbit.b * Math.sin(t);
    const v = new THREE.Vector3(x, 0, z);
    v.applyAxisAngle(new THREE.Vector3(1, 0, 0), orbit.inc);
    v.applyAxisAngle(new THREE.Vector3(0, 0, 1), orbit.rotZ);
    satRef.current.position.copy(v);
  });

  return (
    <group ref={satRef}>
      {/* Spacecraft Chassis Beacon */}
      <mesh>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Colored Halo */}
      <mesh>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshBasicMaterial color={orbit.color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function PlanetFallback() {
  return (
    <group position={[2.4, -0.2, 0]}>
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>
    </group>
  );
}

export const CinematicHeroPlanet = memo(function CinematicHeroPlanet() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMouse({ x, y });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 11], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: true,
        }}
        style={{ pointerEvents: "none" }}
      >
        {/* Cinematic Directional Solar Light creating sharp terminator line */}
        <directionalLight position={[12, 6, 8]} intensity={2.6} color="#ffffff" />
        {/* Subtle deep space bounce light for dark hemisphere */}
        <directionalLight position={[-10, -4, -6]} intensity={0.18} color="#0c192c" />
        <ambientLight intensity={0.12} />

        <Suspense fallback={<PlanetFallback />}>
          <RealisticPlanet mouse={mouse} />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default CinematicHeroPlanet;
