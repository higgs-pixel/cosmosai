"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Compass, Smartphone, Radio, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function MobileCompassSyncPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "default-session";

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(45);
  const [roll, setRoll] = useState<number>(0);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("Tap below to connect your mobile compass sensors.");
  const [packetCount, setPacketCount] = useState<number>(0);

  const lastSendTime = useRef<number>(0);

  // Request Device Orientation permission (Required on iOS 13+)
  const requestSensorPermission = async () => {
    try {
      // @ts-expect-error iOS Safari DeviceOrientationEvent permission request
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        // @ts-expect-error iOS Safari permission call
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === "granted") {
          setHasPermission(true);
          setStatusMsg("Compass & Gyroscope Sensors Connected Live!");
          startListening();
        } else {
          setHasPermission(false);
          setStatusMsg("Permission denied. Please allow motion sensors in browser settings.");
        }
      } else {
        // Standard Android / Non-iOS Chrome
        setHasPermission(true);
        setStatusMsg("Compass Sensors Active!");
        startListening();
      }
    } catch (err) {
      console.error("Error requesting orientation permission:", err);
      setHasPermission(true);
      startListening();
    }
  };

  const startListening = () => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let compassHeading = 0;

      // iOS Safari webkitCompassHeading (0 to 360, 0 = North)
      // @ts-expect-error iOS webkitCompassHeading
      if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading)) {
        // @ts-expect-error iOS webkitCompassHeading
        compassHeading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Standard Android alpha (0 to 360 degrees counterclockwise from north)
        compassHeading = (360 - e.alpha) % 360;
      }

      const calculatedPitch = e.beta !== null ? Math.max(0, Math.min(90, e.beta)) : 45;
      const calculatedRoll = e.gamma !== null ? e.gamma : 0;

      const normHeading = Math.round((compassHeading % 360 + 360) % 360);
      const normPitch = Math.round(calculatedPitch);

      setHeading(normHeading);
      setPitch(normPitch);
      setRoll(Math.round(calculatedRoll));

      // Throttle post requests to max 20Hz (every 50ms)
      const now = Date.now();
      if (now - lastSendTime.current >= 50) {
        lastSendTime.current = now;
        sendOrientationData(normHeading, normPitch, Math.round(calculatedRoll));
      }
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  };

  const sendOrientationData = async (h: number, p: number, r: number) => {
    setIsSending(true);
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
      /* ignore transient network drops */
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    // Auto check if permission is not required on standard devices
    // @ts-expect-error iOS check
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") {
      setHasPermission(true);
      const cleanup = startListening();
      return cleanup;
    }
  }, []);

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

  return (
    <main className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center justify-between p-6 select-none overflow-hidden">
      {/* Header Bar */}
      <header className="w-full max-w-md flex items-center justify-between border-b border-emerald-500/30 pb-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-emerald-400 animate-pulse" />
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-wide">STARGAZER MOBILE SENSOR</h1>
            <div className="text-[10px] font-mono text-emerald-400">SESSION: #{sessionId.slice(0, 8)}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
          <Radio className="h-3 w-3 text-emerald-400 animate-ping" />
          <span>LIVE 20Hz</span>
        </div>
      </header>

      {/* Center Interactive Glowing Compass Rose Dial */}
      <section className="my-8 flex flex-col items-center justify-center relative w-full max-w-md">
        {/* Outer Rotating Compass Outer Ring */}
        <div className="relative w-64 h-64 rounded-full border-2 border-emerald-500/40 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden">
          {/* Concentric Elevation Rings */}
          <div className="absolute inset-4 rounded-full border border-white/10" />
          <div className="absolute inset-12 rounded-full border border-emerald-500/20" />
          <div className="absolute inset-20 rounded-full border border-white/10" />

          {/* Compass Needle (Rotates according to device heading) */}
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

        {/* Dynamic Telemetry Stats Grid */}
        <div className="w-full grid grid-cols-3 gap-2 mt-6 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-center">
            <div className="text-[10px] text-slate-400">AZIMUTH</div>
            <div className="font-extrabold text-emerald-400 text-sm">{heading}°</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-pink-500/30 text-center">
            <div className="text-[10px] text-slate-400">ELEVATION</div>
            <div className="font-extrabold text-pink-400 text-sm">{pitch}°</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 text-center">
            <div className="text-[10px] text-slate-400">PACKETS</div>
            <div className="font-extrabold text-amber-300 text-sm">{packetCount}</div>
          </div>
        </div>
      </section>

      {/* Permission Button / Status Footer */}
      <footer className="w-full max-w-md flex flex-col items-center gap-3 mb-4">
        {hasPermission !== true && (
          <button
            onClick={requestSensorPermission}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2"
          >
            <Compass className="h-5 w-5" />
            <span>ENABLE GYROSCOPE &amp; COMPASS SENSORS</span>
          </button>
        )}

        {hasPermission === true && (
          <div className="w-full p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-center text-xs font-mono text-emerald-300 flex items-center justify-center gap-2 shadow-inner">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Transmitting Live Compass Telemetry to Dome</span>
          </div>
        )}

        <div className="text-[11px] font-mono text-slate-400 text-center flex items-center gap-1.5">
          {hasPermission === false ? (
            <span className="text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Sensor permission denied on device
            </span>
          ) : (
            <span>Point phone towards sky to move 3D StarGazer line of sight</span>
          )}
        </div>
      </footer>
    </main>
  );
}
