"use client";

import dynamic from "next/dynamic";

const OrbitCinematicDashboard = dynamic(
  () => import("@/components/intelligence/OrbitCinematicDashboard"),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[580px] place-items-center bg-black text-slate-400 text-xs font-mono">
        INITIALIZING ORBITAL INTELLIGENCE PLATFORM…
      </div>
    ),
  }
);

export default function OrbitPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-x-hidden bg-black text-slate-100 selection:bg-cyan-500 selection:text-black"
    >
      <OrbitCinematicDashboard />
    </main>
  );
}

