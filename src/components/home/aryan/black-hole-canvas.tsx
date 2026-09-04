"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  homepageAnimationShouldRun,
  keepHomepageVideoPlaying,
  homepageMotionAllowed,
  type HomepageVideoSource,
} from "./homepage-contract";

function createVideo(sources: HomepageVideoSource) {
  if (typeof document === "undefined") return null;
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.preload = "metadata";

  if (sources.webmUrl) {
    const source = document.createElement("source");
    source.src = sources.webmUrl;
    source.type = "video/webm";
    video.appendChild(source);
  }
  if (sources.mp4Url) {
    const source = document.createElement("source");
    source.src = sources.mp4Url;
    source.type = "video/mp4";
    video.appendChild(source);
  }
  return video;
}

function BlackHoleMesh({ sources }: { sources: HomepageVideoSource }) {
  const { viewport } = useThree();
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const { mp4Url, webmUrl } = sources;
  const video = useMemo(
    () => createVideo({ mp4Url, webmUrl }),
    [mp4Url, webmUrl],
  );
  const texture = useMemo(() => {
    if (!video) return null;
    const nextTexture = new THREE.VideoTexture(video);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    return nextTexture;
  }, [video]);

  useEffect(() => {
    if (!video) return;
    video.playbackRate = 0.9;
    const stopPlaybackRetry = keepHomepageVideoPlaying(video, true);

    return () => {
      stopPlaybackRetry();
      video.pause();
      video.removeAttribute("src");
      while (video.firstChild) video.removeChild(video.firstChild);
      video.load();
    };
  }, [video]);

  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame((_, delta) => {
    if (materialRef.current && materialRef.current.opacity < 0.9) {
      materialRef.current.opacity = Math.min(
        0.9,
        materialRef.current.opacity + delta * 0.15,
      );
    }
  });

  if (!texture) return null;

  return (
    <group position={[viewport.width / 4, 0, -10]}>
      <mesh>
        <planeGeometry args={[32, 18]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function BlackHoleCanvas({ sources }: { sources: HomepageVideoSource }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(homepageMotionAllowed(motionQuery.matches));
    update();
    motionQuery.addEventListener("change", update);
    return () => motionQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scrollContainer = container.closest(".cosmos-aryan-home");

    const observer = new IntersectionObserver(([entry]) => {
      setNearViewport(entry.isIntersecting);
    }, { root: scrollContainer, rootMargin: "25% 0px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const shouldRun = homepageAnimationShouldRun(motionAllowed, nearViewport);

  return (
    <div ref={containerRef} className="h-full w-full">
      {shouldRun ? (
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <BlackHoleMesh sources={sources} />
          <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={0.8} />
          </EffectComposer>
        </Canvas>
      ) : null}
    </div>
  );
}
