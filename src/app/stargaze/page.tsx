"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Sparkles, Compass, MapPin, Eye, Info } from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import {
  CosmicAmbientBackground,
  HorizonGlow,
  LightStreaks,
  NebulaMist,
} from "@/components/visuals/cosmic-primitives";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

const StarGazeView = dynamic(
  () => import("@/components/intelligence/StarGazeView"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[75vh] min-h-[600px] place-items-center rounded-2xl border border-purple-500/20 bg-[#03040a] text-purple-300 text-xs font-mono max-w-[1700px] mx-auto">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="h-10 w-10 text-purple-400 animate-spin" />
          <span>Initializing 360° Star Gaze Celestial Dome &amp; Constellations Engine…</span>
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
      className="relative min-h-screen overflow-x-hidden bg-cosmos-black text-cosmos-white pb-12"
    >
      {/* Background Visual Effects */}
      <AnimatedStarfield />
      <CosmicAmbientBackground tone="ai" className="cosmic-fixed z-0" />
      <NebulaMist tone="ai" className="cosmic-fixed z-0 opacity-[0.2]" />
      <LightStreaks tone="ai" className="cosmic-fixed z-0 opacity-[0.2]" />
      <HorizonGlow tone="ai" className="cosmic-fixed z-0 opacity-[0.25]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_22%_0%,rgba(168,85,247,0.18),transparent_35%),radial-gradient(circle_at_76%_20%,rgba(56,189,248,0.14),transparent_35%),linear-gradient(180deg,rgba(3,4,10,0.1),#03040a_88%)]" />
      <div className="noise-overlay fixed z-0 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 mx-auto px-4 pt-4 md:px-6 max-w-[1700px]">
        {/* Navigation Bar */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/track-my-sky"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Track My Sky
            </Link>

            <span className="text-slate-600">/</span>

            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-purple-300 bg-purple-500/20 border border-purple-500/40 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Star Gaze Planetarium
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-full">
            <MapPin className="h-3.5 w-3.5 text-purple-400" />
            <span>{observer.name || "GPS Site"}</span>
            <span className="text-slate-500">({observer.lat.toFixed(4)}°, {observer.lon.toFixed(4)}°)</span>
          </div>
        </div>

        {/* Hero Section Banner */}
        <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-950/90 to-purple-950/30 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 mb-2">
                <Compass className="h-3 w-3 text-cyan-400" /> Real-Time 3D Live Satellite Sky Radar
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Live Satellite Orbit &amp; Trajectory Sky Explorer
              </h1>
              <p className="text-xs text-slate-300 max-w-3xl mt-1 leading-relaxed">
                Track live moving satellites (ISS, Tiangong, Hubble, Starlink, NOAA, GPS) above your location with SGP4 orbit propagation, 3D trajectory trajectory paths, and a real-time right-side telemetry panel.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-950/80 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-center">
                <div className="text-[10px] text-emerald-400 font-mono uppercase">Propagation</div>
                <div className="text-sm font-bold text-white font-mono">SGP4 / TLE</div>
              </div>
              <div className="bg-slate-950/80 border border-cyan-500/30 px-3.5 py-2 rounded-xl text-center">
                <div className="text-[10px] text-cyan-400 font-mono uppercase">Trajectory</div>
                <div className="text-sm font-bold text-white font-mono">3D Orbit Arc</div>
              </div>
              <div className="bg-slate-950/80 border border-amber-500/30 px-3.5 py-2 rounded-xl text-center">
                <div className="text-[10px] text-amber-400 font-mono uppercase">Telemetry</div>
                <div className="text-sm font-bold text-white font-mono">Live Radar</div>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen 3D Star Gaze View */}
        <div className="w-full min-h-[720px] h-[80vh] rounded-2xl overflow-hidden border border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.15)] bg-[#03040a]">
          <StarGazeView observer={observer} />
        </div>
      </div>
    </main>
  );
}
