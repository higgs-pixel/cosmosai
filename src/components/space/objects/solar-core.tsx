"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Solar surface — animated convection cell FBM shader
───────────────────────────────────────────────────────── */
const sunVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFrag = /* glsl */ `
  uniform float uTime;
  varying vec2  vUv;
  varying vec3  vNormal;

  /* Smooth hash */
  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
  }

  float sNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }

  /* Fractal Brownian Motion — 5 octaves */
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    vec2 sh = vec2(100.0);
    for (int i = 0; i < 5; i++) {
      v += a * sNoise(p);
      p  = p * 2.1 + sh;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;

    /* Two-pass domain-warped FBM for convection look */
    vec2 q = vec2(fbm(uv * 3.0 + uTime * 0.07),
                  fbm(uv * 3.0 + vec2(1.0)));
    vec2 r = vec2(fbm(uv * 3.5 + 1.7 * q + uTime * 0.05),
                  fbm(uv * 3.5 + q   + vec2(8.3, 2.8)));
    float n = fbm(uv * 3.0 + 1.5 * r + uTime * 0.04);

    vec3 coreOrange = vec3(1.00, 0.35, 0.04);
    vec3 midYellow  = vec3(1.00, 0.82, 0.12);
    vec3 hotWhite   = vec3(1.00, 0.98, 0.82);
    vec3 brightSpot = vec3(1.00, 1.00, 0.95);

    vec3 col = mix(coreOrange, midYellow,  clamp(n * 1.4, 0.0, 1.0));
    col = mix(col, hotWhite,  max(0.0, n - 0.52) * 2.2);
    col = mix(col, brightSpot, max(0.0, n - 0.72) * 3.0);

    /* Limb darkening — solar edge is cooler/darker */
    float limb = length(vUv - 0.5) * 2.0;
    float dark  = smoothstep(0.65, 1.0, limb);
    col = mix(col, coreOrange * 0.55, dark);

    /* Slight emissive boost — ensures bloom catches it */
    col *= 1.18;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────
   Corona (inside-out sphere, additive blend)
───────────────────────────────────────────────────────── */
const coronaVert = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coronaFrag = /* glsl */ `
  uniform float uTime;
  varying vec3  vNormal;

  void main() {
    /* Fresnel-like falloff for corona glow */
    float intensity = pow(max(0.0, 0.45 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.8);
    /* Subtle flicker */
    intensity *= 0.88 + sin(uTime * 1.4) * 0.12;
    vec3 coronaCol = mix(vec3(1.0, 0.45, 0.05), vec3(1.0, 0.88, 0.4), intensity);
    gl_FragColor = vec4(coronaCol, intensity * 0.65);
  }
`;

/* ─────────────────────────────────────────────────────────
   Export
───────────────────────────────────────────────────────── */
export function SolarCore() {
  const sunMat    = useRef<THREE.ShaderMaterial>(null);
  const coronaMat = useRef<THREE.ShaderMaterial>(null);
  const groupRef  = useRef<THREE.Group>(null);
  const BASE_Y    = -0.55;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sunMat.current)    sunMat.current.uniforms.uTime.value    = t;
    if (coronaMat.current) coronaMat.current.uniforms.uTime.value = t;
    if (groupRef.current) {
      groupRef.current.position.y = BASE_Y + Math.sin(t * 0.22) * 0.045;
    }
  });

  return (
    <group ref={groupRef} position={[0.5, BASE_Y, 0.5]}>
      {/* Solar surface */}
      <mesh>
        <sphereGeometry args={[0.40, 80, 80]} />
        {/* @ts-ignore */}
        <shaderMaterial
          ref={sunMat}
          vertexShader={sunVert}
          fragmentShader={sunFrag}
          uniforms={{ uTime: { value: 0 } }}
        />
      </mesh>

      {/* Inner corona */}
      <mesh>
        <sphereGeometry args={[0.55, 48, 48]} />
        {/* @ts-ignore */}
        <shaderMaterial
          ref={coronaMat}
          vertexShader={coronaVert}
          fragmentShader={coronaFrag}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer diffuse glow — caught by bloom */}
      <mesh>
        <sphereGeometry args={[0.72, 32, 32]} />
        <meshBasicMaterial
          color="#ff7010"
          transparent
          opacity={0.055}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Largest glow halo */}
      <mesh>
        <sphereGeometry args={[1.05, 24, 24]} />
        <meshBasicMaterial
          color="#ff5500"
          transparent
          opacity={0.018}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
