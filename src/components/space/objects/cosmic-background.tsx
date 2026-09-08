"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Nebula plane shaders — soft radial gradient with drift
───────────────────────────────────────────────────────── */
const nebulaVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFrag = /* glsl */ `
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec2  uCenter;

  varying vec2 vUv;

  void main() {
    float dist  = distance(vUv, uCenter);
    float alpha = smoothstep(0.52, 0.0, dist) * uOpacity;
    /* gentle pulsation */
    float pulse = sin(uTime * 0.22 + dist * 6.0) * 0.12 + 0.88;
    alpha = max(0.0, alpha * pulse);
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/* ─────────────────────────────────────────────────────────
   Individual nebula cloud
───────────────────────────────────────────────────────── */
type NebulaDef = {
  position: [number, number, number];
  scale:    [number, number, number];
  color:    [number, number, number];
  opacity:  number;
  center:   [number, number];
  index:    number;
};

function NebulaCloud({
  position,
  scale,
  color,
  opacity,
  center,
  index,
}: NebulaDef) {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const basePos = useMemo(() => [...position] as [number, number, number], [position]);

  const uniforms = useMemo(
    () => ({
      uColor:   { value: new THREE.Color(color[0], color[1], color[2]) },
      uOpacity: { value: opacity },
      uTime:    { value: 0 },
      uCenter:  { value: new THREE.Vector2(center[0], center[1]) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + index * 2.3;
    if (matRef.current) matRef.current.uniforms.uTime.value = t;
    if (meshRef.current) {
      meshRef.current.position.x = basePos[0] + Math.sin(t * 0.055) * 0.55;
      meshRef.current.position.y = basePos[1] + Math.cos(t * 0.04) * 0.4;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <planeGeometry args={[1, 1]} />
      {/* @ts-ignore */}
      <shaderMaterial
        ref={matRef}
        vertexShader={nebulaVert}
        fragmentShader={nebulaFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────
   Micro-particle drift layer
───────────────────────────────────────────────────────── */
function MicroParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry } = useMemo(() => {
    const PARTICLE_COUNT = 600;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry: geo };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.008;
    pointsRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.005) * 0.02;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#a0c8ff"
        size={0.015}
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ─────────────────────────────────────────────────────────
   Nebula definitions — multiple overlapping clouds
───────────────────────────────────────────────────────── */
const NEBULAE: Omit<NebulaDef, "index">[] = [
  {
    position: [-2.5, 1.5, -16],
    scale:    [13, 11, 1],
    color:    [0.05, 0.22, 0.60],
    opacity:  0.20,
    center:   [0.42, 0.52],
  },
  {
    position: [3.5, 0.5, -20],
    scale:    [15, 13, 1],
    color:    [0.08, 0.35, 0.72],
    opacity:  0.15,
    center:   [0.50, 0.46],
  },
  {
    position: [0, -1.5, -22],
    scale:    [18, 15, 1],
    color:    [0.06, 0.28, 0.68],
    opacity:  0.12,
    center:   [0.50, 0.50],
  },
  {
    position: [-5, -0.5, -18],
    scale:    [10, 9, 1],
    color:    [0.04, 0.18, 0.55],
    opacity:  0.16,
    center:   [0.55, 0.48],
  },
  {
    position: [6, 2, -14],
    scale:    [11, 10, 1],
    color:    [0.10, 0.40, 0.75],
    opacity:  0.13,
    center:   [0.45, 0.52],
  },
];

/* ─────────────────────────────────────────────────────────
   Export
───────────────────────────────────────────────────────── */
export function CosmicBackground() {
  return (
    <group>
      {NEBULAE.map((nebula, i) => (
        <NebulaCloud key={i} {...nebula} index={i} />
      ))}
      <MicroParticles />
    </group>
  );
}
