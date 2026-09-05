"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Globe,
  Map as MapIcon,
  Search,
  Activity,
  Smartphone,
  ExternalLink,
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
import { CinematicNav } from "@/components/track-my-sky/CinematicNav";
import { CinematicHero } from "@/components/track-my-sky/CinematicHero";
import { LiveOrbitSection } from "@/components/track-my-sky/LiveOrbitSection";
import { ObserverMapSection } from "@/components/track-my-sky/ObserverMapSection";
import { SatelliteIntelligenceSection } from "@/components/track-my-sky/SatelliteIntelligenceSection";
import { UpcomingPassesHorizontalTimeline } from "@/components/track-my-sky/UpcomingPassesHorizontalTimeline";
import { CinematicAnalyticsSection } from "@/components/track-my-sky/CinematicAnalyticsSection";
import { SatelliteCatalogSection } from "@/components/track-my-sky/SatelliteCatalogSection";
import { MissionDossierSection } from "@/components/track-my-sky/MissionDossierSection";
import { ObservatoryCommandConsole } from "@/components/track-my-sky/ObservatoryCommandConsole";
import SkyGlossaryModal from "./SkyGlossaryModal";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { createSgp4Worker } from "./worker-code";

export interface ObserverConfig {
  name: string;
  lat: number;
  lon: number;
  altMeters: number;
  accuracyRadiusMeters?: number;
  source?: "browser-geolocation" | "phone-gps" | "ip-network" | "manual";
}

const PRESET_CITIES: { name: string; lat: number; lon: number; altMeters: number }[] = [
  { name: "Chennai, India", lat: 13.0827, lon: 80.2707, altMeters: 16 },
  { name: "Bengaluru, India", lat: 12.9716, lon: 77.5946, altMeters: 920 },
  { name: "Mumbai, India", lat: 19.076, lon: 72.8777, altMeters: 14 },
  { name: "New Delhi, India", lat: 28.6139, lon: 77.209, altMeters: 216 },
  { name: "Cape Canaveral, USA", lat: 28.3922, lon: -80.6077, altMeters: 3 },
  { name: "Houston, USA", lat: 29.7604, lon: -95.3698, altMeters: 15 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278, altMeters: 25 },
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503, altMeters: 40 },
  { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093, altMeters: 19 },
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

export default function OrbitCinematicDashboard() {
  const [sessionId] = useState(() => `orbit_${Math.random().toString(36).substring(2, 9)}`);

  const [observer, setObserverState] = useState<ObserverConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cosmos_orbit_observer");
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
        localStorage.setItem("cosmos_orbit_observer", JSON.stringify(obs));
      } catch {
        /* skip */
      }
    }
  };

  const [customLat, setCustomLat] = useState(observer.lat.toFixed(6));
  const [customLon, setCustomLon] = useState(observer.lon.toFixed(6));
  const [customAlt, setCustomAlt] = useState(String(observer.altMeters));
  const [gpsStatus, setGpsStatus] = useState<"locating" | "success" | "phone-paired">("success");
  const [selectedSatId, setSelectedSatId] = useState<number | null>(25544);
  const [onlyVisible, setOnlyVisible] = useState(false);
  const [timeframeFilter, setTimeframeFilter] = useState<"1h" | "6h" | "24h">("6h");
  const [selectedTz, setSelectedTz] = useState("IST");
  const [selectedPass, setSelectedPass] = useState<SatellitePass | null>(null);
  const [showControlsDrawer, setShowControlsDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSelectSat = useCallback((id: number) => {
    setSelectedSatId(id);
    const el = document.getElementById("live-orbit");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const [uiTimeMs, setUiTimeMs] = useState(() => useOrbitalStore.getState().timeMs);
  const lastUiTickRef = useRef(performance.now());

  const isPaused = useOrbitalStore((s) => s.isPaused);
  const speed = useOrbitalStore((s) => s.speed);
  const setTimeMs = useOrbitalStore((s) => s.setTimeMs);
  const setIsPaused = useOrbitalStore((s) => s.setIsPaused);
  const togglePlay = useOrbitalStore((s) => s.togglePlay);
  const setSpeed = useOrbitalStore((s) => s.setSpeed);
  const tick = useOrbitalStore((s) => s.tick);

  const [satellitesList, setSatellitesList] = useState<SatelliteData[]>(() => DEFAULT_SATELLITE_CATALOG);
  const [loadingSats, setLoadingSats] = useState(false);
  const [sliderBaseTime, setSliderBaseTime] = useState(() => Date.now());

  const setSelectedSatelliteId = useOrbitalStore((s) => s.setSelectedSatelliteId);
  const setStoreSatellitesList = useOrbitalStore((s) => s.setSatellitesList);
  const workerRef = useRef<Worker | null>(null);
  const latestPositionsRef = useRef<Float32Array | null>(null);
  const isWorkerBusyRef = useRef(false);

  useEffect(() => {
    if (satellitesList.length > 0) {
      setStoreSatellitesList(satellitesList);
    }
  }, [satellitesList, setStoreSatellitesList]);

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
      /* Worker fallback handled inside Satellite3DView */
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [satellitesList]);

  // SGP4 worker propagation loop paced at 30Hz
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

  const [skyCatalogGroup, setSkyCatalogGroup] = useState<"active" | "visual" | "weather" | "gnss" | "stations">("visual");

  useEffect(() => {
    let isMounted = true;
    setLoadingSats(true);

    const loadData = async () => {
      const satMap = new Map<number, SatelliteData>();
      DEFAULT_SATELLITE_CATALOG.forEach((s) => satMap.set(s.id, s));

      try {
        const primaryGroup = skyCatalogGroup === "active" ? "visual" : skyCatalogGroup;
        const res = await fetch(`/api/orbit/tle?group=${primaryGroup}`, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const text = await res.text();
          const parsed = parseTleText(text);
          parsed.forEach((s) => satMap.set(s.id, s));
        }
      } catch {
        /* Fallback to default catalog */
      }

      if (isMounted) {
        setSatellitesList(Array.from(satMap.values()));
        setLoadingSats(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [skyCatalogGroup]);

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

  const passCalcBucket = useMemo(() => Math.floor(uiTimeMs / (15 * 60_000)), [uiTimeMs]);

  const [upcomingPasses, setUpcomingPasses] = useState<SatellitePass[]>([]);

  useEffect(() => {
    if (loadingSats || candidateSatellites.length === 0) {
      setUpcomingPasses([]);
      return;
    }

    const hours = timeframeFilter === "1h" ? 1 : timeframeFilter === "6h" ? 6 : 24;
    const computed = predictUpcomingPasses(candidateSatellites, observer, passCalcBucket * (15 * 60_000), hours);
    setUpcomingPasses(onlyVisible ? computed.filter((p) => p.isVisibleToEye) : computed);
  }, [candidateSatellites, observer, timeframeFilter, passCalcBucket, onlyVisible, loadingSats]);

  const nakedEyeCount = useMemo(() => visibilityResults.filter((s) => s.isNakedEyeVisible).length, [visibilityResults]);
  const sunlitCount = useMemo(() => visibilityResults.filter((s) => s.isSunlit).length, [visibilityResults]);

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

      {/* Floating Stargazer Help Desk Assistant & Glossary */}
      <SkyGlossaryModal />
    </div>
  );
}
