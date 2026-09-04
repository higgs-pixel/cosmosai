"use client";

import { useMemo, useRef, useState, useEffect, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { PlanetState } from "@/lib/solar-system/ephemeris";

// Color mapping for orbits
const PLANET_COLORS: Record<string, string> = {
  Mercury: "#9ca3af",
  Venus: "#f59e0b",
  Earth: "#3b82f6",
  Mars: "#ef4444",
  Jupiter: "#f97316",
  Saturn: "#fbbf24",
  Uranus: "#22d3ee",
  Neptune: "#6366f1",
  Pluto: "#a78bfa",
};

const AXIAL_TILTS: Record<string, number> = {
  Sun: 7.25,
  Mercury: 0.034,
  Venus: 177.3,
  Earth: 23.44,
  Moon: 6.68,
  Mars: 25.19,
  Jupiter: 3.13,
  Saturn: 26.73,
  Uranus: 97.77,
  Neptune: 28.32,
  Pluto: 122.5,
};

const ROTATION_PERIODS: Record<string, number> = {
  Sun: 25.0,
  Mercury: 58.6,
  Venus: -243.0,
  Earth: 1.0,
  Moon: 27.3,
  Mars: 1.03,
  Jupiter: 0.41,
  Saturn: 0.45,
  Uranus: -0.72,
  Neptune: 0.67,
  Pluto: -6.4,
};

// Logarithmic distance scaling
const scaleDistance = (distAu: number) => {
  if (distAu === 0) return 0;
  const minLog = 0;
  const maxLog = Math.log(45); // Pluto max
  const valLog = Math.log(distAu + 1);
  const minRadius = 10; // Closer starting orbit
  const maxRadius = 65; // Fits nicely in viewport
  return minRadius + ((valLog - minLog) / (maxLog - minLog)) * (maxRadius - minRadius);
};

// Size scaling (Visual vs True)
const getPlanetRadius = (id: string, visual: boolean) => {
  if (visual) {
    switch (id) {
      case "Sun": return 3.2;
      case "Mercury": return 0.55;
      case "Venus": return 0.95;
      case "Earth": return 1.0;
      case "Moon": return 0.28;
      case "Mars": return 0.75;
      case "Jupiter": return 2.1;
      case "Saturn": return 1.7;
      case "Uranus": return 1.3;
      case "Neptune": return 1.25;
      case "Pluto": return 0.45;
      default: return 0.7;
    }
  } else {
    // True relative scale (Earth = 0.05)
    const base = 0.04;
    switch (id) {
      case "Sun": return base * 109.2 * 0.4; // Sun scaled slightly to fit inside Mercury's orbit
      case "Mercury": return base * 0.383;
      case "Venus": return base * 0.949;
      case "Earth": return base * 1.0;
      case "Moon": return base * 0.272;
      case "Mars": return base * 0.532;
      case "Jupiter": return base * 11.21;
      case "Saturn": return base * 9.45;
      case "Uranus": return base * 4.01;
      case "Neptune": return base * 3.88;
      case "Pluto": return base * 0.186;
      default: return base;
    }
  }
};

const getScaledPosition = (x: number, y: number, z: number, distanceSun: number): [number, number, number] => {
  if (distanceSun === 0) return [0, 0, 0];
  const scaledDist = scaleDistance(distanceSun);
  // Preserving direction, map x -> X, z -> Y (inclination), y -> Z
  return [
    (x / distanceSun) * scaledDist,
    (z / distanceSun) * scaledDist,
    (y / distanceSun) * scaledDist,
  ];
};

// Saturn's rings with custom radial UV map
function SaturnRings({ innerRadius, outerRadius, texturePath }: { innerRadius: number; outerRadius: number; texturePath: string }) {
  const geomRef = useRef<THREE.RingGeometry>(null);
  const texture = useTexture(texturePath);

  useEffect(() => {
    if (!geomRef.current) return;
    const geom = geomRef.current;
    const pos = geom.attributes.position;
    const uv = geom.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const u = (r - innerRadius) / (outerRadius - innerRadius);
      uv.setXY(i, u, 0.5);
    }
    geom.attributes.uv.needsUpdate = true;
  }, [innerRadius, outerRadius]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry ref={geomRef} args={[innerRadius, outerRadius, 64]} />
      <meshStandardMaterial
        map={texture}
        alphaMap={texture}
        transparent
        side={THREE.DoubleSide}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  );
}

// Emissive glowing Sun
function SunNode({ radius, texturePath }: { radius: number; texturePath: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(texturePath);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02 * delta;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

// Interactive Planet Node
function PlanetNode({
  id,
  name,
  radius,
  position,
  texturePath,
  isSelected,
  onSelect,
  color,
}: {
  id: string;
  name: string;
  radius: number;
  position: [number, number, number];
  texturePath: string;
  isSelected: boolean;
  onSelect: () => void;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(texturePath);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [hovered]);

  // Apply axial tilt to the group
  const tiltRad = useMemo(() => THREE.MathUtils.degToRad(AXIAL_TILTS[id] || 0), [id]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const period = ROTATION_PERIODS[id] || 1.0;
      const baseSpeed = 0.5; // Earth rotates at 0.5 rad/s
      meshRef.current.rotation.y += (baseSpeed / period) * delta;
    }
  });

  const scalePulse = hovered ? 1.12 : 1.0;

  return (
    <group ref={groupRef} position={position}>
      {/* Tilted local space */}
      <group rotation={[0, 0, tiltRad]}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHovered(false);
          }}
          scale={[scalePulse, scalePulse, scalePulse]}
        >
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.8}
            metalness={0.1}
            emissive={hovered ? new THREE.Color("#22d3ee") : new THREE.Color("#000000")}
            emissiveIntensity={hovered ? 0.35 : 0.0}
          />

          {/* Saturn's Rings (only for Saturn) */}
          {id === "Saturn" && (
            <SaturnRings
              innerRadius={radius * 1.4}
              outerRadius={radius * 2.5}
              texturePath="/textures/planets/2k_saturn_ring_alpha.png"
            />
          )}
        </mesh>
      </group>

      {/* Floating Billboard Label */}
      <Html distanceFactor={28} position={[0, radius + 0.5, 0]}>
        <div
          onClick={onSelect}
          className={`cursor-pointer select-none font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-all duration-200 whitespace-nowrap ${
            isSelected
              ? "bg-blue-500/20 border-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              : hovered
              ? "bg-white/10 border-white/40 text-white"
              : "bg-black/60 border-white/10 text-gray-300 hover:text-white"
          }`}
          style={{ transform: "translate(-50%, -50%)" }}
        >
          {name}
        </div>
      </Html>
    </group>
  );
}

// Camera transition controller
function CameraController({
  selectedPlanetId,
  planetPositions,
  planetRadii,
  resetTrigger,
  controlsRef,
}: {
  selectedPlanetId: string;
  planetPositions: Record<string, [number, number, number]>;
  planetRadii: Record<string, number>;
  resetTrigger: number;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const prevSelectedRef = useRef(selectedPlanetId);
  const prevResetTrigger = useRef(resetTrigger);
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (selectedPlanetId !== prevSelectedRef.current) {
      prevSelectedRef.current = selectedPlanetId;

      const posArray = planetPositions[selectedPlanetId] || [0, 0, 0];
      const planetPos = new THREE.Vector3(...posArray);

      if (selectedPlanetId !== "Sun") {
        const radius = planetRadii[selectedPlanetId] || 1.0;
        const cameraOffset = new THREE.Vector3(radius * 3.5, radius * 1.8, radius * 3.5);
        const desiredCameraPos = planetPos.clone().add(cameraOffset);
        
        // Push camera towards the focused planet
        camera.position.lerp(desiredCameraPos, 0.7);
      }
    }
  }, [selectedPlanetId, planetPositions, planetRadii, camera]);

  useEffect(() => {
    if (resetTrigger !== prevResetTrigger.current) {
      prevResetTrigger.current = resetTrigger;
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
      }
      camera.position.set(0, 35, 55);
      targetPos.current.set(0, 0, 0);
    }
  }, [resetTrigger, camera, controlsRef]);

  useFrame(() => {
    if (!controlsRef.current) return;

    const posArray = planetPositions[selectedPlanetId] || [0, 0, 0];
    const targetVector = new THREE.Vector3(...posArray);

    // Lerp camera controls target
    controlsRef.current.target.lerp(targetVector, 0.08);

    // Keep camera at comfortable distance when orbiting a planet
    if (selectedPlanetId !== "Sun") {
      const radius = planetRadii[selectedPlanetId] || 1.0;
      const idealDist = radius * 4.5;
      const toCamera = camera.position.clone().sub(targetVector);
      const currentDist = toCamera.length();

      if (currentDist > idealDist * 2.8) {
        const desiredCameraPos = targetVector.clone().add(toCamera.normalize().multiplyScalar(idealDist * 1.8));
        camera.position.lerp(desiredCameraPos, 0.06);
      }
    }

    controlsRef.current.update();
  });

  return null;
}

interface SolarSystem3DProps {
  selectedPlanetId: string;
  onSelectPlanet: (id: string) => void;
  ephemerisData: Record<string, PlanetState>;
  resetTrigger: number;
  visualScale: boolean;
}

export function SolarSystem3D({
  selectedPlanetId,
  onSelectPlanet,
  ephemerisData,
  resetTrigger,
  visualScale,
}: SolarSystem3DProps) {
  const controlsRef = useRef<any>(null);

  // Compute radii
  const planetRadii = useMemo(() => {
    const radii: Record<string, number> = {};
    radii["Sun"] = getPlanetRadius("Sun", visualScale);
    radii["Moon"] = getPlanetRadius("Moon", visualScale);
    Object.keys(ephemerisData).forEach((key) => {
      if (key !== "Sun" && key !== "Moon") {
        radii[key] = getPlanetRadius(key, visualScale);
      }
    });
    return radii;
  }, [ephemerisData, visualScale]);

  // Compute live positions
  const planetPositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};

    // 1. Sun position
    positions["Sun"] = [0, 0, 0];

    // 2. Planets positions
    Object.keys(ephemerisData).forEach((key) => {
      if (key === "Sun" || key === "Moon") return;
      const p = ephemerisData[key];
      positions[key] = getScaledPosition(p.x, p.y, p.z, p.distanceSun);
    });

    // 3. Moon position (orbiting Earth)
    const earthPos = positions["Earth"] || [0, 0, 0];
    const moon = ephemerisData["Moon"];
    const earth = ephemerisData["Earth"];
    if (moon && earth) {
      // Calculate relative vector from Earth to Moon in ephemeris
      const dx = moon.x - earth.x;
      const dy = moon.y - earth.y;
      const dz = moon.z - earth.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

      // Scaled orbit offset of Moon
      const offsetDist = visualScale ? 2.4 : 0.00257 * 23.4; // Exaggerated vs True physical scale
      const direction: [number, number, number] = [dx / d, dz / d, dy / d]; // Mapping coordinates

      positions["Moon"] = [
        earthPos[0] + direction[0] * offsetDist,
        earthPos[1] + direction[1] * offsetDist,
        earthPos[2] + direction[2] * offsetDist,
      ];
    } else {
      positions["Moon"] = [0, 0, 0];
    }

    return positions;
  }, [ephemerisData, visualScale]);

  // Handle document tab visibility change to pause R3F loop or lower frame rates
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const handleVisibilityChange = () => {
      setTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="h-[320px] w-full relative overflow-hidden rounded-xl bg-black">
      {tabVisible ? (
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center font-mono text-[10px] uppercase tracking-wider text-blue-400">
              Loading textures & compiling shaders…
            </div>
          }
        >
          <Canvas
            camera={{ position: [0, 35, 55], fov: 45 }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
            style={{ width: "100%", height: "100%" }}
          >
            <color attach="background" args={["#03050a"]} />

            {/* Faint ambient fill for dark sides */}
            <ambientLight intensity={0.06} />

            {/* Sun lighting source */}
            <pointLight position={[0, 0, 0]} intensity={4.5} decay={0} />

            {/* Cosmic Starfield */}
            <Stars radius={150} depth={50} count={2800} factor={4} saturation={0.5} fade speed={1.5} />

            {/* Sun */}
            <SunNode radius={planetRadii["Sun"]} texturePath="/textures/planets/2k_sun.jpg" />

            {/* Orbit paths & Planet Nodes */}
            {Object.keys(ephemerisData).map((key) => {
              if (key === "Sun") return null;

              const isMoon = key === "Moon";
              const pos = planetPositions[key] || [0, 0, 0];
              const radius = planetRadii[key] || 1.0;
              const color = PLANET_COLORS[key] || "#ffffff";
              const isSelected = selectedPlanetId === key;

              // Textures
              let texturePath = `/textures/planets/2k_${key.toLowerCase()}.jpg`;
              if (key === "Venus") texturePath = "/textures/planets/2k_venus_atmosphere.jpg";
              if (key === "Earth") texturePath = "/textures/planets/2k_earth_daymap.jpg";
              if (key === "Pluto") texturePath = "/textures/planets/2k_moon.jpg"; // Pluto fallback

              // Calculate orbit path radius
              const orbitRadius = isMoon ? 0.0 : scaleDistance(ephemerisData[key].distanceSun);

              return (
                <group key={key}>
                  {/* Orbit Track Ring (Planets only) */}
                  {!isMoon && orbitRadius > 0 && (
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[orbitRadius - 0.05, orbitRadius + 0.05, 128]} />
                      <meshBasicMaterial color={color} opacity={0.18} transparent side={THREE.DoubleSide} />
                    </mesh>
                  )}

                  {/* Moon Orbit Ring around Earth */}
                  {isMoon && (
                    <mesh position={planetPositions["Earth"]} rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry
                        args={[
                          (visualScale ? 2.4 : 0.06) - 0.02,
                          (visualScale ? 2.4 : 0.06) + 0.02,
                          64,
                        ]}
                      />
                      <meshBasicMaterial color="#ffffff" opacity={0.08} transparent side={THREE.DoubleSide} />
                    </mesh>
                  )}

                  <PlanetNode
                    id={key}
                    name={key}
                    radius={radius}
                    position={pos}
                    texturePath={texturePath}
                    isSelected={isSelected}
                    onSelect={() => onSelectPlanet(key)}
                    color={color}
                  />
                </group>
              );
            })}

            {/* Custom Camera focused lerper */}
            <CameraController
              selectedPlanetId={selectedPlanetId}
              planetPositions={planetPositions}
              planetRadii={planetRadii}
              resetTrigger={resetTrigger}
              controlsRef={controlsRef}
            />

            <OrbitControls
              ref={controlsRef}
              enableDamping
              dampingFactor={0.05}
              maxDistance={120}
              minDistance={visualScale ? 5.0 : 0.8}
            />

            {/* Post-processing Bloom Glow on Sun */}
            <EffectComposer>
              <Bloom luminanceThreshold={0.9} intensity={1.2} levels={8} mipmapBlur />
            </EffectComposer>
          </Canvas>
        </Suspense>
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-[10px] uppercase tracking-wider text-gray-500 bg-[#03050a]">
          Canvas rendering paused (tab inactive)
        </div>
      )}
    </div>
  );
}
