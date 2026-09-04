"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Orbit, MapPin, Sparkles } from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import {
  CosmicAmbientBackground,
  HorizonGlow,
  LightStreaks,
  NebulaMist,
} from "@/components/visuals/cosmic-primitives";

const TrackMySkyDashboard = dynamic(
  () => import("@/components/intelligence/TrackMySkyDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[580px] place-items-center rounded-2xl border border-white/10 bg-[#0f1526] text-slate-400 text-xs font-mono max-w-[1600px] mx-auto mt-6">
        Initializing Topocentric Sky Dome &amp; Naked-Eye Visibility Engine…
      </div>
    ),
  }
);

export default function OrbitTrackMySkyPage() {
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
        {/* Navigation Header */}
        <div className="mb-4 max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orbit"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Orbit Workspace
            </Link>

            <span className="text-slate-600">/</span>

            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00e5ff] bg-[#00e5ff]/10 border border-[#00e5ff]/30 px-3 py-1 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" />
              Track My Sky
            </span>
          </div>

          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
          >
            <Orbit className="h-3.5 w-3.5 text-[#00e5ff]" />
            COSMOS Observatory
          </Link>
        </div>

        {/* Main Dashboard Component */}
        <TrackMySkyDashboard />
      </div>
    </main>
  );
}
