"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Gas giant — animated horizontal atmospheric bands
───────────────────────────────────────────────────────── */
const gasVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gasFrag = /* glsl */ `
  uniform float uTime;
  varying vec2  vUv;
  varying vec3  vNormal;

  /* Multi-frequency sinusoidal band turbulence */
  float bands(float y, float freq, float speed, float phase) {
    return sin(y * freq + uTime * speed + phase) * 0.5 + 0.5;
  }

  void main() {
    float y = vUv.y;

    float b1 = bands(y, 22.0,  0.025, 0.0);
    float b2 = bands(y, 38.0, -0.018, 1.3);
    float b3 = bands(y, 55.0,  0.012, 2.7);
    float b4 = bands(y, 12.0, -0.030, 0.8);

    vec3 brown  = vec3(0.50, 0.28, 0.12);
    vec3 tan    = vec3(0.84, 0.64, 0.34);
    vec3 orange = vec3(0.90, 0.48, 0.16);
    vec3 cream  = vec3(0.94, 0.87, 0.70);
    vec3 dark   = vec3(0.30, 0.16, 0.07);
    vec3 rust   = vec3(0.68, 0.32, 0.10);

    vec3 col = mix(brown, tan, b1);
    col = mix(col, orange, b2 * 0.55);
    col = mix(col, cream,  max(0.0, b3 - 0.72) * 2.8);
    col = mix(col, dark,   max(0.0, (1.0 - b1) - 0.65) * 3.0);
    col = mix(col, rust,   b4 * 0.30);

    /* Great Red Spot hint near equator */
    float spotDist = length(vec2(vUv.x - 0.65, (vUv.y - 0.48) * 4.0));
    float spot = smoothstep(0.15, 0.0, spotDist);
    col = mix(col, vec3(0.75, 0.20, 0.08), spot * 0.7);

    /* Limb darkening */
    float limb = dot(vNormal, normalize(vec3(1.0, 0.3, 1.0)));
    limb = limb * 0.48 + 0.52;
    col *= limb;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function GasGiant() {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const BASE_Y  = -0.75;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (matRef.current) matRef.current.uniforms.uTime.value = t;
    if (meshRef.current) {
      meshRef.current.rotation.y   += 0.0006;
      meshRef.current.position.y    = BASE_Y + Math.sin(t * 0.28) * 0.055;
    }
  });

  return (
    <group position={[-2.2, BASE_Y, 0.4]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.46, 80, 80]} />
        {/* @ts-ignore */}
        <shaderMaterial
          ref={matRef}
          vertexShader={gasVert}
          fragmentShader={gasFrag}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>

      {/* Faint atmospheric glow */}
      <mesh>
        <sphereGeometry args={[0.52, 32, 32]} />
        <meshBasicMaterial
          color="#c06820"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
