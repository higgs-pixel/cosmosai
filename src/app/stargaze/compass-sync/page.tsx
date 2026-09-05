"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Compass, Smartphone, Radio, CheckCircle2, AlertCircle, Sliders, Eye, Navigation } from "lucide-react";
import { Vector3, Matrix4, MathUtils } from "three";

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

      {/* Stellarium AR Sight Banner */}
      <div className="w-full max-w-md my-2 p-3 rounded-2xl bg-slate-950/60 border border-white/[0.12] shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-2xl flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
          <Smartphone className="h-5 w-5 animate-pulse" />
        </div>
        <div className="text-[11px] font-mono leading-tight flex-1">
          <div className="font-extrabold text-cyan-300 tracking-wide flex items-center justify-between">
            <span>
              {sightMode === "pointer"
                ? "COMPASS POINTER MODE (TOP EDGE)"
                : sightMode === "camera"
                ? "BACK CAMERA LENS SIGHT"
                : "SMART AUTO (POINTER / CAMERA)"}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 uppercase font-bold">
              {sightMode}
            </span>
          </div>
          <div className="text-slate-300 text-[10px] mt-0.5">
            {sightMode === "pointer"
              ? "Aim top edge of phone at the sky or horizon like a laser pointer."
              : sightMode === "camera"
              ? "Aim back camera lens at the sky like a telescope viewfinder."
              : "Hold flat to read compass, tilt up to aim at satellites & stars."}
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

          {/* Sight Vector Mode Selector */}
          <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950/80 p-2 rounded-lg border border-cyan-500/30">
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              <span>SIGHT MODE:</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSightMode("auto")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  sightMode === "auto" ? "bg-cyan-500 text-slate-950 shadow-sm" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                Auto (Smart)
              </button>
              <button
                onClick={() => setSightMode("pointer")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  sightMode === "pointer" ? "bg-cyan-500 text-slate-950 shadow-sm" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
                title="Point top edge of phone at stars / horizon"
              >
                Pointer (Top)
              </button>
              <button
                onClick={() => setSightMode("camera")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  sightMode === "camera" ? "bg-cyan-500 text-slate-950 shadow-sm" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
                title="Aim back camera lens at the sky"
              >
                Camera (Lens)
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

          <div className="flex flex-col gap-1 text-[10px] font-mono border-t border-slate-800/80 pt-2 mt-1">
            <div className="flex justify-between text-slate-400">
              <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                <span>COMPASS CALIBRATION OFFSET</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalibrationOffset(0)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                >
                  RESET (0°)
                </button>
                <span className="text-cyan-400 font-bold">{calibrationOffset > 0 ? `+${calibrationOffset}` : calibrationOffset}°</span>
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={calibrationOffset}
              onChange={(e) => setCalibrationOffset(parseInt(e.target.value, 10))}
              className="accent-cyan-400 w-full cursor-pointer h-1.5 rounded-lg bg-slate-800"
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
