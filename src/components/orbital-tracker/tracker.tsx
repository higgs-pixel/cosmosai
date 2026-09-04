"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  Compass,
  Cpu,
  Globe,
  Loader2,
  Navigation,
  Orbit,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { propagateKeplerian, getOrbitGroundTrack, type OrbitState, type gpElements } from "@/lib/orbit/propagator";
import { WorldMap } from "./world-map";

interface SatConfig {
  id: number;
  name: string;
  category: "space-station" | "telescope" | "weather" | "debris" | "communication";
  description: string;
  icon: typeof Satellite;
}

const SATELLITES: SatConfig[] = [
  {
    id: 25544,
    name: "ISS (Zarya)",
    category: "space-station",
    description: "The International Space Station. First module launched in 1998, occupied continuously since 2000.",
    icon: Orbit,
  },
  {
    id: 48274,
    name: "Tiangong Space Station",
    category: "space-station",
    description: "China's permanent space station in low Earth orbit. Completed assembly in late 2022.",
    icon: Orbit,
  },
  {
    id: 20580,
    name: "Hubble Space Telescope",
    category: "telescope",
    description: "NASA/ESA Hubble observatory launched in 1990. Still unlocking secrets of the deep universe.",
    icon: Compass,
  },
  {
    id: 33591,
    name: "NOAA 19",
    category: "weather",
    description: "NASA/NOAA meteorological satellite monitoring Earth's atmosphere, clouds, and oceans.",
    icon: Globe,
  },
  {
    id: 27386,
    name: "Envisat",
    category: "debris",
    description: "ESA Earth observation satellite launched in 2002. Contact lost in 2012; now a massive space debris hazard.",
    icon: ShieldAlert,
  },
  {
    id: 44713,
    name: "Starlink-1007",
    category: "communication",
    description: "One of the early satellites in SpaceX's massive megaconstellation providing global internet access.",
    icon: Zap,
  },
];

export function Tracker() {
  const [selectedSatId, setSelectedSatId] = useState<number>(25544);
  const [gpData, setGpData] = useState<gpElements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<string>("miss");

  // Real-time calculated orbital state
  const [liveState, setLiveState] = useState<OrbitState | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const selectedSat = useMemo(
    () => SATELLITES.find((s) => s.id === selectedSatId)!,
    [selectedSatId]
  );

  // Fetch GP elements when selected satellite changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function loadElements() {
      try {
        const res = await fetch(`/api/orbit/tle?catnr=${selectedSatId}`);
        if (!res.ok) throw new Error("Failed to load elements payload.");
        
        const data = await res.json() as gpElements;
        if (!active) return;

        setGpData(data);
        setCacheStatus(res.headers.get("x-cosmos-cache") || "miss");
        setLoading(false);
      } catch (err) {
        if (!active) return;
        console.error(err);
        setError("Unable to establish orbital connection to satellite database.");
        setLoading(false);
      }
    }

    void loadElements();

    return () => {
      active = false;
    };
  }, [selectedSatId]);

  // Real-time propagation loop (refreshes calculation every 1000ms)
  useEffect(() => {
    if (!gpData) return;

    const updatePosition = () => {
      const now = Date.now();
      setCurrentTime(now);
      const state = propagateKeplerian(gpData, now);
      setLiveState(state);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 1000);

    return () => clearInterval(interval);
  }, [gpData]);

  // Generate ground-track trajectory points
  const groundTrackPoints = useMemo(() => {
    if (!gpData || !currentTime) return [];
    return getOrbitGroundTrack(gpData, currentTime);
  }, [gpData, currentTime]);

  return (
    <div className="space-y-6">
      {/* Upper Control Bar */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ai/24 bg-ai/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ai">
            <Activity className="h-3 w-3 animate-pulse" />
            Module PS-02 / Active
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-cosmos-white sm:text-3xl">
            Orbital Object Intelligence
          </h1>
          <p className="mt-1 text-sm text-cosmos-frost">
            Calculate and visualize real-time tracking data for LEO spacecraft using geodetic perturbation propagation.
          </p>
        </div>

        {/* Database Sync Status */}
        <div className="flex items-center gap-3 self-center rounded-[0.85rem] border border-white/8 bg-white/[0.02] px-4 py-2.5">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cosmos-slate">Database Status</p>
            <p className="text-xs font-semibold text-cosmos-white">
              {cacheStatus === "hit" ? "Cached / Synchronized" : cacheStatus === "fallback" ? "Offline Mode (Fallback)" : "Direct Sync"}
            </p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div
            className={`grid h-8 w-8 place-items-center rounded-lg border ${
              cacheStatus === "fallback" ? "border-amber-400/22 bg-amber-400/10 text-amber-300" : "border-emerald-400/22 bg-emerald-400/10 text-emerald-300"
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </div>
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        
        {/* Left column: Spacecraft selector list */}
        <div className="space-y-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-cosmos-mist">
            Spacecraft Catalog
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {SATELLITES.map((sat) => {
              const Icon = sat.icon;
              const isSelected = selectedSatId === sat.id;
              return (
                <button
                  key={sat.id}
                  type="button"
                  onClick={() => setSelectedSatId(sat.id)}
                  disabled={loading && !isSelected}
                  className={`group flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition ${
                    isSelected
                      ? "border-ai/35 bg-ai/10 text-cosmos-white shadow-[0_0_15px_rgba(103,232,249,0.06)]"
                      : "border-white/5 bg-white/[0.02] text-cosmos-frost hover:border-white/12 hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-lg border transition ${
                      isSelected ? "border-ai/30 bg-ai/14 text-ai" : "border-white/8 bg-white/4 text-cosmos-mist group-hover:text-cosmos-frost"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-none tracking-normal">
                      {sat.name}
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-cosmos-slate uppercase tracking-wider">
                      NORAD ID: {sat.id}
                    </p>
                    <p className="mt-2 text-[11px] leading-4 text-cosmos-mist line-clamp-2">
                      {sat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Map and telemetry panel */}
        <div className="space-y-6">
          {error ? (
            <div className="rounded-[1rem] border border-rose-500/22 bg-rose-500/8 p-5 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-rose-300" />
              <h3 className="mt-3 text-sm font-bold text-rose-300">Space Telemetry Link Failure</h3>
              <p className="mt-2 text-xs text-rose-400">{error}</p>
            </div>
          ) : loading || !liveState ? (
            <div className="grid min-h-[400px] place-items-center rounded-[1rem] border border-white/8 bg-white/[0.02]">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-ai" />
                <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-ai">
                  Connecting to Orbital Telemetry
                </p>
                <p className="mt-2 text-xs text-cosmos-mist">
                  Calculating trajectory and downloading orbital parameters...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Ground-Track Tracking Map */}
              <WorldMap
                latitude={liveState.latitude}
                longitude={liveState.longitude}
                groundTrack={groundTrackPoints}
                satelliteName={selectedSat.name}
              />

              {/* Real-time Telemetry Data Cards */}
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                
                {/* Latitude Card */}
                <div className="glass-card rounded-xl p-3.5 border-white/8">
                  <div className="flex items-center justify-between text-cosmos-slate">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Latitude</span>
                    <Navigation className="h-3.5 w-3.5 rotate-45 text-ai/60" />
                  </div>
                  <p className="mt-2 font-mono text-xl font-bold tracking-tight text-cosmos-white">
                    {liveState.latitude.toFixed(5)}°
                  </p>
                  <p className="mt-1 text-[10px] text-cosmos-mist font-semibold">
                    {liveState.latitude >= 0 ? "NORTH" : "SOUTH"} BOUND
                  </p>
                </div>

                {/* Longitude Card */}
                <div className="glass-card rounded-xl p-3.5 border-white/8">
                  <div className="flex items-center justify-between text-cosmos-slate">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Longitude</span>
                    <Navigation className="h-3.5 w-3.5 rotate-90 text-ai/60" />
                  </div>
                  <p className="mt-2 font-mono text-xl font-bold tracking-tight text-cosmos-white">
                    {liveState.longitude.toFixed(5)}°
                  </p>
                  <p className="mt-1 text-[10px] text-cosmos-mist font-semibold">
                    {liveState.longitude >= 0 ? "EAST" : "WEST"} BOUND
                  </p>
                </div>

                {/* Altitude Card */}
                <div className="glass-card rounded-xl p-3.5 border-white/8">
                  <div className="flex items-center justify-between text-cosmos-slate">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Altitude</span>
                    <Orbit className="h-3.5 w-3.5 text-ai/60" />
                  </div>
                  <p className="mt-2 font-mono text-xl font-bold tracking-tight text-cosmos-white">
                    {liveState.altitudeKm.toFixed(2)} km
                  </p>
                  <p className="mt-1 text-[10px] text-cosmos-mist font-semibold">
                    ABOVE SEA LEVEL
                  </p>
                </div>

                {/* Speed Card */}
                <div className="glass-card rounded-xl p-3.5 border-white/8">
                  <div className="flex items-center justify-between text-cosmos-slate">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Velocity</span>
                    <Cpu className="h-3.5 w-3.5 text-ai/60" />
                  </div>
                  <p className="mt-2 font-mono text-xl font-bold tracking-tight text-cosmos-white">
                    {Math.round(liveState.velocityKmh).toLocaleString("en-US")} km/h
                  </p>
                  <p className="mt-1 text-[10px] text-cosmos-mist font-semibold">
                    ~{(liveState.velocityKmh / 3600).toFixed(2)} km/s ORBITAL
                  </p>
                </div>
              </div>

              {/* Core Orbital Parameters / Elements Panel */}
              <div className="glass-panel rounded-2xl border-white/10 p-5">
                <div className="flex items-center gap-2 border-b border-white/8 pb-3">
                  <Orbit className="h-4.5 w-4.5 text-ai" />
                  <h3 className="font-semibold text-cosmos-white">Keplerian Orbital Elements</h3>
                </div>

                <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                  
                  {/* Inclination */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Inclination</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{liveState.inclinationDeg.toFixed(4)}°</span>
                  </div>

                  {/* Eccentricity */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Eccentricity</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{liveState.eccentricity.toFixed(7)}</span>
                  </div>

                  {/* Orbital Period */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Orbital Period</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{liveState.periodMin.toFixed(2)} min</span>
                  </div>

                  {/* Semi-major Axis */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Semi-major Axis</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{liveState.semiMajorAxisKm.toFixed(2)} km</span>
                  </div>

                  {/* Apogee */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Apogee Altitude</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{liveState.apogeeKm.toFixed(2)} km</span>
                  </div>

                  {/* Perigee */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Perigee Altitude</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{liveState.perigeeKm.toFixed(2)} km</span>
                  </div>

                  {/* Object ID */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Int. Designator</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{gpData?.OBJECT_ID}</span>
                  </div>

                  {/* Mean Motion */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Mean Motion</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{gpData?.MEAN_MOTION.toFixed(8)} rev/day</span>
                  </div>

                  {/* Mean Anomaly */}
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-cosmos-slate">Mean Anomaly</span>
                    <span className="font-mono font-semibold text-cosmos-frost">{gpData?.MEAN_ANOMALY.toFixed(4)}°</span>
                  </div>
                </div>

                {/* Metadata card footer */}
                <div className="mt-4 rounded-lg bg-white/[0.02] p-3 text-[11px] leading-5 text-cosmos-mist">
                  <span className="font-bold text-cosmos-slate">Epoch Time:</span> {gpData?.EPOCH} UTC
                  <br />
                  <span className="font-bold text-cosmos-slate">Source Provenance:</span> Celestrak NORAD General Perturbation Element Set (updated daily)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
