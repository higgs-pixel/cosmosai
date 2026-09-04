"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin, Compass, Navigation, Eye, Sparkles, Clock, Globe,
  Search, RefreshCw, Layers, ShieldAlert, CheckCircle2, ChevronRight, Activity, Smartphone, QrCode, ArrowLeft, Sun, Moon, Info, ExternalLink, Play, Pause, RotateCcw, Filter, Map as MapIcon
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

const Observer3DView = dynamic(() => import("./Observer3DView"), {
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

  const mapSectionRef = useRef<HTMLDivElement>(null);

  // View Mode for Map Displays: 'all' | 'polar' | '3d' | '2d' | 'stargaze'
  const [activeMapView, setActiveMapView] = useState<"all" | "polar" | "3d" | "2d" | "stargaze">("all");

  const handleSelectSat = useCallback((id: number) => {
    setSelectedSatId(id);
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  // Orbital Store Simulation hooks
  const timeMs = useOrbitalStore((s) => s.timeMs);
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

  const handleLiveSync = useCallback(() => {
    const now = Date.now();
    setTimeMs(now);
    setSpeed(1);
    setIsPaused(false);
    setSliderBaseTime(now);
  }, [setTimeMs, setSpeed, setIsPaused]);

  // Initialize clock to live time on mount
  useEffect(() => {
    handleLiveSync();
  }, [handleLiveSync]);

  // Throttled Clock Loop (Eliminates 120Hz React re-rendering lag)
  useEffect(() => {
    if (isPaused) return;

    const intervalMs = speed > 1 ? 100 : 500;
    let lastTime = performance.now();

    const timer = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      if (delta > 0 && delta < 10000) {
        tick(delta);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [tick, isPaused, speed]);

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
        setSatellitesList(fullList);
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
  // Real-Time Astronomical Visibility Computation Pass (Every Frame/Tick)
  // Evaluates 3-Condition Naked-Eye Visibility Test for all satellites
  // ───────────────────────────────────────────────────────────────────────────
  // Performance Bucket 1: 2-Second Time Bucket for SGP4 satellite position evaluations
  const timeSecBucket = useMemo(() => Math.floor(timeMs / 2000), [timeMs]);

  // Performance Bucket 2: 60-Second Time Bucket for pass predictions
  const passCalcBucket = useMemo(() => Math.floor(timeMs / 60000), [timeMs]);

  const date = useMemo(() => new Date(timeMs), [timeSecBucket, timeMs]);

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
  }, [satrecCatalog, observer, timeSecBucket]);

  const visibilityResults = useMemo(() => {
    return allEvaluatedSats.filter((s) => s.isAboveHorizon).sort((a, b) => {
      if (a.isNakedEyeVisible && !b.isNakedEyeVisible) return -1;
      if (!a.isNakedEyeVisible && b.isNakedEyeVisible) return 1;
      return b.elevationDeg - a.elevationDeg;
    });
  }, [allEvaluatedSats]);

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

  // Upcoming Satellite Pass Predictions Engine (Recomputed once every 60 seconds)
  const upcomingPasses = useMemo(() => {
    if (loadingSats || candidateSatellites.length === 0) return [];
    const hours = timeframeFilter === "1h" ? 1 : timeframeFilter === "6h" ? 6 : 24;
    const passes = predictUpcomingPasses(candidateSatellites, observer, passCalcBucket * 60000, hours);
    if (onlyVisible) {
      return passes.filter((p) => p.isVisibleToEye);
    }
    return passes;
  }, [candidateSatellites, observer, timeframeFilter, passCalcBucket, onlyVisible, loadingSats]);

  const nakedEyeCount = useMemo(() => visibilityResults.filter((s) => s.isNakedEyeVisible).length, [visibilityResults]);
  const sunlitCount = useMemo(() => visibilityResults.filter((s) => s.isSunlit).length, [visibilityResults]);

  const pairMobileUrl = typeof window !== "undefined" ? `${window.location.origin}/orbit/pair-mobile?session=${sessionId}` : "";

  return (
    <div className="flex flex-col gap-6 max-w-[1650px] mx-auto p-3 sm:p-4 lg:p-6 w-full text-slate-100 font-sans">
      
      {/* 1. Fully Responsive Location & Simulation Control Banner */}
      <div className="rounded-xl border border-slate-800 bg-[#0f1422]/90 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
              <Sparkles className="h-6 w-6 text-[#00e5ff] shrink-0" />
              <span>Track My Sky </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Topocentric 3-condition astronomical visibility engine, 3D/2D radar maps &amp; smartphone GPS pairing.
            </p>
          </div>

          {/* Clean, Structured Location Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-950/90 border border-slate-800/90 p-2 rounded-xl w-full xl:w-auto shadow-inner">
            {/* Preset City Selector */}
            <div className="flex items-center gap-1.5 grow sm:grow-0">
              <MapPin className="h-4 w-4 text-[#00e5ff] shrink-0" />
              <select
                value={PRESET_CITIES.some((c) => c.name === observer.name) ? observer.name : "custom"}
                onChange={(e) => {
                  const found = PRESET_CITIES.find((c) => c.name === e.target.value);
                  if (found) {
                    setObserver({
                      ...found,
                      accuracyRadiusMeters: 10,
                      source: "manual",
                    });
                    setCustomLat(found.lat.toFixed(6));
                    setCustomLon(found.lon.toFixed(6));
                    setGpsStatus("success");
                  }
                }}
                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white focus:outline-none focus:border-[#00e5ff] cursor-pointer shadow-sm"
              >
                <option value="custom">Preset Cities...</option>
                {PRESET_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Browser GPS */}
            <button
              onClick={detectUserLocation}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#00e5ff]/50 bg-[#00e5ff]/15 px-3.5 text-xs font-bold text-[#00e5ff] hover:bg-[#00e5ff]/25 transition shadow-sm grow sm:grow-0"
            >
              <Navigation className={`h-3.5 w-3.5 ${gpsStatus === "locating" ? "animate-spin" : ""}`} />
              <span>Auto GPS</span>
            </button>

            <div className="hidden sm:block h-5 w-[1px] bg-slate-800" />

            {/* Manual Lat / Lon / Alt Coordinates */}
            <div className="flex items-center gap-1.5 grow sm:grow-0">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">LAT</span>
                <input
                  type="number"
                  placeholder="Lat"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-16 h-7 rounded bg-slate-950 border border-slate-800 text-xs text-white text-center font-mono focus:outline-none focus:border-[#00e5ff]"
                />
                <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">LON</span>
                <input
                  type="number"
                  placeholder="Lon"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="w-16 h-7 rounded bg-slate-950 border border-slate-800 text-xs text-white text-center font-mono focus:outline-none focus:border-[#00e5ff]"
                />
                <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">ALT(m)</span>
                <input
                  type="number"
                  placeholder="Alt"
                  value={customAlt}
                  onChange={(e) => setCustomAlt(e.target.value)}
                  className="w-12 h-7 rounded bg-slate-950 border border-slate-800 text-xs text-white text-center font-mono focus:outline-none focus:border-[#00e5ff]"
                />
              </div>
              <button
                onClick={handleApplyCustomCoords}
                className="h-9 px-3 rounded-lg bg-[#00e5ff] text-slate-950 font-bold text-xs hover:bg-[#00e5ff]/90 transition shadow-[0_0_12px_rgba(0,229,255,0.3)]"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* Live Simulation Clock & Timezone Controls */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Clock Controls */}
            <button
              onClick={togglePlay}
              className={`h-8 px-3 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition ${isPaused ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-amber-500/20 border-amber-500/40 text-amber-300"}`}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              <span>{isPaused ? "Resume" : "Pause"}</span>
            </button>

            <button
              onClick={handleLiveSync}
              className="h-8 px-3 rounded-lg border border-[#00e5ff]/50 bg-[#00e5ff]/15 text-[#00e5ff] font-bold text-xs flex items-center gap-1.5 hover:bg-[#00e5ff]/25 transition shadow-[0_0_12px_rgba(0,229,255,0.2)]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#00e5ff]" />
              <span>Live Sync</span>
            </button>

            {/* Speed multipliers */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
              {[1, 5, 10, 30, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${speed === s ? "bg-[#00e5ff] text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Constellation Group Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
              <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">GROUP:</span>
              <select
                value={skyCatalogGroup}
                onChange={(e) => setSkyCatalogGroup(e.target.value as any)}
                className="h-7 rounded border border-slate-700 bg-slate-900 px-2 text-xs font-bold text-[#00e5ff] cursor-pointer"
              >
                <option value="active">All Active Constellations</option>
                <option value="visual">Bright &amp; Visual (ISS, Hubble)</option>
                <option value="weather">Weather &amp; Earth Observation</option>
                <option value="gnss">GNSS (GPS, Galileo, BeiDou, GLONASS)</option>
                <option value="stations">Space Stations (ISS &amp; Tiangong)</option>
              </select>
            </div>

            {/* Timezone Selector */}
            <select
              value={selectedTz}
              onChange={(e) => setSelectedTz(e.target.value)}
              className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-mono text-[#00e5ff] max-w-[180px]"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.id} value={tz.id}>
                  {tz.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
              Catalog: <span className="text-[#00e5ff] font-bold">{satellitesList.length}</span> Sats {loadingSats && <span className="text-amber-400 animate-pulse text-[10px] ml-1">(fetching...)</span>}
            </div>
            <div className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-lg flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>{formatClockTime(timeMs, selectedTz)}</span>
            </div>
          </div>
        </div>

        {/* Interactive Time Scrubber Slider (± 6 Hours Simulation Window) */}
        <div className="pt-2 flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase shrink-0">-6 Hours</span>
          <input
            type="range"
            min={sliderBaseTime - 6 * 3600 * 1000}
            max={sliderBaseTime + 6 * 3600 * 1000}
            step={1000}
            value={timeMs}
            onChange={(e) => setTimeMs(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00e5ff]"
          />
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase shrink-0">+6 Hours</span>
        </div>

        {/* Observer Status Summary Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono border-t border-slate-800/40">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-slate-400">Observer:</span>
            <span className="text-white font-bold">{observer.name}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Coords:</span>
            <span className="text-[#00e5ff]">{observer.lat.toFixed(4)}°N, {observer.lon.toFixed(4)}°E ({observer.altMeters}m ASL)</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Accuracy:</span>
            <span className="text-emerald-400 font-bold">± {observer.accuracyRadiusMeters || 25}m ({observer.source || "gps"})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Sky State:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${twilight.isDarkEnough ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"}`}>
              {twilight.phase} (Sun Alt: {twilight.sunAltitudeDeg.toFixed(1)}°)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Scientific 3-Condition Advisory Panel */}
      <div className="rounded-xl border border-[#00e5ff]/30 bg-[#00e5ff]/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-[#00e5ff] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white uppercase tracking-wider text-xs">
              Scientific Naked-Eye Visibility Policy (3-Condition Concurrent Test)
            </div>
            <div className="text-slate-300 mt-0.5 leading-relaxed">
              A satellite is classified as <span className="text-[#00e5ff] font-bold">Naked-Eye Visible</span> ONLY when 3 conditions hold simultaneously:
              (1) Elevation &gt; 10° above horizon, (2) Satellite illuminated by Sun (outside Earth's umbral shadow), and (3) Observer in twilight or night (Sun Alt &lt; -6°). Visual magnitudes are photometric estimates.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-mono text-center">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <div className="text-[10px] text-slate-400 uppercase">Above Horizon</div>
            <div className="text-sm font-bold text-white">{visibilityResults.length} Satellites</div>
          </div>
          <div className="bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-lg">
            <div className="text-[10px] text-emerald-400 uppercase">Naked-Eye Visible</div>
            <div className="text-sm font-bold text-emerald-300">{nakedEyeCount} Satellites</div>
          </div>
        </div>
      </div>

      {/* View Switcher Header Bar for Maps */}
      <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-2 rounded-xl">
        <div className="flex items-center gap-2 font-bold text-xs text-white px-2">
          <Layers className="h-4 w-4 text-[#00e5ff]" />
          <span>Real-Time Observer Displays</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveMapView("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeMapView === "all" ? "bg-[#00e5ff] text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.3)]" : "text-slate-400 hover:text-white"}`}
          >
            <span>All Views</span>
          </button>
          <button
            onClick={() => setActiveMapView("polar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeMapView === "polar" ? "bg-[#00e5ff] text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Polar Sky</span>
          </button>
          <button
            onClick={() => setActiveMapView("3d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeMapView === "3d" ? "bg-[#00e5ff] text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>3D Globe</span>
          </button>
          <button
            onClick={() => setActiveMapView("2d")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeMapView === "2d" ? "bg-[#00e5ff] text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>2D Leaflet Map</span>
          </button>
          <Link
            href="/stargaze"
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-[#00e5ff] text-slate-950 shadow-[0_0_15px_rgba(168,85,247,0.4)] font-extrabold hover:opacity-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-slate-950 animate-pulse" />
            <span>Star Gaze</span>
          </Link>
        </div>
      </div>

      {/* 3. Main Views: Polar Sky Dome, 3D Observer Globe & 2D Live Leaflet Map */}
      <div ref={mapSectionRef} className={`grid grid-cols-1 ${activeMapView === "all" ? "xl:grid-cols-3 lg:grid-cols-2" : "grid-cols-1"} gap-6 w-full`}>
        {/* Polar Sky Dome SVG Chart */}
        {(activeMapView === "all" || activeMapView === "polar") && (
          <SkyDomeChart
            visibleSats={visibilityResults}
            allEvaluatedSats={allEvaluatedSats}
            twilight={twilight}
            observer={{ ...observer, name: observer.name || "Observer Site" }}
            timeMs={timeMs}
            selectedSatId={selectedSatId}
            onSelectSat={(id) => setSelectedSatId(id)}
          />
        )}

        {/* Observer-Centered 3D Simulation Globe */}
        {(activeMapView === "all" || activeMapView === "3d") && (
          <div className="h-full rounded-xl border border-slate-800 bg-[#0f1422]/90 p-5 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#00e5ff]" />
                Observer 3D Globe &amp; Orbit Path
              </h2>
              <span className="text-xs text-slate-400 font-mono truncate max-w-[180px]">
                {observer.name}
              </span>
            </div>

            <div className="flex-1 min-h-[480px] h-full w-full rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800">
              <Observer3DView
                observer={observer}
                selectedPass={selectedPass}
                timeMs={timeMs}
                simPoint={selectedSat ? {
                  lat: selectedSat.satLat,
                  lon: selectedSat.satLon,
                  altKm: selectedSat.satAltKm,
                  satName: selectedSat.satName,
                  elDeg: selectedSat.elevationDeg,
                  line1: selectedSat.line1,
                  line2: selectedSat.line2,
                } : null}
              />
            </div>
          </div>
        )}

        {/* Observer-Centered 2D Live Leaflet Radar Map */}
        {(activeMapView === "all" || activeMapView === "2d") && (
          <div className="h-full rounded-xl border border-slate-800 bg-[#0f1422]/90 p-5 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-emerald-400" />
                2D Live Observer Map &amp; Ground Track
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Radar Footprint
              </span>
            </div>

            <div className="flex-1 min-h-[480px] h-full w-full rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800">
              <Observer2DMap
                observer={observer}
                selectedPass={selectedPass}
                timeMs={timeMs}
                simPoint={selectedSat ? {
                  lat: selectedSat.satLat,
                  lon: selectedSat.satLon,
                  satName: selectedSat.satName,
                  elDeg: selectedSat.elevationDeg,
                  line1: selectedSat.line1,
                  line2: selectedSat.line2,
                } : null}
              />
            </div>
          </div>
        )}

        {/* Star Gaze 3D Interactive Planetarium Sky Dome */}
        {activeMapView === "stargaze" && (
          <div className="col-span-full w-full">
            <StarGazeView observer={observer} />
          </div>
        )}
      </div>

      {/* 4. Recharts Pass Analytics & Timeline */}
      <SkyPassAnalytics
        selectedSat={selectedSat}
        visibleSats={visibilityResults}
        observer={observer}
        timeMs={timeMs}
        selectedPass={selectedPass}
      />

      {/* 5. Upcoming Satellite Passes Predictor Engine */}
      <div className="rounded-xl border border-slate-800 bg-[#0f1422]/90 p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#00e5ff]" />
              Upcoming Satellite Passes Over Observer Location
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              High-precision SGP4 pass predictions calculated relative to your observer site.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Naked-Eye Only */}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              <input
                type="checkbox"
                checked={onlyVisible}
                onChange={(e) => setOnlyVisible(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-[#00e5ff] focus:ring-0"
              />
              Naked-Eye Visible Passes Only
            </label>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
              {(["1h", "6h", "24h"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframeFilter(tf)}
                  className={`px-3 py-1 rounded text-xs font-bold ${timeframeFilter === tf ? "bg-[#00e5ff] text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Passes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingPasses.slice(0, 12).map((pass, idx) => {
            const isSelected = selectedPass?.noradId === pass.noradId && selectedPass?.startTimeMs === pass.startTimeMs;
            return (
              <div
                key={`${pass.noradId}-${pass.startTimeMs}-${idx}`}
                onClick={() => {
                  setSelectedPass(pass);
                  handleSelectSat(pass.noradId);
                }}
                className={`cursor-pointer rounded-xl border p-4 transition flex flex-col gap-2 ${isSelected ? "border-[#00e5ff] bg-[#00e5ff]/10 shadow-[0_0_20px_rgba(0,229,255,0.15)]" : "border-slate-800 bg-slate-950/80 hover:border-slate-700"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm flex items-center gap-1.5">
                    {pass.isVisibleToEye && <Sparkles className="h-3.5 w-3.5 text-[#00e5ff] animate-pulse" />}
                    {pass.satName}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pass.isVisibleToEye ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-800 text-slate-400"}`}>
                    {pass.isVisibleToEye ? "Naked-Eye Visible" : "Above Horizon"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 mt-1">
                  <div>Max El: <span className="text-[#00e5ff] font-bold">{pass.maxElevationDeg}°</span></div>
                  <div>Duration: <span className="text-white">{Math.round(pass.durationSec / 60)}m</span></div>
                  <div>AOS: <span className="text-slate-400">{new Date(pass.startTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                  <div>LOS: <span className="text-slate-400">{new Date(pass.endTimeMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                </div>

                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 mt-1 flex items-center justify-between">
                  <span>Az: {pass.riseAzimuthDeg}° → {pass.setAzimuthDeg}°</span>
                  <span className="text-emerald-400 font-mono">Est {pass.peakVmag > 0 ? `+${pass.peakVmag}` : pass.peakVmag} mag</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Currently Overhead Satellites Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0f1422]/90 p-5 shadow-2xl">
        <h2 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5 text-[#00e5ff]" />
          Satellites Currently Above Observer Horizon ({visibilityResults.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="p-3">Satellite Name</th>
                <th className="p-3">NORAD ID</th>
                <th className="p-3">Visibility Status</th>
                <th className="p-3">Elevation</th>
                <th className="p-3">Azimuth</th>
                <th className="p-3">Est. Visual Mag</th>
                <th className="p-3">Slant Range</th>
                <th className="p-3">Illumination</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {visibilityResults.map((sat, idx) => {
                const isSelected = selectedSatId === sat.satId;
                return (
                  <tr
                    key={`${sat.satId}-${sat.satName}-${idx}`}
                    onClick={() => handleSelectSat(sat.satId)}
                    className={`cursor-pointer transition hover:bg-slate-800/60 ${isSelected ? "bg-[#00e5ff]/10 border-l-2 border-[#00e5ff]" : ""}`}
                  >
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      {sat.isNakedEyeVisible && <Sparkles className="h-3.5 w-3.5 text-[#00e5ff] animate-pulse" />}
                      {sat.satName}
                    </td>
                    <td className="p-3 text-slate-400">{sat.satId}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sat.isNakedEyeVisible ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : sat.isSunlit ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-slate-800 text-slate-400"}`}>
                        {sat.statusLabel}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">{sat.elevationDeg}°</td>
                    <td className="p-3 text-slate-300">{sat.azimuthDeg}°</td>
                    <td className="p-3 font-bold text-[#00e5ff]">
                      {sat.estimatedMagnitude > 0 ? `+${sat.estimatedMagnitude}` : sat.estimatedMagnitude} mag
                    </td>
                    <td className="p-3 text-slate-300">{sat.slantRangeKm} km</td>
                    <td className="p-3 text-slate-400">{sat.isSunlit ? "Sunlit" : "Umbral Shadow"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Phone Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-purple-500/40 bg-slate-950 p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase">Pair Smartphone Hardware GPS</h2>
            <p className="text-xs text-slate-400">
              Open this link on your smartphone's browser to relay real satellite GPS coordinates (± 3m accuracy) directly to your laptop observatory:
            </p>

            <div className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-xs text-purple-300 break-all select-all">
              {pairMobileUrl}
            </div>

            <div className="flex items-center gap-3 w-full">
              <a
                href={pairMobileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-4 w-4" /> Open Pair Link
              </a>
              <button
                onClick={() => setShowPairModal(false)}
                className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Stargazer Help Desk Assistant & Glossary */}
      <SkyGlossaryModal />
    </div>
  );
}
