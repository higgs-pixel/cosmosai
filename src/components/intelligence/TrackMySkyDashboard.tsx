"use client";

import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin, Compass, Navigation, Eye, Sparkles, Clock, Globe,
  Search, RefreshCw, Layers, ShieldAlert, CheckCircle2, ChevronRight, Activity, Smartphone, QrCode, ArrowLeft, Sun, Moon, Info, ExternalLink, Play, Pause, RotateCcw, Filter, Map as MapIcon, Crosshair
} from "lucide-react";
import * as satellite from "satellite.js";
import { useOrbitalStore, SatelliteData } from "./store";
import { DEFAULT_SATELLITE_CATALOG } from "./defaultCatalog";
import {
  getObserverTwilight,
  evaluateSatelliteVisibility,
  SatelliteVisibilityResult,
  ObserverTwilightInfo,
} from "@/lib/orbit/visibility";
import { ObserverCoords, SatellitePass, predictUpcomingPasses } from "./PassPredictor";
import SkyDomeChart from "./SkyDomeChart";
import SkyPassAnalytics from "./SkyPassAnalytics";
import SkyGlossaryModal from "./SkyGlossaryModal";
import { TrackMySkyNav } from "@/components/track-my-sky/TrackMySkyNav";
import { TrackMySkyHero } from "@/components/track-my-sky/TrackMySkyHero";
import { ObservatoryCommandConsole } from "@/components/track-my-sky/ObservatoryCommandConsole";
import { UpcomingPassesTimeline } from "@/components/track-my-sky/UpcomingPassesTimeline";
import { CinematicNav } from "@/components/track-my-sky/CinematicNav";
import { CinematicHero } from "@/components/track-my-sky/CinematicHero";
import { LiveOrbitSection } from "@/components/track-my-sky/LiveOrbitSection";
import { ObserverMapSection } from "@/components/track-my-sky/ObserverMapSection";
import { SatelliteIntelligenceSection } from "@/components/track-my-sky/SatelliteIntelligenceSection";
import { UpcomingPassesHorizontalTimeline } from "@/components/track-my-sky/UpcomingPassesHorizontalTimeline";
import { CinematicAnalyticsSection } from "@/components/track-my-sky/CinematicAnalyticsSection";
import { SatelliteCatalogSection } from "@/components/track-my-sky/SatelliteCatalogSection";
import { MissionDossierSection } from "@/components/track-my-sky/MissionDossierSection";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassButton } from "@/components/glass/GlassButton";
import { SpaceTechCard } from "@/components/ui/SpaceTechCard";
import { createSgp4Worker } from "./worker-code";

const Satellite3DView = dynamic(() => import("./Satellite3DView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full min-h-[480px] bg-[#03040a] rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs border border-slate-800">
      <Globe className="h-8 w-8 text-[#00e5ff] animate-spin" />
      <span>Initializing 3D Orbital Globe Engine...</span>
    </div>
  ),
});

const Observer2DMap = dynamic(() => import("./Observer2DMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full min-h-[480px] bg-[#0d1117] rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs border border-slate-800">
      <MapIcon className="h-8 w-8 text-emerald-400 animate-pulse" />
      <span>Loading 2D Leaflet Ground Track Engine...</span>
    </div>
  ),
});

const StarGazeView = dynamic(() => import("./StarGazeView"), {
  ssr: false,
  loading: () => (
    <div className="h-[650px] w-full bg-[#03040a] rounded-2xl flex flex-col items-center justify-center gap-3 text-purple-300 font-mono text-xs border border-slate-800">
      <Sparkles className="h-8 w-8 text-purple-400 animate-spin" />
      <span>Loading 3D Star Gaze Planetarium Experience...</span>
    </div>
  ),
});


export interface ObserverConfig extends ObserverCoords {
  accuracyRadiusMeters?: number;
  source?: "phone-gps" | "browser-geolocation" | "manual" | "ip-network";
}

const PRESET_CITIES: ObserverCoords[] = [
  { name: "Chennai, Tamil Nadu, India", lat: 13.0827, lon: 80.2707, altMeters: 10 },
  { name: "Coimbatore, Tamil Nadu, India", lat: 11.0168, lon: 76.9558, altMeters: 411 },
  { name: "Madurai, Tamil Nadu, India", lat: 9.9252, lon: 78.1198, altMeters: 101 },
  { name: "Bengaluru, Karnataka, India", lat: 12.9716, lon: 77.5946, altMeters: 920 },
  { name: "New Delhi, India", lat: 28.6139, lon: 77.2090, altMeters: 216 },
  { name: "Mumbai, Maharashtra, India", lat: 19.0760, lon: 72.8777, altMeters: 14 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278, altMeters: 35 },
  { name: "New York, USA", lat: 40.7128, lon: -74.0060, altMeters: 10 },
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503, altMeters: 40 },
  { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093, altMeters: 58 },
  { name: "San Francisco, USA", lat: 37.7749, lon: -122.4194, altMeters: 16 },
  { name: "Paris, France", lat: 48.8566, lon: 2.3522, altMeters: 35 },
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

async function fetchReverseGeocodeName(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.locality || data.city || data.localityInfo?.administrative?.[2]?.name || "";
      const state = data.principalSubdivision || "";
      const country = data.countryName || "";
      const parts = [city, state !== city ? state : null, country].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
  } catch {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { signal: AbortSignal.timeout(4500) }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address;
        if (addr) {
          const city = addr.city || addr.town || addr.village || addr.suburb || "";
          const state = addr.state || "";
          const country = addr.country || "";
          const parts = [city, state !== city ? state : null, country].filter(Boolean);
          if (parts.length > 0) return parts.join(", ");
        }
      }
    } catch {
      /* skip */
    }
  }
  return `GPS (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;
}

function getRelativeTimeStr(targetTimeMs: number): string {
  const diffMs = targetTimeMs - Date.now();
  if (diffMs <= 0) return "ACTIVE NOW";
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `IN ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  return remMins > 0 ? `IN ${diffHours}h ${remMins}m` : `IN ${diffHours}h`;
}

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

function parseTleText(text: string): SatelliteData[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const list: SatelliteData[] = [];
  const seenIds = new Set<number>();

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
      if (isNaN(id) || seenIds.has(id)) continue;
      seenIds.add(id);

      if (name === "SATELLITE") {
        name = `SAT-${id}`;
      }

      list.push({
        id,
        name,
        line1,
        line2,
        category: "Active",
        orbitClass: "LEO",
        epochDate: new Date().toISOString(),
      });
    } catch {
      /* skip */
    }
  }
  return list;
}

export default function TrackMySkyDashboard() {
  const [sessionId] = useState(() => `sky_${Math.random().toString(36).substring(2, 9)}`);
  
  const [observer, setObserverState] = useState<ObserverConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cosmos_sky_observer");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.lat && parsed.lon) return parsed;
        }
      } catch {
        /* skip */
      }
    }
    return {
      name: "Chennai, Tamil Nadu, India",
      lat: 13.0827,
      lon: 80.2707,
      altMeters: 180,
      accuracyRadiusMeters: 50,
      source: "browser-geolocation",
    };
  });

  const setObserver = (obs: ObserverConfig) => {
    setObserverState(obs);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cosmos_sky_observer", JSON.stringify(obs));
      } catch {
        /* skip */
      }
    }
  };

  const observerRef = useRef(observer);
  useEffect(() => {
    observerRef.current = observer;
  }, [observer]);

  const [gpsStatus, setGpsStatus] = useState<"locating" | "success" | "phone-paired">("success");
  const [customLat, setCustomLat] = useState(() => observer.lat.toFixed(6));
  const [customLon, setCustomLon] = useState(() => observer.lon.toFixed(6));
  const [customAlt, setCustomAlt] = useState(() => String(observer.altMeters));
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [selectedSatId, setSelectedSatId] = useState<number | null>(25544);

  // Time & Pass Filters
  const [onlyVisible, setOnlyVisible] = useState(false);
  const [timeframeFilter, setTimeframeFilter] = useState<"1h" | "6h" | "24h">("6h");
  const [selectedTz, setSelectedTz] = useState("IST");
  const [selectedPass, setSelectedPass] = useState<SatellitePass | null>(null);
  const [showControlsDrawer, setShowControlsDrawer] = useState(false);

  const mapSectionRef = useRef<HTMLDivElement>(null);

  // View Mode for Map Displays: 'all' | 'polar' | '3d' | '2d' | 'stargaze'
  const [activeMapView, setActiveMapView] = useState<"all" | "polar" | "3d" | "2d" | "stargaze">("all");
  const [activeSection, setActiveSection] = useState("hero");
  const [tableSearch, setTableSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<"all" | "visible" | "sunlit">("all");

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSelectSat = useCallback((id: number) => {
    setSelectedSatId(id);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  // Orbital Store Simulation hooks
  // Throttled UI Clock State: Updates at ~4Hz (250ms) during active simulation, or immediately on pause/scrub.
  // This eliminates 60Hz React DOM re-renders across the page, keeping all viewports buttery smooth!
  const [uiTimeMs, setUiTimeMs] = useState(() => useOrbitalStore.getState().timeMs);
  const lastUiTickRef = useRef(performance.now());

  const isPaused = useOrbitalStore((s) => s.isPaused);
  const speed = useOrbitalStore((s) => s.speed);
  const setTimeMs = useOrbitalStore((s) => s.setTimeMs);
  const setIsPaused = useOrbitalStore((s) => s.setIsPaused);
  const togglePlay = useOrbitalStore((s) => s.togglePlay);
  const setSpeed = useOrbitalStore((s) => s.setSpeed);
  const tick = useOrbitalStore((s) => s.tick);
  const storeSatellitesList = useOrbitalStore((s) => s.satellitesList);

  const [satellitesList, setSatellitesList] = useState<SatelliteData[]>(() => DEFAULT_SATELLITE_CATALOG);
  const [loadingSats, setLoadingSats] = useState(false);

  const [sliderBaseTime, setSliderBaseTime] = useState(() => Date.now());

  const setSelectedSatelliteId = useOrbitalStore((s) => s.setSelectedSatelliteId);
  const setStoreSatellitesList = useOrbitalStore((s) => s.setSatellitesList);
  const workerRef = useRef<Worker | null>(null);
  const latestPositionsRef = useRef<Float32Array | null>(null);
  const isWorkerBusyRef = useRef(false);

  // Sync satellitesList into orbital store for 3D trajectory calculation
  useEffect(() => {
    if (satellitesList.length > 0) {
      setStoreSatellitesList(satellitesList);
    }
  }, [satellitesList, setStoreSatellitesList]);

  // 1. Initialize or update SGP4 Web Worker on satellite list load without terminating active worker
  useEffect(() => {
    if (satellitesList.length === 0) return;

    if (workerRef.current) {
      // Worker already running: seamlessly update its catalog in the background without dropping frames
      workerRef.current.postMessage({ type: "init", data: satellitesList });
      return;
    }

    try {
      const worker = createSgp4Worker();
      workerRef.current = worker;
      worker.postMessage({ type: "init", data: satellitesList });

      worker.onmessage = (e) => {
        isWorkerBusyRef.current = false;
        const { type, buffer } = e.data;
        if (type === "positions") {
          latestPositionsRef.current = buffer;
        }
      };
    } catch {
      /* Worker fallback handled inside Satellite3DView */
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [satellitesList]);

  // 2. Continuous SGP4 propagation request loop for 3D globe satellites (Paced at ~30Hz to prevent IPC message flooding)
  useEffect(() => {
    let frameId: number;
    let lastPropagateTime = 0;

    const loop = (now: number) => {
      if (workerRef.current && satellitesList.length > 0 && !isWorkerBusyRef.current) {
        if (now - lastPropagateTime >= 33) {
          lastPropagateTime = now;
          const currentTime = useOrbitalStore.getState().timeMs;
          isWorkerBusyRef.current = true;
          workerRef.current.postMessage({
            type: "propagate",
            timeMs: currentTime,
          });
        }
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, [satellitesList]);

  // 3. Keep selected satellite synchronized with store for 3D orbit track and model rendering
  useEffect(() => {
    if (selectedSatId) {
      setSelectedSatelliteId(selectedSatId);
    }
  }, [selectedSatId, setSelectedSatelliteId]);

  const handleLiveSync = useCallback(() => {
    const now = Date.now();
    setTimeMs(now);
    setUiTimeMs(now);
    setSpeed(1);
    setIsPaused(false);
    setSliderBaseTime(now);
  }, [setTimeMs, setSpeed, setIsPaused]);

  // Initialize clock to live time on mount
  useEffect(() => {
    handleLiveSync();
  }, [handleLiveSync]);

  // Continuous 60fps clock tick loop for silky smooth orbit simulation at any speed (1x, 2x, 5x, 10x, 60x...)
  useEffect(() => {
    if (isPaused) return;

    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      if (delta > 0 && delta < 1000) {
        tick(delta);
      }

      // Throttle React state re-renders:
      // In 1x-5x simulation, 1000ms (1 Hz) provides responsive telemetry while eliminating CPU thrashing.
      // In fast-forward (>5x), 500ms keeps time-scrubbing fluid.
      const currentSpeed = useOrbitalStore.getState().speed;
      const throttleInterval = currentSpeed > 5 ? 500 : 1000;

      if (now - lastUiTickRef.current >= throttleInterval) {
        lastUiTickRef.current = now;
        setUiTimeMs(useOrbitalStore.getState().timeMs);
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [tick, isPaused]);

  // Immediately sync UI clock when pausing or seeking
  useEffect(() => {
    if (isPaused) {
      setUiTimeMs(useOrbitalStore.getState().timeMs);
    }
  }, [isPaused]);

  // Satellite Group Selection for Track My Sky
  const [skyCatalogGroup, setSkyCatalogGroup] = useState<"active" | "visual" | "weather" | "gnss" | "stations">("active");

  // Load satellite database with multi-tier resilient fallback
  useEffect(() => {
    let isMounted = true;
    setLoadingSats(true);

    const loadData = async () => {
      // Create seed map with default catalog satellites
      const satMap = new Map<number, SatelliteData>();
      DEFAULT_SATELLITE_CATALOG.forEach((s) => satMap.set(s.id, s));

      // If orbital store already has a rich catalog, seed from it too
      if (storeSatellitesList && storeSatellitesList.length >= 25) {
        storeSatellitesList.forEach((s) => satMap.set(s.id, s));
      }

      // Fetch live TLE data from API for the selected sky catalog group
      try {
        const res = await fetch(`/api/orbital?group=${skyCatalogGroup}&format=tle`);
        if (res.ok) {
          const txt = await res.text();
          const parsed = parseTleText(txt);
          if (parsed.length > 0) {
            parsed.forEach((s) => satMap.set(s.id, s));
          }
        }
      } catch {
        // network error, proceed with seeded catalog
      }

      // If active was selected and gave few results, also fetch visual
      if (satMap.size < 20 && skyCatalogGroup === "active") {
        try {
          const res = await fetch("/api/orbital?group=visual&format=tle");
          if (res.ok) {
            const txt = await res.text();
            const parsed = parseTleText(txt);
            if (parsed.length > 0) {
              parsed.forEach((s) => satMap.set(s.id, s));
            }
          }
        } catch {
          // ignore
        }
      }

      if (isMounted) {
        const fullList = Array.from(satMap.values());
        startTransition(() => {
          setSatellitesList(fullList);
        });
        useOrbitalStore.getState().setSatellitesList(fullList);
        setLoadingSats(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [skyCatalogGroup]);

  // ───────────────────────────────────────────────────────────────────────────
  // Tier 1: Poll Companion Smartphone GPS Endpoint (/api/geolocation/pair)
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/geolocation/pair?session=${encodeURIComponent(sessionId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success && data.coords) {
            const c = data.coords;
            const current = observerRef.current;
            if (
              Math.abs(current.lat - c.lat) > 0.0001 ||
              Math.abs(current.lon - c.lon) > 0.0001 ||
              Math.abs(current.altMeters - (c.alt || 180)) > 1 ||
              current.source !== "phone-gps"
            ) {
              setObserver({
                name: c.placeName || "Mobile Phone Companion GPS",
                lat: c.lat,
                lon: c.lon,
                altMeters: c.alt || 180,
                accuracyRadiusMeters: c.accuracy || 4,
                source: "phone-gps",
              });
              setCustomLat(c.lat.toFixed(6));
              setCustomLon(c.lon.toFixed(6));
              setCustomAlt(String(c.alt || 180));
              setGpsStatus("phone-paired");
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [sessionId]);

  // ───────────────────────────────────────────────────────────────────────────
  // Tier 2: Dual-Pass Browser Geolocation + Reverse Geocoding
  // ───────────────────────────────────────────────────────────────────────────
  const detectUserLocation = useCallback(() => {
    setGpsStatus("locating");

    const applyCoords = async (rawLat: number, rawLon: number, altMeters = 180, source: ObserverConfig["source"] = "browser-geolocation", defaultName?: string) => {
      const lat = parseFloat(rawLat.toFixed(6));
      const lon = parseFloat(rawLon.toFixed(6));
      setCustomLat(lat.toFixed(6));
      setCustomLon(lon.toFixed(6));

      const placeName = defaultName || (await fetchReverseGeocodeName(lat, lon));
      setObserver({
        name: placeName,
        lat,
        lon,
        altMeters,
        accuracyRadiusMeters: source === "phone-gps" ? 4 : 25,
        source,
      });
      setGpsStatus("success");
    };

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void applyCoords(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.altitude || 180), "browser-geolocation");
        },
        () => {
          fetch("/api/geolocation")
            .then((r) => r.json())
            .then((geo) => {
              if (geo && typeof geo.lat === "number" && typeof geo.lon === "number") {
                const name = geo.city && geo.country ? `${geo.city}, ${geo.region ? geo.region + ", " : ""}${geo.country}` : undefined;
                void applyCoords(geo.lat, geo.lon, 180, "ip-network", name);
              }
            })
            .catch(() => {});
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    }
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    detectUserLocation();
  }, [detectUserLocation]);

  // City Search Handler
  const handleSearchCity = async () => {
    if (!citySearchQuery.trim()) return;
    setIsSearchingCity(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(citySearchQuery.trim())}&limit=1`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            const shortName = item.display_name.split(",").slice(0, 3).join(",").trim();
            setObserver({
              name: shortName,
              lat,
              lon,
              altMeters: 180,
              accuracyRadiusMeters: 100,
              source: "manual",
            });
            setCustomLat(lat.toFixed(6));
            setCustomLon(lon.toFixed(6));
            setGpsStatus("success");
          }
        }
      }
    } catch {
      /* skip */
    } finally {
      setIsSearchingCity(false);
    }
  };

  const handleApplyCustomCoords = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    const altMeters = parseFloat(customAlt) || 180;
    if (!isNaN(lat) && !isNaN(lon)) {
      setObserver({
        name: `Manual (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
        lat,
        lon,
        altMeters,
        accuracyRadiusMeters: 10,
        source: "manual",
      });
      setGpsStatus("success");
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Real-Time Astronomical Visibility Computation Pass
  // Evaluates 3-Condition Naked-Eye Visibility Test for all satellites
  // ───────────────────────────────────────────────────────────────────────────
  const date = useMemo(() => new Date(uiTimeMs), [uiTimeMs]);

  const twilight = useMemo(() => {
    return getObserverTwilight(date, observer.lat, observer.lon);
  }, [date, observer]);

  // Deterministic NORAD Catalog ID Sorted Satellite Catalog
  // Pre-parse satrec records once when catalog loads (Zero TLE re-parsing overhead during tick)
  const satrecCatalog = useMemo(() => {
    if (!satellitesList || satellitesList.length === 0) return [];
    return satellitesList
      .map((sat) => {
        try {
          const satrec = satellite.twoline2satrec(sat.line1, sat.line2);
          if (!satrec || satrec.error) return null;
          return { sat, satrec };
        } catch {
          return null;
        }
      })
      .filter((item): item is { sat: SatelliteData; satrec: satellite.SatRec } => item !== null);
  }, [satellitesList]);

  // Single Atomic SGP4 Visibility Evaluation (Executes in ~10ms with zero intermediate state jumping)
  const allEvaluatedSats = useMemo(() => {
    if (satrecCatalog.length === 0) return [];

    const results: SatelliteVisibilityResult[] = [];
    const seenIds = new Set<number>();

    for (let i = 0; i < satrecCatalog.length; i++) {
      const { sat } = satrecCatalog[i];
      if (seenIds.has(sat.id)) continue;
      seenIds.add(sat.id);

      const res = evaluateSatelliteVisibility(sat, observer, date);
      if (res && res.elevationDeg >= -15) {
        results.push(res);
      }
    }

    return results.sort((a, b) => b.elevationDeg - a.elevationDeg);
  }, [satrecCatalog, observer, date]);

  const visibilityResults = useMemo(() => {
    return allEvaluatedSats.filter((s) => s.isAboveHorizon).sort((a, b) => {
      if (a.isNakedEyeVisible && !b.isNakedEyeVisible) return -1;
      if (!a.isNakedEyeVisible && b.isNakedEyeVisible) return 1;
      return b.elevationDeg - a.elevationDeg;
    });
  }, [allEvaluatedSats]);

  const filteredVisibleSats = useMemo(() => {
    return visibilityResults.filter((sat) => {
      if (tableFilter === "visible" && !sat.isNakedEyeVisible) return false;
      if (tableFilter === "sunlit" && !sat.isSunlit) return false;
      if (!tableSearch.trim()) return true;
      const q = tableSearch.toLowerCase().trim();
      return (
        sat.satName.toLowerCase().includes(q) ||
        String(sat.satId).includes(q)
      );
    });
  }, [visibilityResults, tableFilter, tableSearch]);

  // Fast Candidate Satellites (Top 45 most prominent targets for passes)
  const candidateSatellites = useMemo(() => {
    if (!satellitesList || satellitesList.length === 0) return [];
    const priorityIds = new Set([25544, 48274, 20580, 25994, 43013, 27424, 33591, 39634, 40697, 44713, 26690, 37753, 43001, 39620, 40732, 41836, 41752]);
    const priorityList = satellitesList.filter((s) => priorityIds.has(s.id));
    const regularList = satellitesList.filter((s) => !priorityIds.has(s.id));
    return [...priorityList, ...regularList].slice(0, 45);
  }, [satellitesList]);

  const selectedSat = useMemo(() => {
    if (selectedSatId) {
      const foundInVis = visibilityResults.find((s) => s.satId === selectedSatId);
      if (foundInVis) return foundInVis;

      const foundInAll = allEvaluatedSats.find((s) => s.satId === selectedSatId);
      if (foundInAll) return foundInAll;

      // Evaluate selected satellite even if currently below horizon
      const rawSat = satellitesList.find((s) => s.id === selectedSatId);
      if (rawSat) {
        const evalRes = evaluateSatelliteVisibility(rawSat, observer, date);
        if (evalRes) return evalRes;
      }
    }
    return visibilityResults[0] || allEvaluatedSats[0] || (candidateSatellites[0] ? evaluateSatelliteVisibility(candidateSatellites[0], observer, date) : null);
  }, [visibilityResults, allEvaluatedSats, candidateSatellites, satellitesList, selectedSatId, observer, date]);

  // Upcoming Satellite Pass Predictions Engine (Recomputed every 15 minutes of simulation time)
  const passCalcBucket = useMemo(() => Math.floor(uiTimeMs / (15 * 60_000)), [uiTimeMs]);

  // Compute pass predictions in the background using requestIdleCallback so 3D simulation never stutters
  const [upcomingPasses, setUpcomingPasses] = useState<SatellitePass[]>([]);

  useEffect(() => {
    if (loadingSats || candidateSatellites.length === 0) {
      setUpcomingPasses([]);
      return;
    }

    let cancelled = false;
    const runPassPrediction = () => {
      const hours = timeframeFilter === "1h" ? 1 : timeframeFilter === "6h" ? 6 : 24;
      const passes = predictUpcomingPasses(candidateSatellites, observer, passCalcBucket * (15 * 60_000), hours);
      if (!cancelled) {
        startTransition(() => {
          setUpcomingPasses(onlyVisible ? passes.filter((p) => p.isVisibleToEye) : passes);
        });
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        runPassPrediction,
        { timeout: 150 }
      );
      return () => {
        cancelled = true;
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      };
    } else {
      const timer = setTimeout(runPassPrediction, 0);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, [candidateSatellites, observer, timeframeFilter, passCalcBucket, onlyVisible, loadingSats]);

  const nakedEyeCount = useMemo(() => visibilityResults.filter((s) => s.isNakedEyeVisible).length, [visibilityResults]);
  const sunlitCount = useMemo(() => visibilityResults.filter((s) => s.isSunlit).length, [visibilityResults]);

  const pairMobileUrl = typeof window !== "undefined" ? `${window.location.origin}/orbit/pair-mobile?session=${sessionId}` : "";

  return (
    <div className="flex flex-col w-full text-slate-100 font-sans selection:bg-cyan-500 selection:text-black bg-black">
      {/* 00 — Minimal Floating Cinematic Navigation */}
      <CinematicNav
        onScrollToSection={scrollToSection}
        activeSection={activeSection}
        onOpenControls={() => setShowControlsDrawer((prev) => !prev)}
      />

      {/* 01 — CINEMATIC HERO */}
      <div id="hero" className="w-full">
        <CinematicHero
          observer={observer}
          visibleCount={visibilityResults.length}
          nakedEyeCount={nakedEyeCount}
          sunlitCount={sunlitCount}
          activeSatName={selectedSat?.satName}
          activeSatAltKm={selectedSat?.satAltKm}
          activeSatElDeg={selectedSat ? Math.round(selectedSat.elevationDeg * 10) / 10 : undefined}
          nextPassName={upcomingPasses[0]?.satName}
          nextPassTimeStr={upcomingPasses[0] ? getRelativeTimeStr(upcomingPasses[0].startTimeMs) : undefined}
          nextPassMaxEl={upcomingPasses[0]?.maxElevationDeg}
          onExploreClick={() => scrollToSection("live-orbit")}
        />
      </div>

      {/* Drawer / Collapsible Observatory Command Console */}
      {showControlsDrawer && (
        <div id="console-section" className="w-full max-w-[1720px] mx-auto px-4 sm:px-8 md:px-12 pt-8">
          <ObservatoryCommandConsole
            observer={observer}
            presetCities={PRESET_CITIES}
            onSelectPresetCity={(city) => {
              setObserver({
                ...city,
                accuracyRadiusMeters: 10,
                source: "manual",
              });
              setCustomLat(city.lat.toFixed(6));
              setCustomLon(city.lon.toFixed(6));
              setCustomAlt(String(city.altMeters));
              setGpsStatus("success");
            }}
            onDetectGps={detectUserLocation}
            gpsStatus={gpsStatus}
            customLat={customLat}
            customLon={customLon}
            customAlt={customAlt}
            onCustomLatChange={setCustomLat}
            onCustomLonChange={setCustomLon}
            onCustomAltChange={setCustomAlt}
            onApplyCustomCoords={handleApplyCustomCoords}
            isPaused={isPaused}
            onTogglePlay={togglePlay}
            onLiveSync={handleLiveSync}
            speed={speed}
            onSetSpeed={setSpeed}
            skyCatalogGroup={skyCatalogGroup}
            onSetSkyCatalogGroup={setSkyCatalogGroup}
            selectedTz={selectedTz}
            onSelectTz={setSelectedTz}
            timezoneOptions={TIMEZONE_OPTIONS}
            totalSats={satellitesList.length}
            loadingSats={loadingSats}
            formattedClock={formatClockTime(uiTimeMs, selectedTz)}
            timeMs={uiTimeMs}
            sliderBaseTime={sliderBaseTime}
            onTimeScrubberChange={(val) => {
              setTimeMs(val);
              setUiTimeMs(val);
            }}
            twilight={twilight}
            aboveHorizonCount={visibilityResults.length}
            nakedEyeCount={nakedEyeCount}
          />
        </div>
      )}

      {/* 02 — LIVE ORBIT / SKY EXPERIENCE */}
      <LiveOrbitSection
        satellites={satellitesList}
        selectedSatId={selectedSatId}
        selectedSat={selectedSat}
        latestPositionsRef={latestPositionsRef}
        observer={observer}
        visibilityResults={visibilityResults}
        allEvaluatedSats={allEvaluatedSats}
        twilight={twilight}
        uiTimeMs={uiTimeMs}
        isPaused={isPaused}
        speed={speed}
        formattedClock={formatClockTime(uiTimeMs, selectedTz)}
        onTogglePlay={togglePlay}
        onLiveSync={handleLiveSync}
        onSetSpeed={setSpeed}
        onSelectSat={handleSelectSat}
      />

      {/* 03 — OBSERVER MAP */}
      <ObserverMapSection
        observer={observer}
        selectedSat={selectedSat}
        selectedPass={selectedPass}
        uiTimeMs={uiTimeMs}
        presetCities={PRESET_CITIES}
        gpsStatus={gpsStatus}
        customLat={customLat}
        customLon={customLon}
        onSelectPresetCity={(city) => {
          setObserver({
            name: city.name || "Observatory Station",
            lat: city.lat,
            lon: city.lon,
            altMeters: city.altMeters ?? 180,
            accuracyRadiusMeters: 10,
            source: "manual",
          });
          setCustomLat(city.lat.toFixed(6));
          setCustomLon(city.lon.toFixed(6));
          setCustomAlt(String(city.altMeters ?? 180));
          setGpsStatus("success");
        }}
        onDetectGps={detectUserLocation}
        onCustomLatChange={setCustomLat}
        onCustomLonChange={setCustomLon}
        onApplyCustomCoords={handleApplyCustomCoords}
      />

      {/* 04 — SATELLITE INTELLIGENCE */}
      <SatelliteIntelligenceSection selectedSat={selectedSat} />

      {/* 05 — UPCOMING PASSES */}
      <UpcomingPassesHorizontalTimeline
        passes={upcomingPasses}
        selectedPass={selectedPass}
        onSelectPass={(pass) => {
          setSelectedPass(pass);
          handleSelectSat(pass.noradId);
        }}
        onSelectSatId={handleSelectSat}
        onlyVisible={onlyVisible}
        onToggleOnlyVisible={setOnlyVisible}
        timeframeFilter={timeframeFilter}
        onSetTimeframeFilter={setTimeframeFilter}
      />

      {/* 06 — ANALYTICS */}
      <CinematicAnalyticsSection
        selectedSat={selectedSat}
        visibleSats={visibilityResults}
        observer={observer}
        timeMs={uiTimeMs}
        selectedPass={selectedPass}
      />

      {/* 07 — SATELLITE CATALOG */}
      <SatelliteCatalogSection
        visibleSats={visibilityResults}
        selectedSatId={selectedSatId}
        onSelectSat={handleSelectSat}
      />

      {/* 08 — MISSION / SATELLITE DOSSIER */}
      <MissionDossierSection selectedSat={selectedSat} />

      {/* 8. Mobile Companion Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <GlassPanel level={3} className="max-w-md w-full p-6 flex flex-col items-center gap-4 text-center border-cyan-500/40 shadow-[0_0_50px_rgba(0,229,255,0.2)]">
            <div className="h-12 w-12 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <h2 className="text-base font-mono font-bold text-white uppercase tracking-wider">PAIR COMPANION SMARTPHONE GPS</h2>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Relay high-precision mobile GPS coordinates (± 3m accuracy) directly into this observatory console in real-time.
            </p>

            <div className="w-full bg-slate-950/90 border border-cyan-500/30 p-3 rounded-xl font-mono text-xs text-cyan-300 break-all select-all">
              {pairMobileUrl}
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <a
                href={pairMobileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.4)] transition"
              >
                <ExternalLink className="h-4 w-4" /> OPEN PAIR LINK
              </a>
              <button
                onClick={() => setShowPairModal(false)}
                className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white text-xs font-mono font-bold transition"
              >
                CLOSE
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Floating Stargazer Help Desk Assistant & Glossary */}
      <SkyGlossaryModal />
    </div>
  );
}
