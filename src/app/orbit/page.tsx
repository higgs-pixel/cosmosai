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
      className="relative min-h-screen overflow-x-hidden bg-cosmos-black text-cosmos-white pb-12"
    >
      {/* Background Visual Effects */}
      <AnimatedStarfield />
      <CosmicAmbientBackground tone="ai" className="cosmic-fixed z-0" />
      <NebulaMist tone="ai" className="cosmic-fixed z-0 opacity-[0.16]" />
      <LightStreaks tone="ai" className="cosmic-fixed z-0 opacity-[0.16]" />
      <HorizonGlow tone="ai" className="cosmic-fixed z-0 opacity-[0.2]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_22%_0%,rgba(167,139,250,0.12),transparent_32%),radial-gradient(circle_at_76%_20%,rgba(56,189,248,0.1),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.1),#03040a_88%)]" />
      <div className="noise-overlay fixed z-0 pointer-events-none" />

      {/* Primary Layout Wrapper */}
      <div className="relative z-10 mx-auto px-4 pt-4 md:px-6">
        {/* Navigation Bar */}
        <div className="mb-4 max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to COSMOS Observatory
          </Link>

          <Link
            href="/track-my-sky"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[#00e5ff]/40 bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 px-4 text-xs font-bold text-[#00e5ff] hover:text-white transition shadow-[0_0_15px_rgba(0,229,255,0.15)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" />
            Track My Sky
          </Link>
        </div>

        {/* Orbit Dashboard Frame */}
        <IntelligenceDashboard />
      </div>
    </main>
  );
}
