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
          const newObs: ObserverCoords = {
            name: "GPS Observer Location",
            lat: parseFloat(pos.coords.latitude.toFixed(6)),
            lon: parseFloat(pos.coords.longitude.toFixed(6)),
            altMeters: Math.round(pos.coords.altitude || 180),
          };
          setObserver(newObs);
          try {
            localStorage.setItem("cosmos_sky_observer", JSON.stringify(newObs));
          } catch {}
        },
        () => {
          // IP Network Geolocation Fallback
          fetch("/api/geolocation")
            .then((r) => r.json())
            .then((geo) => {
              if (geo && typeof geo.lat === "number" && typeof geo.lon === "number") {
                const name = geo.city && geo.country ? `${geo.city}, ${geo.country}` : "Regional Observatory";
                const ipObs: ObserverCoords = {
                  name,
                  lat: parseFloat(geo.lat.toFixed(6)),
                  lon: parseFloat(geo.lon.toFixed(6)),
                  altMeters: 180,
                };
                setObserver(ipObs);
                try {
                  localStorage.setItem("cosmos_sky_observer", JSON.stringify(ipObs));
                } catch {}
              }
            })
            .catch(() => {});
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      fetch("/api/geolocation")
        .then((r) => r.json())
        .then((geo) => {
          if (geo && typeof geo.lat === "number" && typeof geo.lon === "number") {
            const name = geo.city && geo.country ? `${geo.city}, ${geo.country}` : "Regional Observatory";
            const ipObs: ObserverCoords = {
              name,
              lat: parseFloat(geo.lat.toFixed(6)),
              lon: parseFloat(geo.lon.toFixed(6)),
              altMeters: 180,
            };
            setObserver(ipObs);
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <main
      id="main-content"
      className="relative min-h-screen w-full bg-black text-white selection:bg-[#00e5ff]/20 selection:text-white"
    >
      <StarGazeView observer={observer} />
    </main>
  );
}

