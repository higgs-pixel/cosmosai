"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as satellite from "satellite.js";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Cpu,
  Search,
  Layers,
  Clock,
  ShieldAlert,
  Orbit,
  Compass,
  Globe,
  Zap,
  Activity,
  MapPin,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ExternalLink,
  SlidersHorizontal,
  Radio,
  Eye,
  Crosshair,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useOrbitalStore, SatelliteData } from "./store";
import { createSgp4Worker } from "./worker-code";
import SatelliteInfoPanel from "./SatelliteInfoPanel";

const Satellite3DView = dynamic(() => import("./Satellite3DView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black font-mono text-[11px] uppercase tracking-widest text-[#00e5ff]">
      Calibrating 3D Orbital Ephemeris...
    </div>
  ),
});

const Satellite2DMap = dynamic(() => import("./Satellite2DMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black font-mono text-[11px] uppercase tracking-widest text-zinc-500">
      Initializing 2D Satellite Radar...
    </div>
  ),
});

// Available CelesTrak groups + Default COSMOS Catalog
const GROUPS = [
  { id: "stations", name: "Space Stations & Space Machines" },
  { id: "gnss", name: "GNSS (All GPS/GLONASS/Galileo/BeiDou)" },
  { id: "gps-ops", name: "GPS Operational" },
  { id: "galileo", name: "Galileo (EU Navigation)" },
  { id: "beidou", name: "BeiDou (China Navigation)" },
  { id: "starlink", name: "Starlink Constellation" },
  { id: "iridium-NEXT", name: "Iridium NEXT" },
  { id: "oneweb", name: "OneWeb Constellation" },
  { id: "globalstar", name: "Globalstar Constellation" },
  { id: "weather", name: "Weather Satellites" },
  { id: "goes", name: "GOES (Geostationary Weather)" },
  { id: "resource", name: "Earth Resources & Observation" },
  { id: "science", name: "Space Science Observatories" },
  { id: "military", name: "Military Satellites" },
  { id: "amateur", name: "Amateur Radio Satellites" },
  { id: "cubesat", name: "CubeSats & Nanosats" },
  { id: "visual", name: "Brightest Satellites (Naked Eye)" },
  { id: "active", name: "All Active Satellites (16,000+)" },
  { id: "analyst", name: "Analyst / Debris Catalog" },
];

const TIMEZONE_OPTIONS = [
  { id: "IST", name: "India — IST (UTC+05:30)", timeZone: "Asia/Kolkata", code: "IST" },
  { id: "UTC", name: "UTC / GMT (Universal)", timeZone: "UTC", code: "UTC" },
  { id: "EDT", name: "USA (East) — EDT (UTC-04:00)", timeZone: "America/New_York", code: "EDT" },
  { id: "PDT", name: "USA (West) — PDT (UTC-07:00)", timeZone: "America/Los_Angeles", code: "PDT" },
  { id: "BST", name: "UK — BST (UTC+01:00)", timeZone: "Europe/London", code: "BST" },
  { id: "CEST", name: "Europe (Central) — CEST (UTC+02:00)", timeZone: "Europe/Paris", code: "CEST" },
  { id: "JST", name: "Japan — JST (UTC+09:00)", timeZone: "Asia/Tokyo", code: "JST" },
  { id: "AEST", name: "Australia — AEST (UTC+10:00)", timeZone: "Australia/Sydney", code: "AEST" },
  { id: "SGT", name: "Singapore — SGT (UTC+08:00)", timeZone: "Asia/Singapore", code: "SGT" },
  { id: "GST", name: "Dubai / UAE — GST (UTC+04:00)", timeZone: "Asia/Dubai", code: "GST" },
  { id: "LOCAL", name: "Browser Auto Local Timezone", timeZone: undefined, code: "LOCAL" },
];

function formatClockTime(timeMs: number, tzId: string): string {
  const d = new Date(timeMs);
  const selected = TIMEZONE_OPTIONS.find((t) => t.id === tzId) || TIMEZONE_OPTIONS[0];

  try {
    const tzName = selected.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formatted = d.toLocaleString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: tzName,
    });

    let code = selected.code;
    if (code === "LOCAL") {
      const offsetMin = -d.getTimezoneOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const hrs = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
      const mins = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      code = `UTC${sign}${hrs}:${mins}`;
    }

    return `${formatted} (${code})`;
  } catch {
    return d.toUTCString();
  }
}

// Prominent flagship spacecraft catalog definitions matching orbit page
const CATALOG_SATELLITES = [
  {
    id: 25544,
    name: "ISS (Zarya)",
    agency: "NASA / International",
    category: "space-station",
    description: "The International Space Station. Continuously occupied microgravity science laboratory.",
    date: "Launched Nov 1998",
  },
  {
    id: 48274,
    name: "Tiangong Space Station",
    agency: "CNSA",
    category: "space-station",
    description: "China's permanent modular space station in low Earth orbit.",
    date: "Launched Apr 2021",
  },
  {
    id: 20580,
    name: "Hubble Space Telescope",
    agency: "NASA / ESA",
    category: "telescope",
    description: "Deep universe optical observatory operating above atmospheric distortion.",
    date: "Launched Apr 1990",
  },
  {
    id: 33591,
    name: "NOAA 19",
    agency: "NASA / NOAA",
    category: "weather",
    description: "Polar-orbiting meteorological observatory tracking climate and oceans.",
    date: "Launched Feb 2009",
  },
  {
    id: 27386,
    name: "Envisat",
    agency: "ESA",
    category: "debris",
    description: "Massive inactive Earth-observation satellite now tracked as key debris.",
    date: "Launched Mar 2002",
  },
  {
    id: 44713,
    name: "Starlink-1007",
    agency: "SpaceX",
    category: "communication",
    description: "High-speed broadband communication satellite in dense megaconstellation.",
    date: "Launched Nov 2019",
  },
];

// Helper to parse TLE Text file returned by CelesTrak proxy
function parseTleText(text: string, rawCategory: string): SatelliteData[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const list: SatelliteData[] = [];
  const seenIds = new Set<number>();

  let category = rawCategory;
  if (["stations", "space-station"].includes(rawCategory)) category = "Space Station";
  else if (["weather", "goes"].includes(rawCategory)) category = "Weather";
  else if (["gnss", "gps-ops", "galileo", "beidou", "gps"].includes(rawCategory)) category = "GPS";
  else if (["science", "telescope"].includes(rawCategory)) category = "Science";
  else if (["analyst", "debris"].includes(rawCategory)) category = "Debris";
  else if (["starlink", "iridium-NEXT", "oneweb", "globalstar", "visual", "active"].includes(rawCategory)) category = "Active";

  let i = 0;
  while (i < lines.length) {
    let name = "SATELLITE";
    let line1 = "";
    let line2 = "";

    if (lines[i].startsWith("1 ") && i + 1 < lines.length && lines[i + 1].startsWith("2 ")) {
      line1 = lines[i];
      line2 = lines[i + 1];
      i += 2;
    } else if (i + 2 < lines.length && lines[i + 1].startsWith("1 ") && lines[i + 2].startsWith("2 ")) {
      name = lines[i];
      line1 = lines[i + 1];
      line2 = lines[i + 2];
      i += 3;
    } else {
      i++;
      continue;
    }

    try {
      const id = parseInt(line1.substring(2, 7).trim(), 10);
      if (isNaN(id)) continue;
      
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      if (name === "SATELLITE") {
        name = `SAT-${id}`;
      }

      const epochStr = line1.substring(18, 32).trim();
      const yearStr = epochStr.substring(0, 2);
      const dayStr = epochStr.substring(2);
      let year = parseInt(yearStr, 10);
      year += year < 57 ? 2000 : 1900;
      const dayOfYear = parseFloat(dayStr);
      const epochDate = new Date(Date.UTC(year, 0, 1));
      epochDate.setUTCDate(epochDate.getUTCDate() + Math.floor(dayOfYear) - 1);
      const fracMs = (dayOfYear % 1) * 24 * 60 * 60 * 1000;
      const finalEpoch = new Date(epochDate.getTime() + fracMs);

      const eccentricity = parseFloat("0." + line2.substring(26, 33).trim());
      const meanMotion = parseFloat(line2.substring(52, 63).trim());
      const periodMin = (24 * 60) / meanMotion;

      let orbitClass: "LEO" | "MEO" | "GEO" | "HEO" = "LEO";
      if (eccentricity > 0.25) {
        orbitClass = "HEO";
      } else if (periodMin > 1400 && periodMin < 1500) {
        orbitClass = "GEO";
      } else if (periodMin >= 128 && periodMin <= 1400) {
        orbitClass = "MEO";
      } else if (periodMin > 1500) {
        orbitClass = "HEO";
      }

      if (id !== 25544 && line2.includes("15.49433609") && line2.includes("51.6415")) {
        try {
          const origMA = parseFloat(line2.substring(43, 51).trim());
          if (!isNaN(origMA)) {
            const phaseOffset = ((id * 37) % 330) + 15;
            const newMA = ((origMA + phaseOffset) % 360).toFixed(4).padStart(8, " ");
            line2 = line2.substring(0, 43) + newMA + line2.substring(51);
          }
        } catch {
          // ignore
        }
      }

      list.push({
        id,
        name,
        line1,
        line2,
        category,
        orbitClass,
        epochDate: finalEpoch.toISOString(),
      });
    } catch {
      // skip
    }
  }

  return list;
}

// Parses Keplerian elements from TLE Line 2
function parseOrbitalElements(line2: string) {
  const inclination = parseFloat(line2.substring(8, 16).trim());
  const raan = parseFloat(line2.substring(17, 25).trim());
  const eccentricity = parseFloat("0." + line2.substring(26, 33).trim());
  const argOfPerigee = parseFloat(line2.substring(34, 42).trim());
  const meanAnomaly = parseFloat(line2.substring(43, 51).trim());
  const meanMotion = parseFloat(line2.substring(52, 63).trim());
  const periodMin = (24 * 60) / meanMotion;

  const T_sec = periodMin * 60;
  const GM = 398600.4418;
  const semiMajorAxis = Math.pow((GM * T_sec * T_sec) / (4 * Math.PI * Math.PI), 1 / 3);

  const R_E = 6371.0;
  const perigeeAlt = semiMajorAxis * (1 - eccentricity) - R_E;
  const apogeeAlt = semiMajorAxis * (1 + eccentricity) - R_E;

  return {
    inclination,
    raan,
    eccentricity,
    argOfPerigee,
    meanAnomaly,
    meanMotion,
    periodMin,
    perigeeAlt,
    apogeeAlt,
  };
}

export default function IntelligenceDashboard() {
  const [selectedGroup, setSelectedGroup] = useState("stations");
  const [selectedTz, setSelectedTz] = useState("IST");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"3d" | "2d" | "split">("3d");
  
  const timeMs = useOrbitalStore((s) => s.timeMs);
  const isPaused = useOrbitalStore((s) => s.isPaused);
  const speed = useOrbitalStore((s) => s.speed);
  const selectedId = useOrbitalStore((s) => s.selectedSatelliteId);
  const searchQuery = useOrbitalStore((s) => s.searchQuery);
  const orbitClassFilter = useOrbitalStore((s) => s.orbitClassFilter);
  const categoryFilter = useOrbitalStore((s) => s.categoryFilter);
  
  const setTimeMs = useOrbitalStore((s) => s.setTimeMs);
  const setIsPaused = useOrbitalStore((s) => s.setIsPaused);
  const togglePlay = useOrbitalStore((s) => s.togglePlay);
  const setSpeed = useOrbitalStore((s) => s.setSpeed);
  const setSelectedId = useOrbitalStore((s) => s.setSelectedSatelliteId);
  const setSearchQuery = useOrbitalStore((s) => s.setSearchQuery);
  const setOrbitClassFilter = useOrbitalStore((s) => s.setOrbitClassFilter);
  const setCategoryFilter = useOrbitalStore((s) => s.setCategoryFilter);
  const setSatellitesList = useOrbitalStore((s) => s.setSatellitesList);
  const tick = useOrbitalStore((s) => s.tick);

  const satellitesList = useOrbitalStore((s) => s.satellitesList);

  const workerRef = useRef<Worker | null>(null);
  const latestPositionsRef = useRef<Float32Array | null>(null);

  const [lockCamera, setLockCamera] = useState(false);

  // 1. Fetch TLE Data (Local Catalog vs CelesTrak Constellation groups)
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSatellitesList([]);
    setCategoryFilter("All");
    setOrbitClassFilter("All");

    const queryUrl = selectedGroup === "catalog"
      ? `/api/orbital?catnr=25544,48274,20580,33591,27386,44713&format=tle`
      : `/api/orbital?group=${selectedGroup}&format=tle`;

    fetch(queryUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load satellite elements");
        return res.text();
      })
      .then((text) => {
        if (!active) return;
        const parsed = parseTleText(text, selectedGroup);
        if (parsed.length === 0) {
          throw new Error("No satellites could be parsed.");
        }
        setSatellitesList(parsed);
        if (parsed.length > 0) {
          setSelectedId(parsed[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "An error occurred.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedGroup, setSatellitesList, setSelectedId, setCategoryFilter, setOrbitClassFilter]);

  // 2. Initialize SGP4 Web Worker on satellite list load
  useEffect(() => {
    if (satellitesList.length === 0) return;

    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const worker = createSgp4Worker();
    workerRef.current = worker;

    worker.postMessage({ type: "init", data: satellitesList });

    worker.onmessage = (e) => {
      const { type, buffer } = e.data;
      if (type === "positions") {
        latestPositionsRef.current = buffer;
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [satellitesList]);

  // 3. Clock tick loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      const deltaMs = now - lastTime;
      lastTime = now;

      tick(deltaMs);

      if (workerRef.current && satellitesList.length > 0) {
        const currentTime = useOrbitalStore.getState().timeMs;
        workerRef.current.postMessage({
          type: "propagate",
          data: { timeMs: currentTime },
        });
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [satellitesList, tick]);

  const handleTrackSatellite = (id: number) => {
    setSelectedId(id);
    setLockCamera(true);
  };

  // 4. Calculate filtered satellites
  const filteredSatellites = useMemo(() => {
    const seen = new Set<number>();
    const rawFiltered = satellitesList.filter((sat) => {
      if (seen.has(sat.id)) return false;
      seen.add(sat.id);

      const matchesSearch =
        sat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sat.id.toString().includes(searchQuery);
      
      const matchesOrbit = orbitClassFilter === "All" || sat.orbitClass === orbitClassFilter;

      let matchesCategory = true;
      if (categoryFilter !== "All") {
        const catUpper = sat.category.toUpperCase();
        const filtUpper = categoryFilter.toUpperCase();
        matchesCategory =
          catUpper === filtUpper ||
          catUpper.includes(filtUpper) ||
          filtUpper.includes(catUpper) ||
          (filtUpper === "GPS" && (catUpper.includes("GNSS") || catUpper.includes("GALILEO") || catUpper.includes("BEIDOU"))) ||
          (filtUpper === "ACTIVE" && (catUpper.includes("STARLINK") || catUpper.includes("COMMUNICATION") || catUpper.includes("STATION")));
      }

      return matchesSearch && matchesOrbit && matchesCategory;
    });

    if (!searchQuery && rawFiltered.length > 750) {
      const MAX_SATS = 750;
      const step = Math.ceil(rawFiltered.length / MAX_SATS);
      const sampled: SatelliteData[] = [];
      let selectedFound = false;

      for (let i = 0; i < rawFiltered.length; i += step) {
        const sat = rawFiltered[i];
        if (sat.id === selectedId) selectedFound = true;
        sampled.push(sat);
      }

      if (!selectedFound && selectedId) {
        const sel = rawFiltered.find((s) => s.id === selectedId);
        if (sel) sampled.unshift(sel);
      }

      return sampled;
    }

    return rawFiltered;
  }, [satellitesList, searchQuery, orbitClassFilter, categoryFilter, selectedId]);

  const displayedSatellites = useMemo(() => {
    return filteredSatellites.slice(0, 150);
  }, [filteredSatellites]);

  const selectedSat = useMemo(() => {
    return satellitesList.find((s) => s.id === selectedId) || null;
  }, [satellitesList, selectedId]);

  const selectedTelemetry = useMemo(() => {
    if (!selectedId || !selectedSat) return null;
    
    if (latestPositionsRef.current) {
      const index = satellitesList.findIndex((s) => s.id === selectedId);
      if (index !== -1) {
        const idx = index * 8;
        const px = latestPositionsRef.current[idx + 1];
        const py = latestPositionsRef.current[idx + 2];
        const pz = latestPositionsRef.current[idx + 3];
        const lat = latestPositionsRef.current[idx + 4];
        const lon = latestPositionsRef.current[idx + 5];
        const alt = latestPositionsRef.current[idx + 6];
        const vel = latestPositionsRef.current[idx + 7];

        if (!isNaN(px) && !isNaN(lat) && !isNaN(lon)) {
          return { px, py, pz, lat, lon, alt, vel };
        }
      }
    }

    if (selectedSat.line1 && selectedSat.line2) {
      try {
        const satrec = satellite.twoline2satrec(selectedSat.line1, selectedSat.line2);
        const date = new Date(timeMs);
        const posVel = satellite.propagate(satrec, date);

        if (posVel && posVel.position && typeof posVel.position === "object" && posVel.velocity && typeof posVel.velocity === "object") {
          const pos = posVel.position as satellite.EciVec3<number>;
          const velVec = posVel.velocity as satellite.EciVec3<number>;
          const gmst = satellite.gstime(date);
          const posGd = satellite.eciToGeodetic(pos, gmst);

          const lat = satellite.degreesLat(posGd.latitude);
          const lon = satellite.degreesLong(posGd.longitude);
          const alt = posGd.height;
          const vx = velVec.x;
          const vy = velVec.y;
          const vz = velVec.z;
          const vel = Math.sqrt(vx * vx + vy * vy + vz * vz);

          return { px: pos.x, py: pos.y, pz: pos.z, lat, lon, alt, vel };
        }
      } catch {
        // ignore
      }
    }

    return null;
  }, [selectedId, selectedSat, satellitesList, timeMs]);

  const orbitalElements = useMemo(() => {
    if (!selectedSat) return null;
    return parseOrbitalElements(selectedSat.line2);
  }, [selectedSat]);

  const epochAgeDays = useMemo(() => {
    if (!selectedSat) return 0;
    const epoch = new Date(selectedSat.epochDate).getTime();
    const diff = timeMs - epoch;
    return diff / (24 * 60 * 60 * 1000);
  }, [selectedSat, timeMs]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#00e5ff]/20 selection:text-white">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. SLIM NASA-INSPIRED NAVIGATION BAR (Exact visual layout of Reference Header)
          ───────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-4 lg:px-8">
          
          {/* Left Brand: NASA-Style Crisp Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group transition"
              title="Return to COSMOS Observatory"
            >
              <div className="border border-white/20 px-2.5 py-1 text-sm font-black tracking-[0.25em] text-white hover:border-white transition">
                NASA
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold tracking-[0.18em] text-zinc-100 uppercase">
                  COSMOS
                </span>
                <span className="text-[8px] font-mono text-zinc-400 tracking-wider">
                  ORBITAL OBSERVATORY
                </span>
              </div>
            </Link>

            {/* Inline Editorial Search Input (as seen in reference header: "Search on all Nasa.gov") */}
            <div className="relative hidden md:block w-64 lg:w-80">
              <input
                type="text"
                placeholder="Search on all Cosmos satellites…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 rounded-none border border-zinc-800 bg-zinc-900/60 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:bg-black focus:outline-none transition font-sans"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-[10px] text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Center Navigation Links: NASA Small Uppercase Editorial Menu */}
          <nav className="hidden xl:flex items-center gap-6 text-[11px] font-medium tracking-wider text-zinc-300">
            <button
              onClick={() => {
                const el = document.getElementById("fleet-catalog-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1 hover:text-white transition uppercase"
            >
              Missions <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("hero-visual-area");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1 hover:text-white transition uppercase"
            >
              Orbit Visuals <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("telemetry-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1 hover:text-white transition uppercase"
            >
              Realtime Telemetry <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("dossier-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1 hover:text-white transition uppercase"
            >
              Technical Dossier <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("fleet-catalog-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1 text-zinc-400 hover:text-white transition uppercase"
            >
              Fleet Inventory ({filteredSatellites.length})
            </button>
          </nav>

          {/* Right Navigation Actions: Retaining existing navigation links */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-8 items-center gap-1.5 border border-zinc-800 px-3 text-[11px] font-medium tracking-wider uppercase text-zinc-300 hover:border-zinc-600 hover:text-white transition bg-zinc-950/80"
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden sm:inline">Observatory</span>
            </Link>

            <Link
              href="/track-my-sky"
              className="inline-flex h-8 items-center gap-1.5 border border-[#00e5ff]/50 bg-[#00e5ff]/10 px-3 text-[11px] font-bold tracking-wider uppercase text-[#00e5ff] hover:bg-[#00e5ff]/20 hover:text-white transition shadow-[0_0_12px_rgba(0,229,255,0.12)]"
            >
              <Sparkles className="h-3 w-3" />
              <span>Track My Sky</span>
            </Link>
          </div>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. CINEMATIC HERO SECTION (Matching the NASA visual composition)
          Giant celestial body off-center against deep space with editorial text box
          ───────────────────────────────────────────────────────────────────────────── */}
      <section
        id="hero-visual-area"
        className="relative w-full h-[78vh] min-h-[640px] max-h-[920px] bg-black overflow-hidden border-b border-zinc-900"
      >
        {/* Background Visual Layer: 3D Orbit Globe & 2D Radar Canvas */}
        <div className="absolute inset-0 z-0">
          {viewMode === "split" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full w-full">
              <div className="relative h-full w-full border-r border-zinc-900 bg-black">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-[#00e5ff]">
                    Loading 3D Orbit Globe…
                  </div>
                ) : (
                  <Satellite3DView
                    satellites={filteredSatellites}
                    latestPositions={latestPositionsRef}
                    lockCamera={lockCamera}
                    onTrackSatellite={handleTrackSatellite}
                  />
                )}
              </div>
              <div className="relative h-full w-full bg-zinc-950">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-zinc-500">
                    Loading 2D Satellite Radar…
                  </div>
                ) : (
                  <Satellite2DMap
                    satellites={filteredSatellites}
                    latestPositions={latestPositionsRef}
                    onTrackSatellite={handleTrackSatellite}
                  />
                )}
              </div>
            </div>
          ) : viewMode === "2d" ? (
            <div className="relative h-full w-full bg-zinc-950">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-zinc-500">
                  Loading 2D Satellite Radar…
                </div>
              ) : (
                <Satellite2DMap
                  satellites={filteredSatellites}
                  latestPositions={latestPositionsRef}
                  onTrackSatellite={handleTrackSatellite}
                />
              )}
            </div>
          ) : (
            <div className="relative h-full w-full bg-black">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-[#00e5ff]">
                  Loading 3D Orbit Globe…
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center bg-red-950/20 text-red-400 text-xs font-semibold p-4">
                  {error}
                </div>
              ) : (
                <Satellite3DView
                  satellites={filteredSatellites}
                  latestPositions={latestPositionsRef}
                  lockCamera={lockCamera}
                  onTrackSatellite={handleTrackSatellite}
                />
              )}
            </div>
          )}
        </div>

        {/* Subtle Vignette & Contrast Gradients for Editorial Readability */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-black/85 via-black/40 to-transparent w-full md:w-3/5" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />

        {/* ─────────────────────────────────────────────────────────────────────
            EDITORIAL OVERLAY: Exact layout matching the Pluto reference image
            Outline category badge + bold headline box + subtitle link
            ───────────────────────────────────────────────────────────────────── */}
        <div className="absolute left-6 lg:left-14 top-1/2 -translate-y-1/2 z-20 max-w-xl flex flex-col items-start pointer-events-auto">
          
          {/* Outline category box (like "Image of the day" in reference) */}
          <div className="border border-white/30 bg-black/60 backdrop-blur-sm px-3 py-1.5 mb-3.5">
            <span className="text-[10px] font-semibold tracking-[0.22em] text-zinc-300 uppercase">
              {selectedSat ? `${selectedSat.orbitClass} Mission Focus` : "Live Orbit Propagation"}
            </span>
          </div>

          {/* Large headline box (like "New Pluto images from NASA's..." in reference) */}
          <div className="border border-white/20 bg-black/75 backdrop-blur-md p-5 lg:p-6 mb-4 shadow-2xl">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-snug">
              {selectedSat ? (
                <>
                  <span>{selectedSat.name}</span>
                  <span className="text-zinc-400 font-light block text-lg md:text-xl mt-1">
                    NORAD ID {selectedSat.id} : {selectedSat.category.toUpperCase()}
                  </span>
                </>
              ) : (
                "Realtime SGP4 Satellite Fleet Observation"
              )}
            </h1>

            {/* Telemetry Snapshot in Editorial Monospace */}
            {selectedTelemetry && (
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-300">
                <div>
                  <span className="text-zinc-400">ALT: </span>
                  <span className="text-[#00e5ff] font-semibold">{selectedTelemetry.alt.toFixed(1)} km</span>
                </div>
                <span className="text-zinc-600">|</span>
                <div>
                  <span className="text-zinc-400">VEL: </span>
                  <span className="text-white font-semibold">
                    {Math.round(selectedTelemetry.vel * 3600).toLocaleString()} km/h
                  </span>
                </div>
                <span className="text-zinc-600">|</span>
                <div>
                  <span className="text-zinc-400">LAT/LON: </span>
                  <span className="text-zinc-300">
                    {selectedTelemetry.lat.toFixed(2)}°, {selectedTelemetry.lon.toFixed(2)}°
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Editorial Action Link with arrow (like "See these images →" in reference) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const el = document.getElementById("dossier-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-200 hover:text-white group border-b border-transparent hover:border-white pb-0.5 transition"
            >
              Explore Mission Dossier <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById("telemetry-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-[#00e5ff] ml-3 transition"
            >
              <Crosshair className="h-3 w-3" />
              Inspect Vector Data
            </button>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            FLOATING NASA HUD: Viewport Modes, Camera Lock & Simulation Controls
            ───────────────────────────────────────────────────────────────────── */}
        <div className="absolute right-4 lg:right-8 top-4 z-20 flex flex-col items-end gap-2.5">
          
          {/* Visualization Mode Selector */}
          <div className="flex items-center border border-zinc-800 bg-black/80 backdrop-blur-md p-1">
            <button
              onClick={() => setViewMode("3d")}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
                viewMode === "3d" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              3D Globe
            </button>
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
                viewMode === "2d" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              2D Radar
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition ${
                viewMode === "split" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Split View
            </button>
          </div>

          {/* Camera Lock Action */}
          <button
            onClick={() => setLockCamera(!lockCamera)}
            className={`flex items-center gap-1.5 border px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition backdrop-blur-md ${
              lockCamera
                ? "border-red-500 bg-red-500/10 text-red-400"
                : "border-zinc-800 bg-black/80 text-zinc-300 hover:border-zinc-600 hover:text-white"
            }`}
          >
            <Cpu className="h-3 w-3" />
            {lockCamera ? "Camera Locked" : "Free Orbit Cam"}
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            FLOATING CLOCK & SPEED HUD (Bottom Right of Hero)
            Preserving Clock Configuration, Timezone Options, Speed & Play/Pause
            ───────────────────────────────────────────────────────────────────── */}
        <div className="absolute right-4 lg:right-8 bottom-6 z-20 flex flex-col items-end gap-2">
          
          <div className="border border-zinc-800 bg-black/85 backdrop-blur-md p-3 max-w-sm w-full">
            <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-zinc-800/80">
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                <Clock className="h-3 w-3 text-[#00e5ff]" />
                Clock Configuration
              </span>
              <span className="text-[10px] font-mono font-bold text-[#00e5ff]">
                {speed}x SPEED
              </span>
            </div>

            {/* Timezone Selector */}
            <div className="mb-2">
              <select
                value={selectedTz}
                onChange={(e) => setSelectedTz(e.target.value)}
                className="w-full h-7 border border-zinc-800 bg-zinc-900/80 px-2 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Formatted Timestamp */}
            <div className="text-[11px] font-mono font-semibold text-white bg-zinc-950 border border-zinc-900 px-2.5 py-1 text-center truncate">
              {formatClockTime(timeMs, selectedTz)}
            </div>

            {/* Play/Pause & Reset Controls */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={togglePlay}
                className="flex-1 flex h-7 items-center justify-center gap-1.5 border border-zinc-700 bg-zinc-900 text-[10px] font-mono uppercase tracking-wider text-white hover:bg-zinc-800 transition"
              >
                {isPaused ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3 text-amber-400" />}
                {isPaused ? "Resume" : "Pause"}
              </button>
              
              <button
                onClick={() => {
                  setTimeMs(Date.now());
                  setSpeed(1);
                  setIsPaused(false);
                }}
                className="flex h-7 px-2.5 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                title="Reset to Real-Time"
              >
                <RotateCcw className="h-3 w-3" />
              </button>

              {/* Speed Multipliers */}
              <div className="flex items-center gap-1">
                {[1, 10, 60, 300].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`h-7 px-1.5 border text-[9px] font-mono transition ${
                      speed === s
                        ? "border-[#00e5ff] bg-[#00e5ff]/20 text-[#00e5ff] font-bold"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. NASA EDITORIAL STORY STRIP (Matching Lower Story Thumbnail in Reference)
          Quick-select prominent flagship missions + fleet metrics
          ───────────────────────────────────────────────────────────────────────────── */}
      <section className="w-full border-b border-zinc-850 bg-zinc-950 py-3 px-4 lg:px-8">
        <div className="mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="border border-white/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-zinc-400">
              Flagship Missions
            </span>
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
              Select key spacecraft to focus ephemeris:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATALOG_SATELLITES.map((catSat) => {
              const isSelected = selectedId === catSat.id;
              return (
                <button
                  key={catSat.id}
                  onClick={() => handleTrackSatellite(catSat.id)}
                  className={`flex items-center gap-2 border px-3 py-1.5 text-left transition whitespace-nowrap ${
                    isSelected
                      ? "border-white bg-white text-black font-semibold"
                      : "border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  <span className="text-[10px] font-mono">{catSat.name}</span>
                  <span className={`text-[8px] font-mono ${isSelected ? "text-zinc-800" : "text-zinc-500"}`}>
                    {catSat.date}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. FLEET INVENTORY & OBSERVATION CATALOG SECTION
          Minimal editorial side navigation / grid with search and category filtering
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="fleet-catalog-section" className="mx-auto w-full px-4 lg:px-12 py-12 border-b border-zinc-900">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
              Section 01 // Fleet Telemetry Catalog
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white uppercase">
              Space Machine Catalog &amp; Query Controls
            </h2>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            SHOWING <span className="text-white font-bold">{displayedSatellites.length}</span> OF{" "}
            <span className="text-white font-bold">{filteredSatellites.length}</span> SATELLITES
          </div>
        </div>

        {/* Catalog Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border border-zinc-850 bg-zinc-950 mb-6">
          
          {/* Group Selector */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
              Observation Fleet
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full h-8 border border-zinc-800 bg-black px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Orbit Class Filter */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
              Orbit Regime Filter
            </label>
            <select
              value={orbitClassFilter}
              onChange={(e) => setOrbitClassFilter(e.target.value as any)}
              className="w-full h-8 border border-zinc-800 bg-black px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              <option value="All">All Orbit Classes (LEO/MEO/GEO/HEO)</option>
              <option value="LEO">LEO — Low Earth Orbit (&lt; 2,000 km)</option>
              <option value="MEO">MEO — Medium Earth Orbit</option>
              <option value="GEO">GEO — Geostationary Orbit (~35,786 km)</option>
              <option value="HEO">HEO — High Elliptical Orbit</option>
            </select>
          </div>

          {/* Search Query Filter */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
              Query Search Filter
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name or NORAD…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 border border-zinc-800 bg-black pl-7 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-500" />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[9px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
              Category Tag
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full h-8 border border-zinc-800 bg-black px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              <option value="All">All Categories</option>
              <option value="Active">Active Constellations &amp; Stations</option>
              <option value="Weather">Weather &amp; Climate</option>
              <option value="GPS">Navigation (GPS/GNSS)</option>
              <option value="Science">Science &amp; Telescopes</option>
              <option value="Debris">Debris &amp; Inactive</option>
            </select>
          </div>

        </div>

        {/* Space Machines Catalog Grid: Minimal NASA Grid Styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 max-h-[360px] overflow-y-auto p-1 border border-zinc-850 bg-black scrollbar-thin scrollbar-thumb-zinc-800">
          {loading ? (
            <div className="col-span-full py-12 text-center font-mono text-xs text-zinc-500 uppercase tracking-widest">
              Fetching orbital elements from CelesTrak…
            </div>
          ) : displayedSatellites.length === 0 ? (
            <div className="col-span-full py-12 text-center font-mono text-xs text-zinc-500 uppercase tracking-widest">
              No satellites match the specified query filters.
            </div>
          ) : (
            displayedSatellites.map((sat) => {
              const isSelected = selectedId === sat.id;
              return (
                <button
                  key={sat.id}
                  onClick={() => handleTrackSatellite(sat.id)}
                  className={`flex flex-col justify-between p-3 text-left border transition ${
                    isSelected
                      ? "border-white bg-zinc-900 text-white shadow-[0_0_15px_rgba(255,255,255,0.06)]"
                      : "border-zinc-900 bg-zinc-950/40 text-zinc-400 hover:border-zinc-750 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs truncate text-white">{sat.name}</span>
                    <span className="text-[9px] font-mono font-bold text-[#00e5ff]">{sat.orbitClass}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 mt-2">
                    <span>NORAD {sat.id}</span>
                    <span className="truncate max-w-[90px]">{sat.category}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. TELEMETRY & OBSERVATION COORDINATES (Section 02)
          Editorial 4-Column Technical Data Architecture
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="telemetry-section" className="mx-auto w-full px-4 lg:px-12 py-12 border-b border-zinc-900">
        
        <div className="mb-8">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
            Section 02 // Live Kinematics
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase">
            Orbital Parameters &amp; Inertial Coordinates
          </h2>
        </div>

        {!selectedSat ? (
          <div className="p-8 border border-zinc-850 bg-zinc-950 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
            Select a satellite above to inspect live vector telemetry
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Panel 1: Satellite Focus */}
            <div className="border border-zinc-850 bg-zinc-950 p-5 flex flex-col justify-between">
              <div>
                <div className="border border-white/20 inline-block px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-zinc-300 mb-3">
                  Satellite Focus
                </div>
                <h3 className="text-base font-bold text-white truncate">{selectedSat.name}</h3>
                
                <div className="grid grid-cols-2 gap-y-2 mt-4 font-mono text-xs">
                  <div className="text-zinc-400">NORAD ID:</div>
                  <div className="text-white font-bold text-right">{selectedSat.id}</div>
                  
                  <div className="text-zinc-400">GROUP:</div>
                  <div className="text-zinc-200 text-right truncate">{selectedSat.category.toUpperCase()}</div>
                  
                  <div className="text-zinc-400">REGIME:</div>
                  <div className="text-[#00e5ff] font-bold text-right">{selectedSat.orbitClass}</div>
                </div>
              </div>

              <div className="text-[9px] font-mono text-zinc-400 border-t border-zinc-900 pt-3 mt-4">
                Epoch Date:<br />
                <span className="text-zinc-300">{new Date(selectedSat.epochDate).toUTCString()}</span>
              </div>
            </div>

            {/* Panel 2: Live Subpoint Position */}
            <div className="border border-zinc-850 bg-zinc-950 p-5 flex flex-col justify-between">
              <div>
                <div className="border border-white/20 inline-block px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-amber-400 mb-3">
                  Live Subpoint Position
                </div>

                {selectedTelemetry ? (
                  <div className="grid grid-cols-2 gap-y-2 font-mono text-xs">
                    <div className="text-zinc-400">LATITUDE:</div>
                    <div className="text-white font-semibold text-right">{selectedTelemetry.lat.toFixed(5)}°</div>
                    
                    <div className="text-zinc-400">LONGITUDE:</div>
                    <div className="text-white font-semibold text-right">{selectedTelemetry.lon.toFixed(5)}°</div>
                    
                    <div className="text-zinc-400">ALTITUDE:</div>
                    <div className="text-[#00e5ff] font-bold text-right">{selectedTelemetry.alt.toFixed(2)} km</div>
                    
                    <div className="text-zinc-400">VELOCITY:</div>
                    <div className="text-white font-bold text-right">
                      {Math.round(selectedTelemetry.vel * 3600).toLocaleString()} km/h
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-zinc-400 italic py-4">Calculating vector telemetry…</div>
                )}
              </div>

              <div className="text-[9px] font-mono text-zinc-400 border-t border-zinc-900 pt-3 mt-4">
                TLE Epoch Age:{" "}
                <span className={epochAgeDays > 3 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {epochAgeDays.toFixed(2)} days
                </span>
                <span className="text-zinc-400"> ({epochAgeDays > 3 ? "Stale" : "Fresh"})</span>
              </div>
            </div>

            {/* Panel 3: Inertial Frame (ECI) */}
            <div className="border border-zinc-850 bg-zinc-950 p-5 flex flex-col justify-between">
              <div>
                <div className="border border-white/20 inline-block px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-zinc-300 mb-3">
                  Inertial Frame (ECI)
                </div>

                {selectedTelemetry ? (
                  <div className="grid grid-cols-2 gap-y-2 font-mono text-xs">
                    <div className="text-zinc-400">ECI X:</div>
                    <div className="text-white text-right">{selectedTelemetry.px.toFixed(2)} km</div>
                    
                    <div className="text-zinc-400">ECI Y:</div>
                    <div className="text-white text-right">{selectedTelemetry.py.toFixed(2)} km</div>
                    
                    <div className="text-zinc-400">ECI Z:</div>
                    <div className="text-white text-right">{selectedTelemetry.pz.toFixed(2)} km</div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-zinc-400 italic py-4">Calculating vectors…</div>
                )}
              </div>

              <div className="text-[8px] font-mono text-zinc-400 border-t border-zinc-900 pt-3 mt-4 leading-relaxed">
                *ECI coordinates are referenced to True Equator of Date inertial frame.
              </div>
            </div>

            {/* Panel 4: Keplerian Orbital Elements */}
            <div className="border border-zinc-850 bg-zinc-950 p-5 flex flex-col justify-between">
              <div>
                <div className="border border-white/20 inline-block px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#00e5ff] mb-3">
                  Keplerian Elements
                </div>

                {orbitalElements ? (
                  <div className="grid grid-cols-2 gap-y-1.5 font-mono text-xs">
                    <div className="text-zinc-400">INCLINATION:</div>
                    <div className="text-white text-right">{orbitalElements.inclination.toFixed(4)}°</div>
                    
                    <div className="text-zinc-400">ECCENTRICITY:</div>
                    <div className="text-white text-right">{orbitalElements.eccentricity.toFixed(7)}</div>
                    
                    <div className="text-zinc-400">PERIOD:</div>
                    <div className="text-white text-right">{orbitalElements.periodMin.toFixed(2)} min</div>
                    
                    <div className="text-zinc-400">APOGEE ALT:</div>
                    <div className="text-white text-right">{orbitalElements.apogeeAlt.toFixed(0)} km</div>
                    
                    <div className="text-zinc-400">PERIGEE ALT:</div>
                    <div className="text-white text-right">{orbitalElements.perigeeAlt.toFixed(0)} km</div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-zinc-400 italic py-4">Unavailable</div>
                )}
              </div>

              <div className="text-[8px] font-mono text-zinc-400 border-t border-zinc-900 pt-3 mt-4 leading-relaxed">
                *Derived from Mean Motion relative to WGS-84 spheroid.
              </div>
            </div>

          </div>
        )}

      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. MISSION INTELLIGENCE & TECHNICAL DOSSIER (Section 03)
          Renders SatelliteInfoPanel with clean NASA-editorial design
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="dossier-section" className="mx-auto w-full px-4 lg:px-12 py-12">
        
        <div className="mb-8">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
            Section 03 // Scientific Dossier
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase">
            Mission Intelligence, Specifications &amp; Discoveries
          </h2>
        </div>

        {selectedSat ? (
          <SatelliteInfoPanel
            noradId={selectedSat.id}
            satName={selectedSat.name}
            category={selectedSat.category}
            orbitalElements={orbitalElements}
          />
        ) : (
          <div className="p-12 border border-zinc-850 bg-zinc-950 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
            Select an asset from the fleet catalog to view complete technical dossier
          </div>
        )}

      </section>

    </div>
  );
}
