"use client";

import { useState, useEffect, useMemo, useCallback, useRef, startTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin, Compass, Navigation, Eye, Sparkles, Clock, Globe,
  Search, RefreshCw, Layers, ShieldAlert, CheckCircle2, ChevronRight, Activity, Smartphone, QrCode, ArrowLeft, Sun, Moon, Info, ExternalLink, Play, Pause, RotateCcw, Filter, Map as MapIcon, Crosshair, ArrowRight, BookOpen
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
import SatelliteInfoPanel from "./SatelliteInfoPanel";
import { TrackMySkyNav } from "@/components/track-my-sky/TrackMySkyNav";
import { TrackMySkyHero } from "@/components/track-my-sky/TrackMySkyHero";
import { ObservatoryCommandConsole } from "@/components/track-my-sky/ObservatoryCommandConsole";
import { UpcomingPassesTimeline } from "@/components/track-my-sky/UpcomingPassesTimeline";
import { createSgp4Worker } from "./worker-code";

const Satellite3DView = dynamic(() => import("./Satellite3DView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full min-h-[480px] bg-black flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs border border-zinc-800">
      <Globe className="h-8 w-8 text-[#00e5ff] animate-spin" />
      <span>Calibrating 3D Orbital Globe Engine…</span>
    </div>
  ),
});

const Observer2DMap = dynamic(() => import("./Observer2DMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full min-h-[480px] bg-black flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs border border-zinc-800">
      <MapIcon className="h-8 w-8 text-emerald-400 animate-pulse" />
      <span>Loading 2D Leaflet Ground Track Engine…</span>
    </div>
  ),
});

const StarGazeView = dynamic(() => import("./StarGazeView"), {
  ssr: false,
  loading: () => (
    <div className="h-[650px] w-full bg-black flex flex-col items-center justify-center gap-3 text-purple-300 font-mono text-xs border border-zinc-800">
      <Sparkles className="h-8 w-8 text-purple-400 animate-spin" />
      <span>Loading 3D Star Gaze Planetarium Experience…</span>
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

// Parses Keplerian elements from TLE Line 2
function parseOrbitalElements(line2: string) {
  try {
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
  } catch {
    return null;
  }
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
  }, []);

  // Orbital Store Simulation hooks
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

  // SGP4 Web Worker initialization
  useEffect(() => {
    if (satellitesList.length === 0) return;

    if (workerRef.current) {
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
      /* Worker fallback */
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [satellitesList]);

  // Continuous SGP4 propagation loop for 3D globe satellites
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

  // Synchronize selected satellite with store
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

  useEffect(() => {
    handleLiveSync();
  }, [handleLiveSync]);

  // Clock tick loop
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

  useEffect(() => {
    if (isPaused) {
      setUiTimeMs(useOrbitalStore.getState().timeMs);
    }
  }, [isPaused]);

  // Satellite Group Selection
  const [skyCatalogGroup, setSkyCatalogGroup] = useState<"active" | "visual" | "weather" | "gnss" | "stations">("active");

  useEffect(() => {
    let isMounted = true;
    setLoadingSats(true);

    const loadData = async () => {
      const satMap = new Map<number, SatelliteData>();
      DEFAULT_SATELLITE_CATALOG.forEach((s) => satMap.set(s.id, s));

      if (storeSatellitesList && storeSatellitesList.length >= 25) {
        storeSatellitesList.forEach((s) => satMap.set(s.id, s));
      }

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
        /* skip */
      }

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
          /* skip */
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

  // Geolocation Tier 1: Companion Mobile Polling
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

  // Geolocation Tier 2: Dual-Pass Browser Geolocation
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

  useEffect(() => {
    detectUserLocation();
  }, [detectUserLocation]);

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

  // Astronomical Visibility Computation
  const date = useMemo(() => new Date(uiTimeMs), [uiTimeMs]);

  const twilight = useMemo(() => {
    return getObserverTwilight(date, observer.lat, observer.lon);
  }, [date, observer]);

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

      const rawSat = satellitesList.find((s) => s.id === selectedSatId);
      if (rawSat) {
        const evalRes = evaluateSatelliteVisibility(rawSat, observer, date);
        if (evalRes) return evalRes;
      }
    }
    return visibilityResults[0] || allEvaluatedSats[0] || (candidateSatellites[0] ? evaluateSatelliteVisibility(candidateSatellites[0], observer, date) : null);
  }, [visibilityResults, allEvaluatedSats, candidateSatellites, satellitesList, selectedSatId, observer, date]);

  // Find the raw TLE record of the active satellite for Keplerian and ECI computations
  const selectedRawSat = useMemo(() => {
    const id = selectedSat?.satId || selectedSatId;
    return satellitesList.find((s) => s.id === id) || satellitesList[0] || null;
  }, [satellitesList, selectedSat, selectedSatId]);

  // Keplerian elements from TLE Line 2
  const orbitalElements = useMemo(() => {
    if (!selectedRawSat?.line2) return null;
    return parseOrbitalElements(selectedRawSat.line2);
  }, [selectedRawSat]);

  // ECI and geodetic vector telemetry
  const selectedTelemetry = useMemo(() => {
    if (!selectedRawSat) return null;
    try {
      const satrec = satellite.twoline2satrec(selectedRawSat.line1, selectedRawSat.line2);
      if (!satrec || satrec.error) return null;
      const posVel = satellite.propagate(satrec, date);
      if (posVel && posVel.position && typeof posVel.position !== "boolean" && posVel.velocity && typeof posVel.velocity !== "boolean") {
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
      // skip
    }
    return null;
  }, [selectedRawSat, date]);

  const epochAgeDays = useMemo(() => {
    if (!selectedRawSat?.epochDate) return 0;
    const epoch = new Date(selectedRawSat.epochDate).getTime();
    const diff = uiTimeMs - epoch;
    return diff / (24 * 60 * 60 * 1000);
  }, [selectedRawSat, uiTimeMs]);

  // Upcoming Satellite Pass Predictions Engine
  const passCalcBucket = useMemo(() => Math.floor(uiTimeMs / (15 * 60_000)), [uiTimeMs]);
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
    <div className="flex flex-col w-full text-zinc-100 font-sans selection:bg-white selection:text-black bg-black min-h-screen">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. SLIM NASA-INSPIRED NAVIGATION BAR
          ───────────────────────────────────────────────────────────────────────────── */}
      <TrackMySkyNav
        observer={observer}
        formattedTime={formatClockTime(uiTimeMs, selectedTz)}
        onOpenPairModal={() => setShowPairModal(true)}
        onOpenManual={() => {
          const el = document.getElementById("glossary-modal-btn");
          if (el) el.click();
        }}
        onScrollToSection={scrollToSection}
        activeSection={activeSection}
        searchQuery={tableSearch}
        onSearchChange={setTableSearch}
      />

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. CINEMATIC HERO: 3D CELESTIAL OBSERVATORY & PLUTO-STYLE EDITORIAL OVERLAY
          Dominant planetary visual with bordered headline box & action link
          ───────────────────────────────────────────────────────────────────────────── */}
      <div id="hero" className="w-full">
        <TrackMySkyHero
          observer={observer}
          visibleCount={visibilityResults.length}
          nakedEyeCount={nakedEyeCount}
          sunlitCount={sunlitCount}
          activeSatName={selectedSat?.satName || selectedRawSat?.name || "ISS (ZARYA)"}
          activeSatAltKm={selectedSat?.satAltKm || selectedTelemetry?.alt || 418}
          activeSatElDeg={selectedSat ? Math.round(selectedSat.elevationDeg * 10) / 10 : 45.2}
          activeSatAzDeg={selectedSat ? Math.round(selectedSat.azimuthDeg * 10) / 10 : 178}
          activeSatMag={selectedSat?.estimatedMagnitude ?? -1.8}
          activeSatVelocityKmH={selectedTelemetry ? Math.round(selectedTelemetry.vel * 3600) : 27600}
          activeSatCategory={selectedRawSat?.category || "Space Station"}
          activeSatNoradId={selectedSat?.satId || selectedRawSat?.id || 25544}
          onDetectGps={detectUserLocation}
          onScrollToSection={scrollToSection}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. MISSION FOCUS & SCIENTIFIC KINEMATICS (Section 01)
          EDITORIAL TWO-COLUMN LAYOUT: Narrative Profile (Left) + Scientific Spec Sheet (Right)
          Completely replaces the old 4 small cards!
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="satellite-info-section" className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:px-8 py-16 border-b border-zinc-900 font-sans">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
              Section 01 // Scientific Kinematics &amp; Mission Profile
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase font-sans">
              Orbital Parameters &amp; Inertial Coordinates
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1 max-w-2xl">
              High-precision topocentric astrometry, WGS-84 geodetic vector propagation, and mean motion Keplerian elements.
            </p>
          </div>

          <div className="text-xs font-mono text-zinc-400 border border-zinc-800 bg-zinc-950 px-3 py-1.5 self-start md:self-end">
            TRACKING NORAD: <span className="text-white font-bold">{selectedSat?.satId || selectedRawSat?.id || 25544}</span>
          </div>
        </div>

        {/* Editorial Two-Column Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: Editorial Mission Narrative Profile (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 border border-white/20 bg-black px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest text-zinc-300 font-sans">
                <span>{selectedRawSat?.category?.toUpperCase() || "SPACE EXPLORATION"}</span>
                <span className="text-zinc-600">&bull;</span>
                <span className="text-[#00e5ff]">{selectedRawSat?.orbitClass || "LEO"} REGIME</span>
              </div>

              <h3 className="text-3xl font-black text-white uppercase tracking-tight font-sans">
                {selectedSat?.satName || selectedRawSat?.name || "Target Mission"}
              </h3>

              <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                Real-time orbital propagation relative to topocentric horizon of <strong className="text-white">{(observer.name || "Observer Site").split(",")[0]}</strong>.
                Spacecraft is currently <span className={selectedSat?.isSunlit ? "text-amber-400 font-semibold" : "text-zinc-400 font-semibold"}>
                  {selectedSat?.isSunlit ? "illuminated by solar rays outside Earth umbra" : "in Earth umbral shadow"}
                </span>.
              </p>
            </div>

            {/* Editorial Metadata Table */}
            <div className="border-t border-b border-zinc-900 py-4 divide-y divide-zinc-900/80 text-xs font-sans">
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 uppercase text-[11px]">NORAD Catalog ID</span>
                <span className="text-white font-mono font-bold">{selectedSat?.satId || selectedRawSat?.id || 25544}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 uppercase text-[11px]">Target Classification</span>
                <span className="text-zinc-200 font-medium">{selectedRawSat?.category || "Active Spacecraft"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 uppercase text-[11px]">Orbit Regime</span>
                <span className="text-[#00e5ff] font-bold">{selectedRawSat?.orbitClass || "Low Earth Orbit"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 uppercase text-[11px]">Solar Lighting State</span>
                <span className={`font-semibold ${selectedSat?.isSunlit ? "text-amber-400" : "text-zinc-400"}`}>
                  {selectedSat?.isSunlit ? "Sunlit Outside Umbra" : "In Umbral Eclipse"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 uppercase text-[11px]">TLE Epoch Freshness</span>
                <span className="font-mono text-zinc-300">
                  {epochAgeDays.toFixed(2)} days ({epochAgeDays > 3 ? "Stale" : "Fresh Ephemeris"})
                </span>
              </div>
            </div>

            {/* Jump to Dossier Action Link */}
            <button
              onClick={() => scrollToSection("dossier-section")}
              className="inline-flex items-center gap-2 text-xs uppercase font-bold tracking-widest text-zinc-300 hover:text-white border-b border-zinc-700 hover:border-white pb-1 transition cursor-pointer"
            >
              <span>Explore Complete Aerospace Engineering Dossier</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* COLUMN 2: Scientific Telemetry & Keplerian Spec Sheet (7 Columns) */}
          <div className="lg:col-span-7 border border-zinc-850 bg-black p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#00e5ff] font-bold">
                Scientific Telemetry &amp; Astrometric Elements
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">True Equator / Mean Equinox (TEME)</span>
            </div>

            {/* Scientific Data Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs font-sans">
              
              {/* Group 1: Subpoint Geodetics */}
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-900 pb-1">
                  1. Geodetic Subpoint (WGS-84)
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Subpoint Latitude:</span>
                    <span className="text-white font-mono font-bold">
                      {selectedTelemetry ? `${selectedTelemetry.lat.toFixed(4)}°` : "Calculating…"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Subpoint Longitude:</span>
                    <span className="text-white font-mono font-bold">
                      {selectedTelemetry ? `${selectedTelemetry.lon.toFixed(4)}°` : "Calculating…"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">True Altitude:</span>
                    <span className="text-[#00e5ff] font-mono font-bold">
                      {selectedTelemetry ? `${selectedTelemetry.alt.toFixed(1)} km` : "Calculating…"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Orbital Velocity:</span>
                    <span className="text-white font-mono font-bold">
                      {selectedTelemetry ? `${Math.round(selectedTelemetry.vel * 3600).toLocaleString()} km/h` : "Calculating…"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 2: Topocentric & Slant Range */}
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-900 pb-1">
                  2. Topocentric Coordinates
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Observer Elevation:</span>
                    <span className="text-white font-mono font-bold">{selectedSat?.elevationDeg ? `${selectedSat.elevationDeg.toFixed(1)}°` : "45.0°"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Observer Azimuth:</span>
                    <span className="text-white font-mono font-bold">{selectedSat?.azimuthDeg ? `${selectedSat.azimuthDeg.toFixed(1)}°` : "180.0°"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Slant Range:</span>
                    <span className="text-white font-mono font-bold">{selectedSat?.slantRangeKm ? `${selectedSat.slantRangeKm} km` : "540 km"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Visual Magnitude:</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {selectedSat && selectedSat.estimatedMagnitude > 0 ? `+${selectedSat.estimatedMagnitude}` : selectedSat?.estimatedMagnitude ?? -1.8} mᵥ
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 3: Inertial Frame (TEME) */}
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-900 pb-1">
                  3. Inertial Frame Coordinates (ECI)
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">ECI X:</span>
                    <span className="text-zinc-200 font-mono">
                      {selectedTelemetry ? `${selectedTelemetry.px.toFixed(1)} km` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">ECI Y:</span>
                    <span className="text-zinc-200 font-mono">
                      {selectedTelemetry ? `${selectedTelemetry.py.toFixed(1)} km` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">ECI Z:</span>
                    <span className="text-zinc-200 font-mono">
                      {selectedTelemetry ? `${selectedTelemetry.pz.toFixed(1)} km` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group 4: Keplerian Orbital Elements */}
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-900 pb-1">
                  4. Keplerian Orbital Elements
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Inclination:</span>
                    <span className="text-white font-mono font-bold">
                      {orbitalElements ? `${orbitalElements.inclination.toFixed(3)}°` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Eccentricity:</span>
                    <span className="text-white font-mono font-bold">
                      {orbitalElements ? orbitalElements.eccentricity.toFixed(6) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Orbital Period:</span>
                    <span className="text-white font-mono font-bold">
                      {orbitalElements ? `${orbitalElements.periodMin.toFixed(2)} min` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Apogee / Perigee Alt:</span>
                    <span className="text-[#00e5ff] font-mono font-bold">
                      {orbitalElements ? `${orbitalElements.apogeeAlt.toFixed(0)} / ${orbitalElements.perigeeAlt.toFixed(0)} km` : "—"}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-3 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>*SGP4/SDP4 Analytical Orbital Mechanics Propagator</span>
              <span>WGS-84 Reference Spheroid</span>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. OBSERVATORY GEODETIC & PROPAGATION WORKBENCH (Section 02)
          Horizontal astrometry bar: Ground station coordinates, auto GPS, temporal scrubber
          ───────────────────────────────────────────────────────────────────────────── */}
      <div id="console-section" className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-zinc-900">
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. PRIMARY OBSERVATORY VIEWPORT THEATER (Section 03)
          Grand, wide-screen exhibition: Polar Sky Dome, 3D Globe, 2D Radar, Planetarium
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="viewports-section" ref={mapSectionRef} className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-zinc-900">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
              Section 03 // Topocentric Viewport Theater
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase font-sans">
              Observatory Viewport Exhibition
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1">
              Interactive 360° Polar Horizon Dome, 3D Orbit Trajectory Globe, and 2D Leaflet Ground Track.
            </p>
          </div>

          {/* NASA Segmented Viewport Switcher */}
          <div className="flex flex-wrap items-center border border-zinc-800 bg-black p-0.5 text-xs font-sans">
            <button
              onClick={() => setActiveMapView("all")}
              className={`px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer uppercase ${
                activeMapView === "all" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              All Viewports
            </button>
            <button
              onClick={() => setActiveMapView("polar")}
              className={`px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer uppercase flex items-center gap-1.5 ${
                activeMapView === "polar" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Compass className="h-3 w-3" />
              <span>Polar Sky</span>
            </button>
            <button
              onClick={() => setActiveMapView("3d")}
              className={`px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer uppercase flex items-center gap-1.5 ${
                activeMapView === "3d" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Globe className="h-3 w-3" />
              <span>3D Globe</span>
            </button>
            <button
              onClick={() => setActiveMapView("2d")}
              className={`px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer uppercase flex items-center gap-1.5 ${
                activeMapView === "2d" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <MapIcon className="h-3 w-3" />
              <span>2D Radar</span>
            </button>
            <button
              onClick={() => setActiveMapView("stargaze")}
              className={`px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer uppercase flex items-center gap-1.5 ${
                activeMapView === "stargaze" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>Planetarium</span>
            </button>
          </div>
        </div>

        {/* Viewports Exhibition Container */}
        <div className={`grid grid-cols-1 ${activeMapView === "all" ? "xl:grid-cols-3" : "max-w-5xl mx-auto"} gap-6 w-full items-stretch`}>
          {/* Polar Sky Dome SVG Chart */}
          {(activeMapView === "all" || activeMapView === "polar") && (
            <div className={`w-full ${activeMapView === "all" ? "h-[620px]" : "h-[660px]"}`}>
              <SkyDomeChart
                visibleSats={visibilityResults}
                allEvaluatedSats={allEvaluatedSats}
                twilight={twilight}
                observer={{ ...observer, name: observer.name || "Observer Site" }}
                timeMs={uiTimeMs}
                selectedSatId={selectedSatId}
                onSelectSat={(id) => handleSelectSat(id)}
              />
            </div>
          )}

          {/* Interactive 3D Simulation Globe */}
          {(activeMapView === "all" || activeMapView === "3d") && (
            <div className={`w-full ${activeMapView === "all" ? "h-[620px]" : "h-[660px]"}`}>
              <div className="h-full border border-zinc-850 bg-black p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-3 shrink-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-sans">
                    <Globe className="h-4 w-4 text-[#00e5ff]" />
                    <span>3D Orbital Globe &amp; Trajectory</span>
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">{(observer.name || "Observer Site").split(",")[0]}</span>
                </div>

                <div className="flex-1 min-h-[460px] h-full w-full overflow-hidden bg-black relative border border-zinc-900">
                  <Satellite3DView
                    satellites={satellitesList}
                    selectedSatId={selectedSatId}
                    latestPositions={latestPositionsRef}
                    lockCamera={false}
                    observer={observer}
                    onTrackSatellite={(id) => {
                      handleSelectSat(id);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Observer-Centered 2D Live Leaflet Radar Map */}
          {(activeMapView === "all" || activeMapView === "2d") && (
            <div className={`w-full ${activeMapView === "all" ? "h-[620px]" : "h-[660px]"}`}>
              <div className="h-full border border-zinc-850 bg-black p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-3 shrink-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-sans">
                    <MapIcon className="h-4 w-4 text-emerald-400" />
                    <span>2D Live Ground Track Radar</span>
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">Topocentric Footprint</span>
                </div>

                <div className="flex-1 min-h-[460px] h-full w-full overflow-hidden bg-black relative border border-zinc-900">
                  <Observer2DMap
                    observer={observer}
                    selectedPass={selectedPass}
                    timeMs={uiTimeMs}
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
            </div>
          )}

          {/* Star Gaze 3D Interactive Planetarium Sky Dome */}
          {activeMapView === "stargaze" && (
            <div className="col-span-full w-full border border-zinc-850 bg-black p-4">
              <StarGazeView observer={observer} />
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          6. UPCOMING SATELLITE PASSES TIMELINE (Section 04)
          Editorial Pass Predictions & 3D Carousel
          ───────────────────────────────────────────────────────────────────────────── */}
      <div id="passes-section" className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-zinc-900">
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          7. ORBITAL ASTROMETRY & PASS ANALYTICS (Section 05)
          Elevation profiles, sky illumination curves & topocentric parameters
          ───────────────────────────────────────────────────────────────────────────── */}
      <div id="analytics-section" className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-zinc-900">
        <SkyPassAnalytics
          selectedSat={selectedSat}
          visibleSats={visibilityResults}
          observer={observer}
          timeMs={uiTimeMs}
          selectedPass={selectedPass}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          8. SCIENTIFIC FLEET DIRECTORY INDEX & CATALOG (Section 06)
          Searchable editorial directory with query filters and Aim Reticle tracking
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="fleet-table-section" className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-zinc-900">
        <div className="border border-zinc-850 bg-black p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-4">
            <div>
              <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
                Section 06 // Scientific Fleet Directory
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase font-sans flex items-center gap-3">
                <span>Overhead Fleet Telemetry Directory</span>
                <span className="text-xs text-zinc-400 font-normal">({visibilityResults.length} ASSETS OVERHEAD)</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1">
                Topocentric azimuth, elevation, slant range and visual magnitude computed via SGP4 propagation.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Tactical Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="SEARCH FLEET (NAME / NORAD)…"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="h-8 w-56 sm:w-64 pl-9 pr-3 bg-zinc-950 border border-zinc-800 text-xs font-sans text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              {/* Filter pills */}
              <div className="flex items-center border border-zinc-800 bg-black p-0.5 text-xs font-sans">
                <button
                  onClick={() => setTableFilter("all")}
                  className={`px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    tableFilter === "all" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  ALL ({visibilityResults.length})
                </button>
                <button
                  onClick={() => setTableFilter("visible")}
                  className={`px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    tableFilter === "visible" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  NAKED-EYE ({nakedEyeCount})
                </button>
                <button
                  onClick={() => setTableFilter("sunlit")}
                  className={`px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    tableFilter === "sunlit" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  SUNLIT ({sunlitCount})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-900 bg-zinc-950">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-black text-zinc-400 border-b border-zinc-850 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 font-semibold">Satellite / Target</th>
                  <th className="p-3.5 font-semibold">NORAD ID</th>
                  <th className="p-3.5 font-semibold">Optical Status</th>
                  <th className="p-3.5 font-semibold">Elevation</th>
                  <th className="p-3.5 font-semibold">Azimuth</th>
                  <th className="p-3.5 font-semibold">Est. Visual Mag</th>
                  <th className="p-3.5 font-semibold">Slant Range</th>
                  <th className="p-3.5 font-semibold">Illumination</th>
                  <th className="p-3.5 text-right font-semibold">Target Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredVisibleSats.map((sat) => {
                  const isSelected = selectedSatId === sat.satId;
                  return (
                    <tr
                      key={`fleet-${sat.satId}`}
                      onClick={() => handleSelectSat(sat.satId)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? "bg-zinc-900 text-white font-medium"
                          : "hover:bg-zinc-900/60 text-zinc-300"
                      }`}
                    >
                      <td className="p-3.5 font-bold text-white flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sat.isNakedEyeVisible ? "bg-emerald-400" : sat.isSunlit ? "bg-amber-400" : "bg-zinc-600"}`} />
                        <span className="truncate max-w-[180px] sm:max-w-none">{sat.satName}</span>
                      </td>
                      <td className="p-3.5 text-zinc-400 font-mono">{sat.satId}</td>
                      <td className="p-3.5">
                        <span className={`text-[10px] px-2 py-0.5 border font-semibold ${
                          sat.isNakedEyeVisible
                            ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                            : sat.isSunlit
                            ? "border-amber-500/40 text-amber-400 bg-amber-950/20"
                            : "border-zinc-800 text-zinc-400 bg-black"
                        }`}>
                          {sat.statusLabel}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{sat.elevationDeg}°</span>
                          <div className="w-12 h-1 bg-zinc-800 overflow-hidden shrink-0 hidden sm:block">
                            <div
                              className={`h-full ${sat.elevationDeg > 45 ? "bg-emerald-400" : "bg-white"}`}
                              style={{ width: `${Math.min(100, Math.max(5, Math.round((sat.elevationDeg / 90) * 100)))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-zinc-300">{sat.azimuthDeg}°</td>
                      <td className="p-3.5 font-bold text-[#00e5ff]">
                        {sat.estimatedMagnitude > 0 ? `+${sat.estimatedMagnitude}` : sat.estimatedMagnitude} mᵥ
                      </td>
                      <td className="p-3.5 text-zinc-300 font-mono">
                        {sat.slantRangeKm} km
                      </td>
                      <td className="p-3.5 text-zinc-400">{sat.isSunlit ? "Sunlit" : "Umbra"}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSat(sat.satId);
                            document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={`px-3 py-1 text-[10px] uppercase font-semibold tracking-wider transition ml-auto border ${
                            isSelected
                              ? "bg-white text-black border-white font-bold"
                              : "bg-black text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-600"
                          }`}
                        >
                          {isSelected ? "Tracking" : "Track"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          9. MISSION INTELLIGENCE & TECHNICAL DOSSIER (Section 07)
          Comprehensive scientific dossier with full spacecraft specifications, mass, power, discoveries
          ───────────────────────────────────────────────────────────────────────────── */}
      <section id="dossier-section" className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.25em] text-[#00e5ff] mb-1">
            Section 07 // Scientific Dossier &amp; Specifications
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase font-sans">
            Mission Intelligence, Specifications &amp; Discoveries
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans mt-1">
            Comprehensive aerospace engineering specifications, payload instrument profiles, and scientific milestones.
          </p>
        </div>

        {selectedRawSat ? (
          <SatelliteInfoPanel
            noradId={selectedRawSat.id}
            satName={selectedRawSat.name}
            category={selectedRawSat.category}
            orbitalElements={orbitalElements || undefined}
          />
        ) : (
          <div className="p-12 border border-zinc-850 bg-zinc-950 text-center text-zinc-500 font-sans text-xs uppercase tracking-widest">
            Select a satellite from the catalog above to view its technical dossier
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          10. MOBILE COMPANION PAIRING MODAL
          ───────────────────────────────────────────────────────────────────────────── */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 flex flex-col items-center gap-4 text-center border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div className="h-12 w-12 rounded-none bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#00e5ff]">
              <Smartphone className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-sans">
              Pair Companion Smartphone GPS
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Relay high-precision mobile GPS coordinates (± 3m accuracy) directly into this observatory console in real-time.
            </p>

            <div className="w-full bg-black border border-zinc-800 p-3 font-mono text-xs text-zinc-300 break-all select-all">
              {pairMobileUrl}
            </div>

            <div className="flex items-center gap-3 w-full pt-2">
              <a
                href={pairMobileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 h-9 bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition uppercase tracking-wider font-sans"
              >
                <ExternalLink className="h-4 w-4" /> Open Pair Link
              </a>
              <button
                onClick={() => setShowPairModal(false)}
                className="h-9 px-4 border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition font-sans cursor-pointer"
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
