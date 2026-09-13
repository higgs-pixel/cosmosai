"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Procedural rocky surface — vertex displacement shader
───────────────────────────────────────────────────────── */
const terrVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  float hash3(vec3 p) {
    p = fract(p * vec3(127.1, 311.7, 74.7));
    p += dot(p, p.yxz + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x),
          mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x),
          mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    vUv      = uv;
    vNormal  = normalize(normalMatrix * normal);
    float disp = noise3(position * 4.5) * 0.06
               + noise3(position * 9.0) * 0.03;
    vec3 displaced = position + normal * disp;
    vWorldPos = displaced;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const terrFrag = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    /* Rocky colour palette — muted brown/grey tones */
    float latitude = vUv.y;
    vec3 rockDark  = vec3(0.28, 0.22, 0.16);
    vec3 rockMid   = vec3(0.48, 0.40, 0.32);
    vec3 rockLight = vec3(0.62, 0.54, 0.44);
    vec3 dust      = vec3(0.55, 0.45, 0.34);

    float bands = sin(latitude * 18.0) * 0.5 + 0.5;
    vec3 baseCol = mix(rockDark, rockMid, bands);
    baseCol = mix(baseCol, rockLight, fract(latitude * 9.0) * 0.3);
    baseCol = mix(baseCol, dust, 0.25);

    /* Diffuse lighting */
    vec3  lightDir  = normalize(vec3(1.0, 0.4, 1.0));
    float diffuse   = dot(vNormal, lightDir) * 0.5 + 0.5;
    vec3  finalCol  = baseCol * mix(0.35, 1.1, diffuse);

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────
   Export
───────────────────────────────────────────────────────── */
export function TerrestrialPlanet() {
  const matRef   = useRef<THREE.ShaderMaterial>(null);
  const meshRef  = useRef<THREE.Mesh>(null);
  const atmoRef  = useRef<THREE.Mesh>(null);
  const BASE_Y   = 0.05;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0008;
      meshRef.current.position.y  = BASE_Y + Math.sin(t * 0.38) * 0.042;
    }
    if (atmoRef.current) {
      atmoRef.current.position.y = BASE_Y + Math.sin(t * 0.38) * 0.042;
    }
  });

  return (
    <group position={[-3.8, BASE_Y, 0.3]}>
      {/* Rocky sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.27, 64, 64]} />
        {/* @ts-ignore */}
        <shaderMaterial
          ref={matRef}
          vertexShader={terrVert}
          fragmentShader={terrFrag}
        />
      </mesh>

      {/* Thin atmospheric haze — inside-out sphere */}
      <mesh ref={atmoRef}>
        <sphereGeometry args={[0.305, 32, 32]} />
        <meshBasicMaterial
          color="#4a80a8"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Subtle glow ring */}
      <mesh>
        <sphereGeometry args={[0.34, 32, 32]} />
        <meshBasicMaterial
          color="#2255aa"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
