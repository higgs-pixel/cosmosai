"use client";

import dynamic from "next/dynamic";
import { Loader2, Search } from "lucide-react";

const NasaImageExplorer = dynamic(
  () => import("./nasa-image-explorer").then((module) => module.NasaImageExplorer),
  {
    ssr: false,
    loading: () => (
      <main id="main-content" className="grid min-h-screen place-items-center bg-cosmos-black px-4 text-cosmos-white">
        <div className="glass-panel w-full max-w-md rounded-[1rem] p-6 text-center">
          <div className="relative z-10">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-oxygen-400/30 bg-oxygen-400/10">
              <Search className="h-5 w-5 text-oxygen-400" />
            </div>
            <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-oxygen-400" />
            <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-oxygen-400">
              Loading NASA Image Explorer
            </p>
          </div>
        </div>
      </main>
    ),
  },
);

export function NasaImageExplorerLoader() {
  return <NasaImageExplorer />;
}
