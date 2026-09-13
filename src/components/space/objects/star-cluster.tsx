"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Dense star cluster — InstancedMesh for performance
───────────────────────────────────────────────────────── */
const COUNT = 500;

type StarData = {
  x: number; y: number; z: number;
  scale: number;
  phase: number;
  speed: number;
  brightness: number;
};

export function StarCluster() {
  const meshRef  = useRef<THREE.InstancedMesh>(null);
  const dummy    = useMemo(() => new THREE.Object3D(), []);

  /* Pre-compute cluster layout */
  const stars = useMemo<StarData[]>(() => {
    const arr: StarData[] = [];
    for (let i = 0; i < COUNT; i++) {
      /* Spherical distribution — denser toward centre */
      const r     = Math.pow(Math.random(), 0.45) * 0.65;
      const theta = Math.acos(2 * Math.random() - 1);
      const phi   = Math.random() * Math.PI * 2;
      arr.push({
        x:          r * Math.sin(theta) * Math.cos(phi),
        y:          r * Math.sin(theta) * Math.sin(phi),
        z:          r * Math.cos(theta),
        scale:      0.007 + Math.random() * 0.024,
        phase:      Math.random() * Math.PI * 2,
        speed:      0.25 + Math.random() * 0.75,
        brightness: 0.6 + Math.random() * 0.4,
      });
    }
    return arr;
  }, []);

  /* Build shared geometry & material once */
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 4, 4), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.95, 0.88, 0.70),
        transparent: true,
        opacity: 0.9,
      }),
    [],
  );

  /* Dispose on unmount */
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  /* Animate — twinkling float */
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < COUNT; i++) {
      const s = stars[i];
      const twinkle = s.brightness * (0.85 + Math.sin(t * s.speed + s.phase) * 0.15);
      dummy.position.set(s.x, s.y + Math.sin(t * s.speed * 0.4 + s.phase) * 0.004, s.z);
      dummy.scale.setScalar(s.scale * twinkle);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, COUNT]}
      /* Bottom-right, slight depth recession */
      position={[4.2, -1.95, -0.8]}
    />
  );
}
