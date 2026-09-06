"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Compass, Smartphone, Radio, CheckCircle2, AlertCircle, Sliders, Eye, Navigation, Target } from "lucide-react";
import { Vector3, Matrix4, MathUtils } from "three";

// Compass cardinal bearings matching Stargaze FloatingCompassHUD
const CARDINALS = [
  { label: "N", deg: 0, isMajor: true },
  { label: "NE", deg: 45, isMajor: false },
  { label: "E", deg: 90, isMajor: true },
  { label: "SE", deg: 135, isMajor: false },
  { label: "S", deg: 180, isMajor: true },
  { label: "SW", deg: 225, isMajor: false },
  { label: "W", deg: 270, isMajor: true },
  { label: "NW", deg: 315, isMajor: false },
];

const TICKS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

// Calculate 3D W3C Earth frame orientation to compute true heading & elevation without Gimbal Lock
function calculateDeviceSightOrientation(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenOrientDeg: number = 0,
  invertPitch: boolean = false,
  calibrationOffset: number = 0,
  sightMode: "auto" | "camera" | "pointer" = "auto"
) {
  const alpha = MathUtils.degToRad(alphaDeg || 0);
  const beta = MathUtils.degToRad(betaDeg || 0);
  const gamma = MathUtils.degToRad(gammaDeg || 0);

  // W3C Transformation Matrix: Rz(alpha) * Rx(beta) * Ry(gamma)
  const mZ = new Matrix4().makeRotationZ(alpha);
  const mX = new Matrix4().makeRotationX(beta);
  const mY = new Matrix4().makeRotationY(gamma);
  const m = new Matrix4().multiplyMatrices(mZ, new Matrix4().multiplyMatrices(mX, mY));

  if (screenOrientDeg) {
    const mScreen = new Matrix4().makeRotationZ(MathUtils.degToRad(-screenOrientDeg));
    m.multiply(mScreen);
  }

  // Device coordinate vectors transformed into W3C Earth frame (X: East, Y: North, Z: Up):
  // 1. Top of device (handheld compass pointer): (0, 1, 0)
  // 2. Back camera (viewfinder lens sight): (0, 0, -1)
  const topEarth = new Vector3(0, 1, 0).applyMatrix4(m);
  const camEarth = new Vector3(0, 0, -1).applyMatrix4(m);

  let targetVec: Vector3;
  let rawElevationDeg: number;
  const absBeta = Math.abs(betaDeg || 0);

  if (sightMode === "pointer") {
    targetVec = topEarth;
    rawElevationDeg = MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, topEarth.z))));
  } else if (sightMode === "camera") {
    targetVec = camEarth;
    rawElevationDeg = MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, -camEarth.z))));
  } else {
    // AUTO: When held flat/tilted in hand to view screen (beta < 55°), use top pointer.
    // When held upright like a camera viewfinder (beta >= 55°), use camera lens.
    if (absBeta < 55) {
      targetVec = topEarth;
      rawElevationDeg = MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, topEarth.z))));
    } else {
      targetVec = camEarth;
      rawElevationDeg = MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, -camEarth.z))));
    }
  }

  // Azimuth: Angle in horizontal plane clockwise from North (+Y) towards East (+X)
  let rawHeading = (MathUtils.radToDeg(Math.atan2(targetVec.x, targetVec.y)) + 360) % 360;

  let finalHeading = (rawHeading + calibrationOffset) % 360;
  if (finalHeading < 0) finalHeading += 360;

  let elevationDeg = rawElevationDeg;
  if (invertPitch) elevationDeg = -elevationDeg;
  elevationDeg = Math.max(0, Math.min(90, elevationDeg));

  return {
    heading: Number(finalHeading.toFixed(1)),
    pitch: Number(elevationDeg.toFixed(1)),
    roll: Number((gammaDeg || 0).toFixed(1)),
  };
}

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
  const [calibrationOffset, setCalibrationOffset] = useState<number>(0);
  const [sightMode, setSightMode] = useState<"auto" | "camera" | "pointer">("auto");

  const headingRef = useRef<number>(0);
  const pitchRef = useRef<number>(0);
  const rollRef = useRef<number>(0);
  const smoothedHeadingRef = useRef<number | null>(null);
  const smoothedPitchRef = useRef<number | null>(null);
  const smoothedRollRef = useRef<number | null>(null);
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

  // Page leave / beforeunload listener to notify desktop observatory immediately
  useEffect(() => {
    const handleLeave = () => {
      try {
        if (channelRef.current) {
          channelRef.current.postMessage({
            type: "COMPASS_DISCONNECT",
            sessionId,
          });
        }
        navigator.sendBeacon?.(
          "/api/stargaze/compass-sync",
          new Blob([JSON.stringify({ sessionId, disconnect: true })], { type: "application/json" })
        );
      } catch {
        /* skip */
      }
    };

    window.addEventListener("beforeunload", handleLeave);
    window.addEventListener("pagehide", handleLeave);
    return () => {
      window.removeEventListener("beforeunload", handleLeave);
      window.removeEventListener("pagehide", handleLeave);
    };
  }, [sessionId]);

  // Send initial handshake immediately on page load
  useEffect(() => {
    sendOrientationData(headingRef.current, pitchRef.current, rollRef.current);

    const heartbeat = setInterval(() => {
      sendOrientationData(headingRef.current, pitchRef.current, rollRef.current);
    }, 400);

    return () => clearInterval(heartbeat);
  }, [sendOrientationData]);

  // Direct Device Orientation Listener (W3C 3D Earth frame math)
  const startListening = useCallback(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (manualMode) return;

      if (e.beta === null || e.beta === undefined) return;

      const screenAngle = typeof window !== "undefined" && window.screen?.orientation?.angle ? window.screen.orientation.angle : 0;
      let normHeading = 0;
      let normElevation = 0;
      let normRoll = 0;

      // @ts-expect-error iOS webkitCompassHeading
      if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading) && e.webkitCompassHeading >= 0) {
        // @ts-expect-error iOS webkitCompassHeading
        const rawiOSHeading = e.webkitCompassHeading;
        const computed = calculateDeviceSightOrientation(e.alpha || 0, e.beta || 0, e.gamma || 0, screenAngle, invertPitch, calibrationOffset, sightMode);
        normHeading = Math.round((rawiOSHeading + calibrationOffset) % 360);
        if (normHeading < 0) normHeading += 360;
        normElevation = computed.pitch;
        normRoll = computed.roll;
      } else {
        const computed = calculateDeviceSightOrientation(e.alpha || 0, e.beta || 0, e.gamma || 0, screenAngle, invertPitch, calibrationOffset, sightMode);
        normHeading = computed.heading;
        normElevation = computed.pitch;
        normRoll = computed.roll;
      }

      // Apply smooth Exponential Moving Average (EMA) filter with deadband to eradicate sensor shake
      if (smoothedHeadingRef.current === null) {
        smoothedHeadingRef.current = normHeading;
      } else {
        const diff = (normHeading - smoothedHeadingRef.current + 540) % 360 - 180;
        if (Math.abs(diff) > 0.35) {
          smoothedHeadingRef.current = (smoothedHeadingRef.current + diff * 0.24 + 360) % 360;
        }
      }

      if (smoothedPitchRef.current === null) {
        smoothedPitchRef.current = normElevation;
      } else {
        const pDiff = normElevation - smoothedPitchRef.current;
        if (Math.abs(pDiff) > 0.25) {
          smoothedPitchRef.current += pDiff * 0.24;
        }
      }

      if (smoothedRollRef.current === null) {
        smoothedRollRef.current = normRoll;
      } else {
        const rDiff = normRoll - smoothedRollRef.current;
        if (Math.abs(rDiff) > 0.3) {
          smoothedRollRef.current += rDiff * 0.24;
        }
      }

      const smoothH = Number(smoothedHeadingRef.current.toFixed(1));
      const smoothP = Number(smoothedPitchRef.current.toFixed(1));
      const smoothR = Number(smoothedRollRef.current.toFixed(1));

      setHeading(Math.round(smoothH));
      setPitch(Math.round(smoothP));
      setRoll(Math.round(smoothR));

      const now = Date.now();
      if (now - lastSendTime.current >= 50) {
        lastSendTime.current = now;
        sendOrientationData(smoothH, smoothP, smoothR);
      }
    };

    if (typeof window !== "undefined") {
      // On Android Chrome: deviceorientationabsolute gives true magnetic North.
      // deviceorientation on Android gives RELATIVE angles (not magnetic!) - so ONLY use it as fallback.
      // Both firing simultaneously causes the relative event to override the absolute one = WRONG direction.
      const supportsAbsolute = "ondeviceorientationabsolute" in window;
      if (supportsAbsolute) {
        // Android: use ONLY absolute, skip relative deviceorientation to avoid override
        window.addEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
      } else {
        // iOS/others: only relative deviceorientation available (iOS uses webkitCompassHeading for correction)
        (window as Window).addEventListener("deviceorientation", handleOrientation, true);
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        const supportsAbsolute = "ondeviceorientationabsolute" in window;
        if (supportsAbsolute) {
          window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener, true);
        } else {
          (window as Window).removeEventListener("deviceorientation", handleOrientation, true);
        }
      }
    };
  }, [manualMode, calibrationOffset, invertPitch, sightMode, sendOrientationData]);

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
    <main className="min-h-screen bg-[#02040a] text-white font-mono flex flex-col items-center justify-between p-4 sm:p-6 select-none overflow-x-hidden">
      {/* ── 1. HEADER BAR (NASA EDITORIAL OBSERVATORY STYLE) ── */}
      <header className="w-full max-w-md flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5 truncate">
          <div className="p-1.5 bg-black border border-zinc-800 text-cyan-400 shrink-0">
            <Smartphone className="h-4 w-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="truncate">
            <h1 className="font-extrabold text-xs text-white tracking-[0.16em] uppercase truncate">
              COSMOS AI // SIGHT SENSOR
            </h1>
            <div className="text-[10px] text-zinc-400 tracking-wider truncate">
              SESSION: <span className="text-cyan-400 font-bold">{displaySessionId}</span>
            </div>
          </div>
        </div>

        {/* Status Badge: TRANSMITTING label (no disconnect tab) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black border border-emerald-500/50 text-[10px] font-bold tracking-wider uppercase text-emerald-400 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span>TRANSMITTING</span>
        </div>
      </header>

      {/* ── 2. SIGHT VECTOR MODE SELECTOR (STARGAZE CARD STYLE) ── */}
      <div className="w-full max-w-md my-2 p-3 bg-black/90 border border-zinc-800 shadow-2xl backdrop-blur-md flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="text-cyan-400 font-bold tracking-wider flex items-center gap-1.5">
            <Navigation className="h-3 w-3" />
            <span>SIGHT VECTOR MODE</span>
          </span>
          <span className="px-1.5 py-0.5 border border-cyan-400/40 text-cyan-300 bg-cyan-950/40 text-[9px] uppercase font-bold">
            {sightMode}
          </span>
        </div>

        {/* Mode Selector Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 border border-zinc-850">
          <button
            onClick={() => setSightMode("auto")}
            className={`py-1.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
              sightMode === "auto"
                ? "bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Auto (Smart)
          </button>
          <button
            onClick={() => setSightMode("pointer")}
            className={`py-1.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
              sightMode === "pointer"
                ? "bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Point top edge of phone at stars / horizon"
          >
            Pointer (Top)
          </button>
          <button
            onClick={() => setSightMode("camera")}
            className={`py-1.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
              sightMode === "camera"
                ? "bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Aim back camera lens at the sky"
          >
            Camera (Lens)
          </button>
        </div>

        <div className="text-[10px] text-zinc-400 leading-relaxed pt-0.5 border-t border-zinc-900">
          {sightMode === "pointer"
            ? "Top Pointer: Aim the top edge of your phone directly at the sky or horizon like a laser pointer."
            : sightMode === "camera"
            ? "Camera Lens: Aim the back camera lens at stars and satellites like a telescope viewfinder."
            : "Smart Auto: Hold flat to view compass bearings; tilt upright to sight celestial objects."}
        </div>
      </div>

      {/* ── 3. CENTER FLOATING COMPASS HUD (EXACT STARGAZE COMPONENT DESIGN) ── */}
      <section className="my-3 flex flex-col items-center justify-center relative w-full max-w-md">
        {/* Main Circular Dial (matches Stargaze FloatingCompassHUD & Planisphere radar styling) */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-zinc-800 bg-black/95 backdrop-blur-md flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_25px_rgba(0,229,255,0.06)] overflow-hidden">
          {/* Outer Ring Border */}
          <div className="absolute inset-2 rounded-full border border-zinc-850" />
          {/* Mid Ring Border */}
          <div className="absolute inset-8 rounded-full border border-zinc-900" />
          {/* Inner Ring Border */}
          <div className="absolute inset-16 rounded-full border border-zinc-900/60" />

          {/* Hairline Crosshairs */}
          <div className="absolute inset-x-0 h-px bg-zinc-850/80" />
          <div className="absolute inset-y-0 w-px bg-zinc-850/80" />
          <div className="absolute w-full h-px bg-zinc-900/40 rotate-45" />
          <div className="absolute w-full h-px bg-zinc-900/40 -rotate-45" />

          {/* Rotating Compass Ring */}
          <div
            className="absolute inset-0 transition-transform duration-100 ease-out pointer-events-none"
            style={{ transform: `rotate(${-heading}deg)` }}
          >
            {/* Cardinal Markers */}
            {CARDINALS.map((c) => {
              const rad = (c.deg * Math.PI) / 180;
              const r = 104; // radius in px from center
              const x = Math.sin(rad) * r;
              const y = -Math.cos(rad) * r;
              const isNorth = c.label === "N";

              return (
                <div
                  key={c.label}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  <span
                    className={`font-mono text-center select-none ${
                      isNorth
                        ? "text-cyan-400 font-black text-xs drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                        : c.isMajor
                        ? "text-zinc-300 font-bold text-[10px]"
                        : "text-zinc-600 text-[8px]"
                    }`}
                  >
                    {c.label}
                  </span>
                  {isNorth && (
                    <div className="w-1 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_#00e5ff] mt-0.5" />
                  )}
                  {c.label === "S" && (
                    <div className="w-1 h-2 bg-emerald-400 rounded-full mt-0.5" />
                  )}
                </div>
              );
            })}

            {/* Subtle Azimuth Degree Ticks */}
            {TICKS.map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const r = 122;
              const x = Math.sin(rad) * r;
              const y = -Math.cos(rad) * r;
              const isCard = deg % 90 === 0;

              return (
                <div
                  key={`tick-${deg}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  <div
                    className={`rounded-full ${
                      isCard ? "w-1 h-1 bg-zinc-500" : "w-0.5 h-0.5 bg-zinc-800"
                    }`}
                  />
                </div>
              );
            })}

            {/* Vertical Line of Sight Beam */}
            <div className="w-px h-full bg-cyan-400/20 absolute left-1/2 -translate-x-1/2" />
          </div>

          {/* Center Observer Sight Reticle (Matches Stargaze FloatingCompassHUD Hub) */}
          <div className="z-10 flex flex-col items-center justify-center bg-black/95 px-5 py-4 rounded-full border border-zinc-750 shadow-2xl backdrop-blur-md">
            <Navigation className="h-4 w-4 text-cyan-400 mb-1 rotate-45 animate-pulse" />
            <div className="font-mono text-2xl font-black text-white tracking-tight leading-none">
              {heading}°
            </div>
            <div className="font-mono text-[9px] font-bold text-cyan-300 uppercase tracking-widest mt-1">
              {getCardinalText(heading)}
            </div>
            <div className="font-mono text-[8px] text-amber-400 uppercase tracking-wider mt-0.5 font-bold">
              {pitch}° EL {pitch === 0 ? "(HORIZON)" : pitch === 90 ? "(ZENITH)" : ""}
            </div>
          </div>
        </div>

        {/* ── 4. LIVE TELEMETRY HUD DATA GRID (NASA EDITORIAL METRICS) ── */}
        <div className="w-full grid grid-cols-4 gap-1.5 mt-3 font-mono">
          <div className="p-2 bg-black/90 border border-zinc-800 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">AZIMUTH</div>
            <div className="font-black text-cyan-400 text-sm mt-0.5">{heading}°</div>
          </div>
          <div className="p-2 bg-black/90 border border-zinc-800 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">PITCH</div>
            <div className="font-black text-amber-400 text-sm mt-0.5">{pitch}°</div>
          </div>
          <div className="p-2 bg-black/90 border border-zinc-800 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">ROLL</div>
            <div className="font-black text-purple-300 text-sm mt-0.5">{roll}°</div>
          </div>
          <div className="p-2 bg-black/90 border border-zinc-800 text-center">
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">PACKETS</div>
            <div className="font-black text-emerald-400 text-sm mt-0.5">{packetCount}</div>
          </div>
        </div>

        {/* ── 5. SENSOR SETTINGS & MANUAL OVERRIDE (STARGAZE NASA CONTROL PANEL) ── */}
        <div className="w-full mt-3 p-3 bg-black/90 border border-zinc-800 flex flex-col gap-2.5 font-mono">
          <div className="flex items-center justify-between text-[11px] text-zinc-300 pb-2 border-b border-zinc-850 flex-wrap gap-1">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs">
              <Sliders className="h-3.5 w-3.5 text-cyan-400" />
              <span>SENSOR SETTINGS</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setInvertPitch(!invertPitch)}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                  invertPitch
                    ? "border-amber-500 bg-amber-950/40 text-amber-300"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
                }`}
                title="Toggle if tilting top of phone up moves elevation down"
              >
                {invertPitch ? "PITCH: INVERTED" : "PITCH: NORMAL"}
              </button>

              <button
                onClick={() => setManualMode(!manualMode)}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                  manualMode
                    ? "border-cyan-400 bg-cyan-950/40 text-cyan-300"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
                }`}
              >
                {manualMode ? "MANUAL OVERRIDE" : "AUTO GYRO"}
              </button>
            </div>
          </div>

          {/* Azimuth Range Slider */}
          <div className="flex flex-col gap-1 text-[10px]">
            <div className="flex justify-between text-zinc-400 uppercase tracking-wider">
              <span>AZIMUTH (Heading)</span>
              <span className="text-cyan-400 font-bold">{heading}°</span>
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
              className="accent-cyan-400 w-full cursor-pointer h-1.5 rounded-none bg-zinc-850"
            />
          </div>

          {/* Elevation Range Slider */}
          <div className="flex flex-col gap-1 text-[10px]">
            <div className="flex justify-between text-zinc-400 uppercase tracking-wider">
              <span>ELEVATION (Pitch)</span>
              <span className="text-amber-400 font-bold">{pitch}°</span>
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
              className="accent-amber-400 w-full cursor-pointer h-1.5 rounded-none bg-zinc-850"
            />
          </div>

          {/* Calibration Offset Slider */}
          <div className="flex flex-col gap-1 text-[10px] border-t border-zinc-900 pt-2 mt-0.5">
            <div className="flex justify-between text-zinc-400 uppercase tracking-wider items-center">
              <span className="text-zinc-300">COMPASS CALIBRATION OFFSET</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalibrationOffset(0)}
                  className="text-[9px] px-1.5 py-0.2 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition"
                >
                  RESET (0°)
                </button>
                <span className="text-emerald-400 font-bold">
                  {calibrationOffset > 0 ? `+${calibrationOffset}` : calibrationOffset}°
                </span>
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={calibrationOffset}
              onChange={(e) => setCalibrationOffset(parseInt(e.target.value, 10))}
              className="accent-emerald-400 w-full cursor-pointer h-1.5 rounded-none bg-zinc-850"
            />
          </div>
        </div>
      </section>

      {/* ── 6. PERMISSION & STATUS FOOTER ── */}
      <footer className="w-full max-w-md flex flex-col items-center gap-2 mb-2 font-mono">
        {hasPermission !== true && (
          <button
            onClick={requestSensorPermission}
            className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs tracking-wider uppercase transition shadow-[0_0_25px_rgba(0,229,255,0.4)] flex items-center justify-center gap-2 border border-cyan-300 cursor-pointer"
          >
            <Compass className="h-4 w-4" />
            <span>ENABLE GYROSCOPE &amp; COMPASS SENSORS</span>
          </button>
        )}

        {hasPermission === true && (
          <div className="w-full p-2.5 bg-black border border-emerald-500/40 text-center text-xs text-emerald-300 flex items-center justify-center gap-2 shadow-inner uppercase tracking-wider font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Transmitting Live Telemetry to 3D Dome</span>
          </div>
        )}

        <div className="text-[10px] text-zinc-500 text-center flex items-center gap-1.5">
          {hasPermission === false ? (
            <span className="text-amber-400 flex items-center gap-1">
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
