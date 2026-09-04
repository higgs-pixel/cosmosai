"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const SolarSystemExplorer = dynamic(
  () => import("./solar-system-explorer").then((mod) => mod.SolarSystemExplorer),
  {
    ssr: false,
    loading: () => (
      <main id="main-content" className="grid min-h-screen place-items-center bg-cosmos-black px-4 text-cosmos-white">
        <div className="glass-panel rounded-[1rem] p-6 text-center">
          <div className="relative z-10">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-solar-300" />
            <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-solar-300">
              Loading planetarium
            </p>
          </div>
        </div>
      </main>
    ),
  },
);

export function SolarSystemLoader() {
  return <SolarSystemExplorer />;
}
