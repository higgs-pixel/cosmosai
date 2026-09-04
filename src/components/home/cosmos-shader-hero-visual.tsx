"use client";

import Image from "next/image";
import { useState } from "react";

export function CosmosShaderHeroVisual() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="cosmos-shader-visual relative h-full min-h-[260px] overflow-hidden rounded-[1.05rem] bg-cosmos-black md:min-h-[420px]">
      {videoFailed ? (
        <Image
          src="/images/earth-dashboard/earth-horizon.jpg"
          alt=""
          fill
          sizes="(min-width: 768px) 430px, 100vw"
          className="absolute inset-0 z-0 object-cover opacity-80"
          aria-hidden="true"
        />
      ) : (
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-85"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/earth-dashboard/earth-horizon.jpg"
          onError={() => setVideoFailed(true)}
          aria-label="Looping cinematic COSMOS observatory video"
        >
          <source src="/videos/cosmos-hero.mp4" type="video/mp4" />
        </video>
      )}
      <div className="cosmos-shader-visual__overlay" aria-hidden="true" />

      <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-oxygen-400/24 bg-cosmos-black/58 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-oxygen-300 backdrop-blur-xl md:left-5 md:top-5">
        <span className="h-1.5 w-1.5 rounded-full bg-aurora-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]" />
        Cinematic observatory
      </div>
    </div>
  );
}
