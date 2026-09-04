"use client";

import { useState, useEffect } from "react";
import { Navigation, ShieldCheck, Smartphone, CheckCircle, RefreshCw, Radio } from "lucide-react";

export default function PairMobilePage() {
  const [status, setStatus] = useState<"idle" | "locating" | "streaming" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number; accuracy: number; alt: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSessionId(params.get("session") || "default");
    }
  }, []);

  const startSharing = () => {
    setStatus("locating");
    setErrorMsg(null);

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("error");
      setErrorMsg("Geolocation API is not supported on this device browser.");
      return;
    }

    navigator.geolocation.watchPosition(
      (pos) => {
        const payload = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: Math.round(pos.coords.altitude || 180),
          accuracy: Math.round(pos.coords.accuracy || 3),
          session: sessionId,
        };
        setCoords(payload);
        setStatus("streaming");

        // Post to server pair endpoint
        fetch(`/api/geolocation/pair?session=${encodeURIComponent(sessionId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});
      },
      (err) => {
        setStatus("error");
        setErrorMsg(err.message || "Failed to access mobile hardware GPS.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl text-center flex flex-col items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-[#00e5ff]/15 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff]">
          <Smartphone className="h-8 w-8 animate-pulse" />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-wide uppercase text-white">
            COSMOS Mobile GPS Relay
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Streaming high-precision smartphone satellite GPS hardware directly to your laptop observatory.
          </p>
        </div>

        {coords && (
          <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-left font-mono text-xs text-slate-300 space-y-1">
            <div className="text-[#00e5ff] font-bold text-sm mb-1 flex items-center gap-2">
              <Radio className="h-4 w-4 animate-ping" />
              Live Hardware Lock
            </div>
            <div>Latitude: <span className="text-white">{coords.lat.toFixed(6)}°</span></div>
            <div>Longitude: <span className="text-white">{coords.lon.toFixed(6)}°</span></div>
            <div>Accuracy Radius: <span className="text-emerald-400">± {coords.accuracy} meters</span></div>
            <div>Altitude: <span className="text-white">{coords.alt} meters ASL</span></div>
          </div>
        )}

        {errorMsg && (
          <div className="text-xs text-rose-400 bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 w-full">
            {errorMsg}
          </div>
        )}

        {status !== "streaming" ? (
          <button
            onClick={startSharing}
            disabled={status === "locating"}
            className="w-full h-12 rounded-xl bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition shadow-[0_0_20px_rgba(0,229,255,0.3)]"
          >
            <Navigation className={`h-4 w-4 ${status === "locating" ? "animate-spin" : ""}`} />
            {status === "locating" ? "Acquiring Satellite Lock..." : "Start Mobile GPS Stream"}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-4 py-2 rounded-full">
            <CheckCircle className="h-4 w-4" />
            Streaming GPS to Laptop (Active Session)
          </div>
        )}
      </div>
    </main>
  );
}
