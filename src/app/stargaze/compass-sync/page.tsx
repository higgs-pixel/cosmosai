"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Compass, Smartphone, Radio, CheckCircle2, AlertCircle, Sliders } from "lucide-react";

export default function MobileCompassSyncPage() {
  // Session ID resolution: reads ?session= from URL or generates unique per-device ID
  const [sessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "stargaze-sync";
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("session");
    if (raw && raw.trim() && raw.trim() !== "<SESSION_ID>" && raw.trim() !== "%3CSESSION_ID%3E") {
      return raw.trim();
    }
    return Math.random().toString(36).substring(2, 10);
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [roll, setRoll] = useState<number>(0);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [packetCount, setPacketCount] = useState<number>(0);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [invertPitch, setInvertPitch] = useState<boolean>(false);

  const headingRef = useRef<number>(0);
  const pitchRef = useRef<number>(0);
  const rollRef = useRef<number>(0);
  const lastSendTime = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Synchronize ref values
  useEffect(() => {
    headingRef.current = heading;
  }, [heading]);
  useEffect(() => {
    pitchRef.current = pitch;
  }, [pitch]);
  useEffect(() => {
    rollRef.current = roll;
  }, [roll]);

  // Transmit orientation data over HTTP POST and BroadcastChannel
  const sendOrientationData = useCallback(
    async (h: number, p: number, r: number) => {
      setIsSending(true);

      // 1. BroadcastChannel local tab sync fallback
      try {
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: "COMPASS_TELEMETRY",
            sessionId,
            heading: h,
            pitch: p,
            roll: r,
            timestamp: Date.now(),
          });
        }
      } catch {
        /* channel error */
      }

      // 2. Remote HTTP API sync
      try {
        await fetch("/api/stargaze/compass-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            heading: h,
            pitch: p,
            roll: r,
          }),
        });
        setPacketCount((c) => c + 1);
      } catch {
        /* skip network hiccups */
      } finally {
        setIsSending(false);
      }
    },
    [sessionId]
  );

  // Start BroadcastChannel on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channelRef.current = new BroadcastChannel("stargaze_compass_channel");
    }
    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  // Send initial handshake immediately on page load
  useEffect(() => {
    sendOrientationData(headingRef.current, pitchRef.current, rollRef.current);

    const heartbeat = setInterval(() => {
      sendOrientationData(headingRef.current, pitchRef.current, rollRef.current);
    }, 400);

    return () => clearInterval(heartbeat);
  }, [sendOrientationData]);

  // Direct Device Orientation Listener (Sensor Fusion Completely Removed)
  const startListening = useCallback(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (manualMode) return;

      if (e.beta === null || e.beta === undefined) return;

      // 1. Azimuth / Compass Heading
      let compassHeading = 0;
      const betaRad = ((e.beta || 0) * Math.PI) / 180;
      const gammaRad = ((e.gamma || 0) * Math.PI) / 180;

      // @ts-expect-error iOS webkitCompassHeading
      if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading)) {
        // @ts-expect-error iOS webkitCompassHeading
        compassHeading = e.webkitCompassHeading;
      } else if (typeof e.alpha === "number" && !isNaN(e.alpha)) {
        const alphaRad = (e.alpha * Math.PI) / 180;
        const Vx = -Math.sin(alphaRad) * Math.cos(gammaRad) - Math.cos(alphaRad) * Math.sin(betaRad) * Math.sin(gammaRad);
        const Vy = -Math.cos(alphaRad) * Math.cos(gammaRad) + Math.sin(alphaRad) * Math.sin(betaRad) * Math.sin(gammaRad);
        const computedHeading = (Math.atan2(Vx, Vy) * 180) / Math.PI;
        compassHeading = !isNaN(computedHeading) && isFinite(computedHeading) ? computedHeading : (360 - e.alpha) % 360;
      }

      // 2. Stellarium Universal 3D Orientation Elevation Transformation:
      // Absolute deviation from vertical 90° guarantees tilting UP to sky ALWAYS increases elevation from 0° (Horizon) to +90° (Zenith)
      const cosVal = Math.max(-1, Math.min(1, Math.cos(betaRad) * Math.cos(gammaRad)));
      const calculatedElDeg = Math.abs((Math.asin(cosVal) * 180) / Math.PI);

      const normHeading = Math.round(((compassHeading % 360) + 360) % 360);
      const rawElevation = Math.round(Math.max(0, Math.min(90, calculatedElDeg)));
      const normElevation = invertPitch ? 90 - rawElevation : rawElevation;
      const normRoll = Math.round(e.gamma || 0);

      setHeading(normHeading);
      setPitch(normElevation);
      setRoll(normRoll);

      const now = Date.now();
      if (now - lastSendTime.current >= 80) {
        lastSendTime.current = now;
        sendOrientationData(normHeading, normElevation, normRoll);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("deviceorientation", handleOrientation, true);
      }
    };
  }, [manualMode, sendOrientationData]);

  // Request Sensor Permission (iOS 13+ & Android)
  const requestSensorPermission = async () => {
    try {
      // @ts-expect-error iOS Safari DeviceOrientationEvent permission request
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        // @ts-expect-error iOS Safari permission call
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === "granted") {
          setHasPermission(true);
          startListening();
        } else {
          setHasPermission(false);
        }
      } else {
        setHasPermission(true);
        startListening();
      }
    } catch {
      setHasPermission(true);
      startListening();
    }
  };

  useEffect(() => {
    // @ts-expect-error iOS check
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") {
      setHasPermission(true);
      const cleanup = startListening();
      return cleanup;
    }
  }, [startListening]);

  const getCardinalText = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return "NORTH (0°)";
    if (deg >= 22.5 && deg < 67.5) return "NORTH-EAST (45°)";
    if (deg >= 67.5 && deg < 112.5) return "EAST (90°)";
    if (deg >= 112.5 && deg < 157.5) return "SOUTH-EAST (135°)";
    if (deg >= 157.5 && deg < 202.5) return "SOUTH (180°)";
    if (deg >= 202.5 && deg < 247.5) return "SOUTH-WEST (225°)";
    if (deg >= 247.5 && deg < 292.5) return "WEST (270°)";
    return "NORTH-WEST (315°)";
  };

  const displaySessionId = `#${sessionId.slice(0, 10)}`;

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-x-hidden">
      {/* Header Bar */}
      <header className="w-full max-w-md flex items-center justify-between border-b border-emerald-500/30 pb-3">
        <div className="flex items-center gap-2 truncate">
          <Smartphone className="h-6 w-6 text-emerald-400 animate-pulse shrink-0" />
          <div className="truncate">
            <h1 className="font-extrabold text-sm text-white tracking-wide truncate">STARGAZER COMPASS SENSOR</h1>
            <div className="text-[10px] font-mono text-emerald-400 truncate">SESSION: {displaySessionId}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300 shrink-0">
          <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span>TRANSMITTING</span>
        </div>
      </header>

      {/* Stellarium AR Back-Camera Sight Banner */}
      <div className="w-full max-w-md my-2 p-3 rounded-2xl bg-cyan-950/90 border border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-xl flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 shrink-0 animate-pulse">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="text-[11px] font-mono leading-tight">
          <div className="font-extrabold text-cyan-300 tracking-wide flex items-center gap-1.5">
            <span>📷 BACK CAMERA SIGHT VECTOR ACTIVE</span>
          </div>
          <div className="text-slate-300 text-[10px] mt-0.5">
            Point your smartphone camera at the sky to direct the 3D observatory laser &amp; sky view.
          </div>
        </div>
      </div>

      {/* Center Interactive Glowing Compass Rose Dial */}
      <section className="my-4 flex flex-col items-center justify-center relative w-full max-w-md">
        {/* Outer Rotating Compass Outer Ring */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-emerald-500/40 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden">
          {/* Concentric Elevation Rings */}
          <div className="absolute inset-4 rounded-full border border-white/10" />
          <div className="absolute inset-12 rounded-full border border-emerald-500/20" />
          <div className="absolute inset-20 rounded-full border border-white/10" />

          {/* Compass Needle */}
          <div
            style={{ transform: `rotate(${-heading}deg)` }}
            className="w-full h-full absolute inset-0 flex items-center justify-center transition-transform duration-100 ease-out"
          >
            {/* North Red Pointer */}
            <div className="absolute top-2 font-mono text-xs font-black text-red-500 flex flex-col items-center">
              <span>N</span>
              <div className="w-1.5 h-6 bg-red-500 rounded-full shadow-[0_0_10px_#ef4444]" />
            </div>
            {/* South Pointer */}
            <div className="absolute bottom-2 font-mono text-xs font-bold text-emerald-400 flex flex-col items-center">
              <div className="w-1.5 h-6 bg-emerald-400 rounded-full" />
              <span>S</span>
            </div>
            {/* East / West */}
            <div className="absolute right-3 font-mono text-xs font-bold text-slate-400">E</div>
            <div className="absolute left-3 font-mono text-xs font-bold text-slate-400">W</div>

            {/* Line of sight beam line */}
            <div className="w-0.5 h-full bg-emerald-500/30 absolute" />
          </div>

          {/* Center HUD Heading Degree Value */}
          <div className="z-10 flex flex-col items-center justify-center bg-slate-950/90 p-4 rounded-full border border-emerald-500/50 shadow-2xl">
            <Compass className="h-6 w-6 text-emerald-400 mb-1" />
            <div className="font-mono text-2xl font-black text-white">{heading}°</div>
            <div className="font-mono text-[9px] font-bold text-emerald-300 uppercase tracking-wider">
              {getCardinalText(heading)}
            </div>
          </div>
        </div>

        {/* Live Telemetry HUD Grid */}
        <div className="w-full grid grid-cols-3 gap-2 mt-4 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-center">
            <div className="text-[10px] text-slate-400">AZIMUTH</div>
            <div className="font-extrabold text-emerald-400 text-sm">{heading}°</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-pink-500/30 text-center">
            <div className="text-[10px] text-slate-400">ELEVATION</div>
            <div className="font-extrabold text-pink-400 text-sm">{pitch}° {pitch === 0 ? "(Horizon)" : pitch === 90 ? "(Zenith)" : ""}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-center">
            <div className="text-[10px] text-slate-400">PACKETS</div>
            <div className="font-extrabold text-amber-300 text-sm">{packetCount}</div>
          </div>
        </div>

        {/* Interactive Manual Sliders & Sensor Controls */}
        <div className="w-full mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 flex-wrap gap-1">
            <span className="flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5 text-emerald-400" /> Sensor Settings
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setInvertPitch(!invertPitch)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  invertPitch ? "bg-pink-500 text-white" : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
                title="Toggle if tilting top of phone up moves elevation down"
              >
                {invertPitch ? "PITCH: INVERTED" : "PITCH: NORMAL"}
              </button>

              <button
                onClick={() => setManualMode(!manualMode)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  manualMode ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {manualMode ? "MANUAL OVERRIDE ON" : "AUTO SENSORS"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 text-[10px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>AZIMUTH (Heading)</span>
              <span className="text-emerald-400 font-bold">{heading}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={heading}
              onChange={(e) => {
                setManualMode(true);
                const h = parseInt(e.target.value, 10);
                setHeading(h);
                sendOrientationData(h, pitch, roll);
              }}
              className="accent-emerald-400 w-full cursor-pointer h-1.5 rounded-lg bg-slate-800"
            />
          </div>

          <div className="flex flex-col gap-1 text-[10px] font-mono">
            <div className="flex justify-between text-slate-400">
              <span>ELEVATION (Pitch)</span>
              <span className="text-pink-400 font-bold">{pitch}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={pitch}
              onChange={(e) => {
                setManualMode(true);
                const p = parseInt(e.target.value, 10);
                setPitch(p);
                sendOrientationData(heading, p, roll);
              }}
              className="accent-pink-400 w-full cursor-pointer h-1.5 rounded-lg bg-slate-800"
            />
          </div>
        </div>
      </section>

      {/* Permission Button / Status Footer */}
      <footer className="w-full max-w-md flex flex-col items-center gap-2 mb-2">
        {hasPermission !== true && (
          <button
            onClick={requestSensorPermission}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2"
          >
            <Compass className="h-4 w-4" />
            <span>ENABLE GYROSCOPE &amp; COMPASS SENSORS</span>
          </button>
        )}

        {hasPermission === true && (
          <div className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-center text-xs font-mono text-emerald-300 flex items-center justify-center gap-2 shadow-inner">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Transmitting Live Telemetry to 3D Dome</span>
          </div>
        )}

        <div className="text-[10px] font-mono text-slate-400 text-center flex items-center gap-1.5">
          {hasPermission === false ? (
            <span className="text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Sensor permission denied (use sliders above)
            </span>
          ) : (
            <span>Hold phone vertically to view horizon, tilt up to view zenith</span>
          )}
        </div>
      </footer>
    </main>
  );
}
