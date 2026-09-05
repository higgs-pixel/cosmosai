"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { GlassButton } from "@/components/glass/GlassButton";
import { SpaceTechCard } from "@/components/ui/SpaceTechCard";

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

  const date = useMemo(() => new Date(timeSecBucket * 2000), [timeSecBucket]);

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
    <div className="flex flex-col w-full text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* 1. Spatial Liquid Glass Navigation Bar */}
      <TrackMySkyNav
        observer={observer}
        formattedTime={formatClockTime(timeMs, selectedTz)}
        onOpenPairModal={() => setShowPairModal(true)}
        onOpenManual={() => {
          const el = document.getElementById("glossary-modal-btn");
          if (el) el.click();
        }}
        onScrollToSection={scrollToSection}
        activeSection={activeSection}
      />

      {/* 2. Hero Section: 3D Earth Globe & Editorial Telemetry HUD */}
      <div id="hero" className="w-full">
        <TrackMySkyHero
          observer={observer}
          visibleCount={visibilityResults.length}
          nakedEyeCount={nakedEyeCount}
          sunlitCount={sunlitCount}
          activeSatName={selectedSat?.satName || "ISS (ZARYA)"}
          activeSatAltKm={selectedSat?.satAltKm || 418}
          activeSatElDeg={selectedSat ? Math.round(selectedSat.elevationDeg * 10) / 10 : 45.2}
          activeSatAzDeg={selectedSat ? Math.round(selectedSat.azimuthDeg * 10) / 10 : 178}
          onDetectGps={detectUserLocation}
          onScrollToSection={scrollToSection}
        />
      </div>

      {/* 3. Observatory Command Console: Ground Station & Simulation Controls */}
      <div id="console-section" className="w-full max-w-[1720px] mx-auto px-4 md:px-6 pt-6">
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
          formattedClock={formatClockTime(timeMs, selectedTz)}
          timeMs={timeMs}
          sliderBaseTime={sliderBaseTime}
          onTimeScrubberChange={(val) => setTimeMs(val)}
          twilight={twilight}
          aboveHorizonCount={visibilityResults.length}
          nakedEyeCount={nakedEyeCount}
        />
      </div>

      {/* 4. Orbital Observation Viewports (Polar Sky Dome, 3D Globe, 2D Radar) */}
      <div id="viewports-section" ref={mapSectionRef} className="w-full max-w-[1720px] mx-auto px-4 md:px-6 pt-10 flex flex-col gap-6">
        {/* Spatial View Switcher HUD Bar */}
        <GlassPanel level={1} className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-widest uppercase text-white flex items-center gap-2">
                <span>ORBITAL OBSERVATION VIEWPORTS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Multispectral topocentric tracking &bull; 360° Polar Dome, 3D Orbital Globe &bull; 2D Ground Track
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveMapView("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${activeMapView === "all" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]" : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"}`}
            >
              <span>ALL VIEWPORTS</span>
            </button>
            <button
              onClick={() => setActiveMapView("polar")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${activeMapView === "polar" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]" : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"}`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>POLAR SKY</span>
            </button>
            <button
              onClick={() => setActiveMapView("3d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${activeMapView === "3d" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]" : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"}`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>3D GLOBE</span>
            </button>
            <button
              onClick={() => setActiveMapView("2d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${activeMapView === "2d" ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]" : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"}`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>2D RADAR</span>
            </button>
            <Link
              href="/stargaze"
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-cyan-400 text-black shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:opacity-90"
            >
              <Sparkles className="h-3.5 w-3.5 text-black" />
              <span>STAR GAZE</span>
            </Link>
          </div>
        </GlassPanel>

        {/* Viewports Grid */}
        <div className={`grid grid-cols-1 ${activeMapView === "all" ? "xl:grid-cols-3" : "max-w-5xl mx-auto"} gap-6 w-full`}>
          {/* Polar Sky Dome SVG Chart */}
          {(activeMapView === "all" || activeMapView === "polar") && (
            <div className={`w-full ${activeMapView === "all" ? "h-[580px]" : "h-[640px]"}`}>
              <SkyDomeChart
                visibleSats={visibilityResults}
                allEvaluatedSats={allEvaluatedSats}
                twilight={twilight}
                observer={{ ...observer, name: observer.name || "Observer Site" }}
                timeMs={timeMs}
                selectedSatId={selectedSatId}
                onSelectSat={(id) => setSelectedSatId(id)}
              />
            </div>
          )}

          {/* Observer-Centered 3D Simulation Globe */}
          {(activeMapView === "all" || activeMapView === "3d") && (
            <div className={`w-full ${activeMapView === "all" ? "h-[580px]" : "h-[640px]"}`}>
              <SpaceTechCard
                moduleTag="VIEWPORT-3D // ORBITAL SPATIAL GLOBE"
                statusText="SGP4 PROPAGATING"
                statusColor="cyan"
                tilt={false}
                className="h-full p-5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-3 shrink-0">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Globe className="h-4 w-4 text-cyan-400" />
                    <span>3D Orbital Globe &amp; Trajectory</span>
                  </h2>
                  <GlassBadge tone="cyan" dot={true}>
                    {observer.name}
                  </GlassBadge>
                </div>

                <div className="flex-1 h-full w-full rounded-2xl overflow-hidden bg-black/60 relative border border-white/10">
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
              </SpaceTechCard>
            </div>
          )}

          {/* Observer-Centered 2D Live Leaflet Radar Map */}
          {(activeMapView === "all" || activeMapView === "2d") && (
            <div className={`w-full ${activeMapView === "all" ? "h-[580px]" : "h-[640px]"}`}>
              <SpaceTechCard
                moduleTag="VIEWPORT-2D // LEAFLET RADAR FOOTPRINT"
                statusText="GROUND TRACK ONLINE"
                statusColor="emerald"
                tilt={false}
                className="h-full p-5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-3 shrink-0">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <MapIcon className="h-4 w-4 text-emerald-400" />
                    <span>2D Live Ground Track Radar</span>
                  </h2>
                  <GlassBadge tone="emerald" dot={true}>
                    Footprint Coverage
                  </GlassBadge>
                </div>

                <div className="flex-1 h-full w-full rounded-2xl overflow-hidden bg-black/60 relative border border-white/10">
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
              </SpaceTechCard>
            </div>
          )}

          {/* Star Gaze 3D Interactive Planetarium Sky Dome */}
          {activeMapView === "stargaze" && (
            <SpaceTechCard
              moduleTag="PLANETARIUM // 3D STAR GAZE DOME"
              statusText="3D STARFIELD"
              statusColor="purple"
              tilt={false}
              className="col-span-full w-full p-5"
            >
              <StarGazeView observer={observer} />
            </SpaceTechCard>
          )}
        </div>
      </div>

      {/* 5. Spatial Upcoming Passes Timeline Flow */}
      <div id="passes-section" className="w-full max-w-[1720px] mx-auto px-4 md:px-6 pt-10">
        <UpcomingPassesTimeline
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
      </div>

      {/* 6. Orbital Analytics & Telemetry Charts */}
      <div id="analytics-section" className="w-full max-w-[1720px] mx-auto px-4 md:px-6 pt-10">
        <SkyPassAnalytics
          selectedSat={selectedSat}
          visibleSats={visibilityResults}
          observer={observer}
          timeMs={timeMs}
          selectedPass={selectedPass}
        />
      </div>

      {/* 7. Overhead Fleet Telemetry Matrix */}
      <div id="fleet-table-section" className="w-full max-w-[1720px] mx-auto px-4 md:px-6 pt-10 pb-16">
        <SpaceTechCard
          moduleTag="TACTICAL // ORBITAL FLEET COMMAND MATRIX"
          statusText={`${filteredVisibleSats.length} TARGETS IN RANGE`}
          statusColor="cyan"
          tilt={false}
          className="p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>ORBITAL FLEET TELEMETRY MATRIX</span>
                  <GlassBadge tone="cyan">
                    {visibilityResults.length} OVERHEAD
                  </GlassBadge>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Topocentric azimuth, elevation, slant range and visual magnitude computed via SGP4 propagation.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Tactical Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="SEARCH FLEET (NAME / NORAD)…"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="h-9 w-52 sm:w-64 pl-9 pr-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setTableFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${tableFilter === "all" ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,229,255,0.3)] font-black" : "text-slate-400 hover:text-white"}`}
                >
                  ALL ({visibilityResults.length})
                </button>
                <button
                  onClick={() => setTableFilter("visible")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer ${tableFilter === "visible" ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)] font-black" : "text-slate-400 hover:text-white"}`}
                >
                  NAKED-EYE ({nakedEyeCount})
                </button>
                <button
                  onClick={() => setTableFilter("sunlit")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${tableFilter === "sunlit" ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black" : "text-slate-400 hover:text-white"}`}
                >
                  SUNLIT ({sunlitCount})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/80">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Satellite / Target</th>
                  <th className="p-3.5">NORAD ID</th>
                  <th className="p-3.5">Optical Status</th>
                  <th className="p-3.5">Elevation</th>
                  <th className="p-3.5">Azimuth</th>
                  <th className="p-3.5">Est. Visual Mag</th>
                  <th className="p-3.5">Slant Range</th>
                  <th className="p-3.5">Illumination</th>
                  <th className="p-3.5 text-right">Target Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVisibleSats.map((sat) => {
                  const isSelected = selectedSatId === sat.satId;
                  return (
                    <tr
                      key={`fleet-${sat.satId}`}
                      onClick={() => handleSelectSat(sat.satId)}
                      className={`cursor-pointer transition-colors duration-150 hover:bg-cyan-500/[0.08] ${isSelected ? "bg-cyan-500/15 border-l-2 border-cyan-400 shadow-[inset_0_0_20px_rgba(0,229,255,0.08)]" : ""}`}
                    >
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${sat.isNakedEyeVisible ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : sat.isSunlit ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" : "bg-slate-500"}`} />
                        <span className="truncate max-w-[180px] sm:max-w-none">{sat.satName}</span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono">{sat.satId}</td>
                      <td className="p-3.5">
                        <GlassBadge tone={sat.isNakedEyeVisible ? "emerald" : sat.isSunlit ? "amber" : "slate"}>
                          {sat.statusLabel}
                        </GlassBadge>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white">{sat.elevationDeg}°</span>
                          <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden shrink-0 hidden sm:block">
                            <div
                              className={`h-full rounded-full ${sat.elevationDeg > 45 ? "bg-emerald-400" : "bg-cyan-400"}`}
                              style={{ width: `${Math.min(100, Math.max(5, Math.round((sat.elevationDeg / 90) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300">{sat.azimuthDeg}°</td>
                      <td className="p-3.5 font-bold text-cyan-400">
                        {sat.estimatedMagnitude > 0 ? `+${sat.estimatedMagnitude}` : sat.estimatedMagnitude} mᵥ
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">{sat.slantRangeKm} km</span>
                          <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden shrink-0 hidden sm:block">
                            <div
                              className="h-full bg-cyan-400 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(10, Math.round((1 - (sat.slantRangeKm - 300) / 2500) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-400">{sat.isSunlit ? "Sunlit" : "Umbral Shadow"}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSat(sat.satId);
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition ml-auto ${
                            isSelected
                              ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,229,255,0.4)] font-black"
                              : "bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/40"
                          }`}
                        >
                          <Crosshair className={`h-3 w-3 ${isSelected ? "animate-spin" : ""}`} />
                          <span>{isSelected ? "LOCKED" : "AIM RETICLE"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SpaceTechCard>
      </div>

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
