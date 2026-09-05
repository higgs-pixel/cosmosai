"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, MapPin, Sparkles } from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import {
  CosmicAmbientBackground,
  HorizonGlow,
  LightStreaks,
  NebulaMist,
} from "@/components/visuals/cosmic-primitives";

// Lazy-load the main Orbit dashboard component with ssr: false
const IntelligenceDashboard = dynamic(
  () => import("@/components/intelligence/IntelligenceDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[580px] place-items-center rounded-2xl border border-white/10 bg-[#0f1526] text-slate-400 text-xs font-mono max-w-[1600px] mx-auto mt-6">
        Initializing SGP4 Orbit Propagator &amp; Realtime Satellite Maps…
      </div>
    ),
  }
);

export default function OrbitPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-x-hidden bg-black text-white selection:bg-[#00e5ff]/20 selection:text-white pb-20"
    >
      {/* Premium 4-spike ✦ silver starfield — low density, very low glow */}
      <AnimatedStarfield density="low" />

      {/* Primary Layout */}
      <div className="relative z-10 w-full">
        <IntelligenceDashboard />
      </div>
    </main>
  );
}
