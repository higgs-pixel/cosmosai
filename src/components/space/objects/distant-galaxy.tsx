"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Spiral galaxy — 2-arm Archimedean particle system
───────────────────────────────────────────────────────── */
const STAR_COUNT = 2800;

export function DistantGalaxy() {
  const pointsRef = useRef<THREE.Points>(null);

  /* Build spiral geometry once */
  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors    = new Float32Array(STAR_COUNT * 3);
    const sizes     = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const t   = i / STAR_COUNT;
      /* Spread across 2 arms: 0° and 180° */
      const arm = (Math.floor(Math.random() * 2) * Math.PI);
      /* Spiral angle grows with radius */
      const angle  = t * Math.PI * 9 + arm;
      /* Radius — denser toward core */
      const radius = Math.pow(t, 0.55) * 0.9 + 0.04;
      /* Scatter: less at core, more at edges */
      const scatter = (1 - Math.pow(1 - t, 2)) * 0.18;
      const sx = (Math.random() - 0.5) * scatter;
      const sy = (Math.random() - 0.5) * scatter;
      const sz = (Math.random() - 0.5) * 0.07;

      const i3 = i * 3;
      positions[i3]     = Math.cos(angle) * radius + sx;
      positions[i3 + 1] = sz;
      positions[i3 + 2] = Math.sin(angle) * radius + sy;

      /* Colour: warm golden core → cool blue-white outer arms */
      const coreRatio = 1.0 - Math.min(1.0, radius / 0.9);
      colors[i3]     = 0.55 + coreRatio * 0.45;   // R
      colors[i3 + 1] = 0.50 + coreRatio * 0.35;   // G
      colors[i3 + 2] = 0.65 + (1.0 - coreRatio) * 0.35; // B

      /* Vary star sizes */
      sizes[i] = coreRatio > 0.7 ? 0.018 : 0.010 + Math.random() * 0.010;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors,    3));
    geo.setAttribute("size",     new THREE.BufferAttribute(sizes,     1));
    return geo;
  }, []);

  /* Dispose on unmount */
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.elapsedTime;
    pointsRef.current.rotation.y = t * 0.012;
    /* Very subtle tilt wobble */
    pointsRef.current.rotation.z = Math.sin(t * 0.08) * 0.015;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      /* Bottom-left, pushed back for depth */
      position={[-4.0, -1.9, -1.8]}
      rotation={[0.32, 0.15, 0]}
      scale={0.78}
    >
      <pointsMaterial
        size={0.013}
        vertexColors
        transparent
        opacity={0.92}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
