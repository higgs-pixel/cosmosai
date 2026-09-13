"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Each asteroid definition
───────────────────────────────────────────────────────── */
type AsteroidDef = {
  position: [number, number, number];
  scale:    number;
  rotAxis:  [number, number, number];
  rotSpeed: number;
  geoType:  "dodeca" | "octa" | "tetra" | "icosa";
  phase:    number;
};

const ASTEROIDS: AsteroidDef[] = [
  { position: [-4.3, 2.20, -0.60], scale: 0.130, rotAxis: [0.6, 0.8, 0.2], rotSpeed: 0.006, geoType: "dodeca", phase: 0.0 },
  { position: [-3.6, 2.55, -0.35], scale: 0.085, rotAxis: [0.3, 0.5, 0.8], rotSpeed: 0.009, geoType: "octa",   phase: 1.2 },
  { position: [-4.9, 1.95, -0.80], scale: 0.065, rotAxis: [0.8, 0.2, 0.5], rotSpeed: 0.012, geoType: "tetra",  phase: 2.4 },
  { position: [-3.9, 2.80, -0.20], scale: 0.105, rotAxis: [0.4, 0.7, 0.4], rotSpeed: 0.007, geoType: "octa",   phase: 0.8 },
  { position: [-5.2, 2.35, -0.55], scale: 0.150, rotAxis: [0.7, 0.3, 0.6], rotSpeed: 0.005, geoType: "dodeca", phase: 3.1 },
  { position: [-4.1, 1.75, -0.40], scale: 0.075, rotAxis: [0.2, 0.9, 0.3], rotSpeed: 0.011, geoType: "icosa",  phase: 1.7 },
  { position: [-3.3, 2.30, -0.70], scale: 0.095, rotAxis: [0.5, 0.4, 0.7], rotSpeed: 0.008, geoType: "tetra",  phase: 2.9 },
  { position: [-4.6, 1.60, -0.15], scale: 0.115, rotAxis: [0.9, 0.1, 0.4], rotSpeed: 0.006, geoType: "dodeca", phase: 0.4 },
  { position: [-5.5, 1.85, -0.90], scale: 0.055, rotAxis: [0.3, 0.8, 0.5], rotSpeed: 0.014, geoType: "octa",   phase: 4.2 },
];

/* ─────────────────────────────────────────────────────────
   Single asteroid mesh
───────────────────────────────────────────────────────── */
function Asteroid({ position, scale, rotAxis, rotSpeed, geoType, phase }: AsteroidDef) {
  const meshRef = useRef<THREE.Mesh>(null);
  const axisVec = useMemo(
    () => new THREE.Vector3(...rotAxis).normalize(),
    [rotAxis],
  );

  /* Build geometry once — irregular polyhedra look rock-like */
  const geometry = useMemo(() => {
    let geo: THREE.BufferGeometry;
    if (geoType === "octa")   geo = new THREE.OctahedronGeometry(1, 1);
    else if (geoType === "tetra") geo = new THREE.TetrahedronGeometry(1, 1);
    else if (geoType === "icosa") geo = new THREE.IcosahedronGeometry(1, 0);
    else                      geo = new THREE.DodecahedronGeometry(1, 0);

    /* Perturb vertices slightly for an organic, rocky silhouette */
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const jitter = 0.12 + Math.sin(i * 7.3 + phase) * 0.08;
      pos.setXYZ(
        i,
        pos.getX(i) * (1 + jitter * (Math.random() - 0.5)),
        pos.getY(i) * (1 + jitter * (Math.random() - 0.5)),
        pos.getZ(i) * (1 + jitter * (Math.random() - 0.5)),
      );
    }
    geo.computeVertexNormals();
    return geo;
  }, [geoType, phase]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime + phase;
    /* Rotate around the unique axis */
    meshRef.current.rotateOnAxis(axisVec, rotSpeed);
    /* Gentle float */
    meshRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.035;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale} geometry={geometry}>
      <meshStandardMaterial
        color="#7a6b54"
        roughness={0.97}
        metalness={0.02}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────
   Export
───────────────────────────────────────────────────────── */
export function AsteroidField() {
  return (
    <group>
      {ASTEROIDS.map((a, i) => (
        <Asteroid key={i} {...a} />
      ))}
    </group>
  );
}
