"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

const StarGazeView = dynamic(
  () => import("@/components/intelligence/StarGazeView"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 grid place-items-center bg-[#020308] text-cyan-300 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="tracking-widest uppercase text-slate-300">
            Initializing Liquid Glass Aerospace Mission Control…
          </span>
        </div>
      </div>
    ),
  }
);

const DEFAULT_OBSERVER: ObserverCoords = {
  name: "Chennai, Tamil Nadu, India",
  lat: 13.0827,
  lon: 80.2707,
  altMeters: 180,
};

export default function StarGazePage() {
  const [observer, setObserver] = useState<ObserverCoords>(DEFAULT_OBSERVER);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cosmos_sky_observer");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.lat && parsed.lon) {
          setObserver(parsed);
          return;
        }
      }
    } catch {
      /* skip */
    }

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setObserver((prev) => ({
            ...prev,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            altMeters: pos.coords.altitude || prev.altMeters || 10,
          }));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  return (
    <main
      id="main-content"
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#020308] text-cosmos-white select-none"
    >
      <StarGazeView observer={observer} />
    </main>
  );
}

