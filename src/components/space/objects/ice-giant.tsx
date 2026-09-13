"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Ice giant — Neptune/Uranus-like blue banded atmosphere
───────────────────────────────────────────────────────── */
const iceVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const iceFrag = /* glsl */ `
  uniform float uTime;
  varying vec2  vUv;
  varying vec3  vNormal;

  void main() {
    float y  = vUv.y;

    /* Multi-layer atmospheric banding */
    float b1 = sin(y * 18.0 + uTime * 0.040) * 0.5 + 0.5;
    float b2 = sin(y * 30.0 - uTime * 0.028) * 0.5 + 0.5;
    float b3 = sin(y * 48.0 + uTime * 0.016) * 0.5 + 0.5;

    vec3 deepBlue = vec3(0.03, 0.16, 0.52);
    vec3 midBlue  = vec3(0.14, 0.48, 0.88);
    vec3 lightCyan= vec3(0.32, 0.76, 0.98);
    vec3 iceWhite = vec3(0.74, 0.90, 1.00);
    vec3 darkTeal = vec3(0.02, 0.10, 0.38);

    vec3 col = mix(deepBlue, midBlue, b1);
    col = mix(col, lightCyan, b2 * 0.48);
    col = mix(col, iceWhite,  max(0.0, b3 - 0.80) * 2.6);
    col = mix(col, darkTeal,  max(0.0, (1.0 - b1) - 0.68) * 2.8);

    /* Fresnel rim glow — characteristic ice giant limb */
    float facing = abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    float fresnel = pow(1.0 - facing, 3.0);
    col += fresnel * vec3(0.25, 0.62, 1.00) * 0.75;

    /* Directional light */
    float diff = dot(vNormal, normalize(vec3(1.0, 0.3, 1.0))) * 0.45 + 0.55;
    col *= diff;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function IceGiant() {
  const matRef  = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const BASE_Y  = 1.25;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (matRef.current) matRef.current.uniforms.uTime.value = t;
    if (meshRef.current) {
      meshRef.current.rotation.y  += 0.0008;
      meshRef.current.position.y   = BASE_Y + Math.sin(t * 0.33) * 0.042;
    }
  });

  return (
    <group position={[3.4, BASE_Y, 0.2]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.27, 64, 64]} />
        {/* @ts-ignore */}
        <shaderMaterial
          ref={matRef}
          vertexShader={iceVert}
          fragmentShader={iceFrag}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>

      {/* Ice-blue atmospheric glow */}
      <mesh>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshBasicMaterial
          color="#2060d0"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
