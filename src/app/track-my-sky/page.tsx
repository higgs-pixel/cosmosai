"use client";

import dynamic from "next/dynamic";
import { SpaceOperationsBackground } from "@/components/visuals/SpaceOperationsBackground";

const TrackMySkyDashboard = dynamic(
  () => import("@/components/intelligence/TrackMySkyDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[650px] place-items-center rounded-3xl border border-cyan-500/20 bg-[#030611]/80 backdrop-blur-2xl text-cyan-300 text-xs font-mono max-w-[1720px] mx-auto mt-8 shadow-[0_0_50px_rgba(0,229,255,0.08)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="tracking-widest uppercase text-slate-300">INITIALIZING ORBITAL INTELLIGENCE OPERATIONS…</span>
        </div>
      </div>
    ),
  }
);

export default function TrackMySkyPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-x-hidden bg-black text-slate-100 selection:bg-white selection:text-black font-sans"
    >
      {/* Cinematic Deep Space Operations Canvas with Mouse Parallax */}
      <SpaceOperationsBackground />

      {/* Primary Aerospace Content Layer */}
      <div className="relative z-10 w-full">
        <TrackMySkyDashboard />
      </div>
    </main>
  );
}
