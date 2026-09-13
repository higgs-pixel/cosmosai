"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, AdaptiveDpr } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense, type MutableRefObject } from "react";
import { CosmicBackground } from "./objects/cosmic-background";
import { AsteroidField } from "./objects/asteroid-field";
import { TerrestrialPlanet } from "./objects/terrestrial-planet";
import { GasGiant } from "./objects/gas-giant";
import { SolarCore } from "./objects/solar-core";
import { IceGiant } from "./objects/ice-giant";
import { DistantGalaxy } from "./objects/distant-galaxy";
import { StarCluster } from "./objects/star-cluster";

/* ─────────────────────────────────────────────────────────
   Camera controller — lerps toward mouse for parallax feel
───────────────────────────────────────────────────────── */
function CameraController({
  mouseRef,
}: {
  mouseRef: MutableRefObject<{ x: number; y: number }>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const tx = mouseRef.current.x * 0.35;
    const ty = mouseRef.current.y * 0.22;
    camera.position.x += (tx - camera.position.x) * 0.028;
    camera.position.y += (ty - camera.position.y) * 0.028;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ─────────────────────────────────────────────────────────
   Scene contents — kept as a child to avoid extra re-mounts
───────────────────────────────────────────────────────── */
function SceneContents({
  mouseRef,
}: {
  mouseRef: MutableRefObject<{ x: number; y: number }>;
}) {
  return (
    <>
      <CameraController mouseRef={mouseRef} />

      {/* Deep space colour */}
      <color attach="background" args={["#020b18"]} />

      {/* ── Lighting ── */}
      {/* Low-intensity blue-tinted ambient */}
      <ambientLight intensity={0.12} color="#1a3565" />
      {/* Key light — warm, simulates distant sun */}
      <directionalLight
        position={[5, 3, 4]}
        intensity={1.1}
        color="#ffe9c8"
        castShadow={false}
      />
      {/* Cool fill from left */}
      <directionalLight position={[-6, 1, 2]} intensity={0.28} color="#3060c0" />
      {/* Sun point light (positional, near solar core) */}
      <pointLight
        position={[0.5, -0.5, 1.5]}
        intensity={4}
        color="#ff8820"
        distance={22}
        decay={2}
      />

      {/* ── Animated nebula & micro-particle background ── */}
      <CosmicBackground />

      {/* ── Star field (Drei built-in — highly optimised) ── */}
      <Stars
        radius={100}
        depth={50}
        count={5500}
        factor={4}
        saturation={0.1}
        fade
        speed={0.4}
      />

      {/* ── Astronomical objects ── */}
      <AsteroidField />
      <TerrestrialPlanet />
      <GasGiant />
      <SolarCore />
      <IceGiant />
      <DistantGalaxy />
      <StarCluster />

      {/* ── Post-processing: bloom for glow ── */}
      <EffectComposer multisampling={0}>
        {/* @ts-ignore — postprocessing JSX types */}
        <Bloom
          intensity={1.1}
          luminanceThreshold={0.22}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

      <AdaptiveDpr pixelated />
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   Root canvas export
───────────────────────────────────────────────────────── */
type SpaceCanvasProps = {
  mouseRef: MutableRefObject<{ x: number; y: number }>;
};

export function SpaceCanvas({ mouseRef }: SpaceCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60, near: 0.05, far: 1000 }}
      style={{ width: "100%", height: "100%" }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <SceneContents mouseRef={mouseRef} />
      </Suspense>
    </Canvas>
  );
}
