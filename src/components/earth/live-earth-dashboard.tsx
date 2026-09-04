"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Bookmark,
  CheckCircle2,
  Cloud,
  Compass,
  Download,
  ExternalLink,
  GalleryHorizontalEnd,
  Home,
  ImageIcon,
  MapPin,
  MessageCircle,
  Orbit,
  Rocket,
  Satellite,
  Search,
  Sparkles,
  Star,
  SunMedium,
  Users,
  X,
} from "lucide-react";
import { SaveDiscoveryButton } from "@/components/saved/save-discovery-button";
import { AuthNavLink } from "@/components/auth/auth-nav-link";
import type { EarthDashboardData } from "@/services/earth/types";
import type { SavedDiscovery } from "@/lib/saved-discoveries";

export type { EarthDashboardData };

type EarthViewMode = "2d" | "3d";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
};


type PeopleInSpaceSignal = {
  status: "live" | "unavailable";
  number: number | null;
  people: Array<{
    name: string;
    craft: string;
  }>;
  timestamp: string;
  source: string;
  message?: string;
};

type WeatherSignal = EarthDashboardData["weather"] & {
  status?: "live" | "unavailable";
  source?: string;
  message?: string;
};

const EARTH_VIEW_KEY = "cosmos:earth-dashboard:view";

const earthImages = {
  main: "/images/earth-dashboard/earth-main.jpg",
  horizon: "/images/earth-dashboard/earth-horizon.jpg",
  thumb: "/images/earth-dashboard/earth-thumb.jpg",
};

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Explore", href: "/image-explorer", icon: Compass },
  { label: "Orbit Tracker", href: "/orbit", icon: Orbit },
  { label: "Briefing", href: "/briefing", icon: GalleryHorizontalEnd },
  { label: "Missions", href: "/mission-control", icon: Rocket },
  { label: "Blog", href: "/blog", icon: ImageIcon },
  { label: "Discoveries", href: "/discoveries", icon: Star },
];

const quickActions = [
  {
    title: "Explore APOD",
    detail: "View NASA's image of the day",
    href: "/apod",
    icon: ImageIcon,
    tone: "earth-action-purple",
  },
  {
    title: "Search NASA Images",
    detail: "Discover mission archives",
    href: "/image-explorer",
    icon: Search,
    tone: "earth-action-blue",
  },
  {
    title: "Ask Today's Briefing",
    detail: "AI insight after you ask",
    href: "/ask?mode=briefing&prompt=Summarize%20today's%20COSMOS%20Earth%20dashboard%20signals.",
    icon: MessageCircle,
    tone: "earth-action-cyan",
  },
  {
    title: "Open Solar System",
    detail: "Explore planets and orbits",
    href: "/solar-system",
    icon: Orbit,
    tone: "earth-action-gold",
  },
  {
    title: "View Saved",
    detail: "Access local discoveries",
    href: "/discoveries",
    icon: Star,
    tone: "earth-action-pink",
  },
];

const weatherLocations = [
  { id: "delhi", label: "Delhi, India", latitude: 28.61, longitude: 77.2 },
  { id: "kennedy", label: "Kennedy Space Center", latitude: 28.5729, longitude: -80.649 },
  { id: "houston", label: "Houston Mission Control", latitude: 29.5593, longitude: -95.0839 },
  { id: "tokyo", label: "Tokyo, Japan", latitude: 35.6762, longitude: 139.6503 },
  { id: "london", label: "London, United Kingdom", latitude: 51.5072, longitude: -0.1276 },
];

function formatNumber(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function formatKm(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "awaiting NeoWs";
  return `${formatNumber(value)} km`;
}

function formatDecimal(value?: number | null, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "recently";
  }
}

function formatUtcTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(value));
  } catch {
    return "UTC unavailable";
  }
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value.includes("T") ? value : `${value}T00:00:00`));
  } catch {
    return value || "Today";
  }
}

function createDiscovery(data: EarthDashboardData): SavedDiscovery {
  return {
    id: `earth-dashboard-${data.date}`,
    type: "planet",
    title: "Live Earth Dashboard",
    subtitle: `Earth status for ${formatDate(data.date)}`,
    description:
      "Saved from the COSMOS AI Live Earth Dashboard with NASA APOD, NeoWs, DONKI, and Mars status signals.",
    href: "/earth",
    source: "COSMOS AI Earth Dashboard",
    savedAt: new Date().toISOString(),
    metadata: {
      date: data.date,
      asteroids: data.asteroids.total,
      flares: data.spaceWeather.flares,
      cmes: data.spaceWeather.cmes,
    },
  };
}

export function LiveEarthDashboard({ data }: { data: EarthDashboardData }) {
  const [selectedView, setSelectedView] = useState<EarthViewMode>("2d");
  const [viewLoaded, setViewLoaded] = useState(false);
  const [showPeoplePanel, setShowPeoplePanel] = useState(false);
  const [selectedWeatherId, setSelectedWeatherId] = useState("delhi");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherSignal, setWeatherSignal] = useState<WeatherSignal>({
    ...data.weather,
    status: data.weather.isFallback ? "unavailable" : "live",
    source: "Open-Meteo",
  });

  const [peopleSignal, setPeopleSignal] = useState<PeopleInSpaceSignal>({
    status: "unavailable",
    number: null,
    people: [],
    timestamp: data.generatedAt,
    source: "Open Notify",
    message: "Crew data temporarily unavailable",
  });

  useEffect(() => {
    const savedView = window.localStorage.getItem(EARTH_VIEW_KEY);
    if (savedView === "2d" || savedView === "3d") {
      setSelectedView(savedView);
    }
    setViewLoaded(true);
  }, []);

  function updateView(view: EarthViewMode) {
    setSelectedView(view);
    window.localStorage.setItem(EARTH_VIEW_KEY, view);
  }



  async function updateWeatherLocation(locationId: string) {
    const location = weatherLocations.find((item) => item.id === locationId) ?? weatherLocations[0];
    setSelectedWeatherId(location.id);
    setWeatherLoading(true);

    try {
      const params = new URLSearchParams({
        lat: String(location.latitude),
        lon: String(location.longitude),
        name: location.label,
      });
      const response = await fetch(`/api/earth/weather?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Weather route unavailable.");
      const payload = (await response.json()) as ApiEnvelope<WeatherSignal>;
      if (!payload.data) throw new Error("Weather payload unavailable.");
      setWeatherSignal({
        ...payload.data,
        locationName: payload.data.locationName || location.label,
        status: payload.data.isFallback ? "unavailable" : "live",
        source: "Open-Meteo",
      });
    } catch {
      setWeatherSignal({
        locationName: location.label,
        temperatureC: null,
        cloudCoverPct: null,
        humidityPct: null,
        windSpeedKmh: null,
        observedAt: new Date().toISOString(),
        timezone: "Unavailable",
        isFallback: true,
        status: "unavailable",
        source: "Open-Meteo",
        message: "Weather signal temporarily unavailable",
      });
    } finally {
      setWeatherLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    let currentController: AbortController | null = null;

    async function loadPeopleInSpace() {
      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;

      try {
        const response = await fetch("/api/earth/people-in-space", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("People in space route unavailable.");
        const payload = (await response.json()) as ApiEnvelope<PeopleInSpaceSignal>;
        if (active && payload.data) setPeopleSignal(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (active) {
          setPeopleSignal({
            status: "unavailable",
            number: null,
            people: [],
            timestamp: new Date().toISOString(),
            source: "Open Notify",
            message: "Crew data temporarily unavailable",
          });
        }
      }
    }

    void loadPeopleInSpace();
    const interval = window.setInterval(loadPeopleInSpace, 60000);

    return () => {
      active = false;
      window.clearInterval(interval);
      currentController?.abort();
    };
  }, []);

  const hasAnyFallback =
    data.apod.isFallback ||
    data.asteroids.isFallback ||
    data.spaceWeather.isFallback ||
    peopleSignal.status !== "live" ||
    weatherSignal.isFallback ||
    data.mars.isFallback;
  const earthStatus = "All Systems Nominal";
  const lastUpdated = formatTime(data.generatedAt);
  const spaceWeatherEvents = data.spaceWeather.flares + data.spaceWeather.cmes + data.spaceWeather.storms;
  const solarStatus =
    data.spaceWeather.storms > 0 || (data.spaceWeather.latestKp ?? 0) >= 5
      ? "Storm Watch"
      : spaceWeatherEvents > 0 || (data.spaceWeather.latestKp ?? 0) >= 4
        ? "Active"
        : "Low";
  const solarDetail = data.spaceWeather.isFallback
    ? "DONKI unavailable / NOAA Kp unavailable"
    : `${data.spaceWeather.flares} FLR / ${data.spaceWeather.cmes} CME / ${data.spaceWeather.storms} GST${
        typeof data.spaceWeather.latestKp === "number" ? ` / Kp ${formatDecimal(data.spaceWeather.latestKp)}` : ""
      }`;
  const weatherValue = weatherSignal.isFallback ? "Unavailable" : `${formatDecimal(weatherSignal.temperatureC, 1)} C`;
  const weatherDetail = weatherSignal.isFallback
    ? "Open-Meteo temporarily unavailable"
    : `${weatherSignal.locationName} / ${formatDecimal(weatherSignal.cloudCoverPct, 0)}% cloud / ${formatDecimal(weatherSignal.humidityPct, 0)}% humidity / ${formatDecimal(weatherSignal.windSpeedKmh, 1)} km/h wind`;
  const rotationDetail = `Sidereal day / UTC ${formatUtcTime(data.rotation.currentUtc)} / ${formatDecimal(data.rotation.progressPct, 1)}% rotation`;

  const alerts = useMemo(
    () => [
      {
        title: "Asteroid Close-Approach Watch",
        badge: data.asteroids.isFallback ? "Data unavailable" : "NASA NEO",
        body:
          data.asteroids.isFallback
            ? "Data temporarily unavailable. NeoWs close-approach details will appear when NASA responds."
            : data.asteroids.total > 0
            ? `${data.asteroids.total} near-Earth objects in today's NeoWs window. Closest: ${data.asteroids.closestName} at ${formatKm(data.asteroids.closestMissKm)}.`
            : "No near-Earth objects are listed in today's NeoWs window.",
        href: "/asteroids",
        sourceHref: "https://cneos.jpl.nasa.gov/ca/",
        time: data.asteroids.isFallback ? "Unavailable" : "Today",
        icon: <span className="earth-alert-asteroid" aria-hidden="true" />,
      },
      {
        title: "Solar Activity Update",
        badge: data.spaceWeather.isFallback ? "Data unavailable" : "NASA DONKI",
        body:
          data.spaceWeather.isFallback
            ? "Data temporarily unavailable. DONKI flare, CME, and storm alerts will appear when the feed responds."
            : data.spaceWeather.flares + data.spaceWeather.cmes + data.spaceWeather.storms > 0
            ? `${data.spaceWeather.cmes} CMEs, ${data.spaceWeather.flares} flares, and ${data.spaceWeather.storms} geomagnetic storms in the DONKI window.`
            : "No DONKI flare, CME, or geomagnetic storm events are visible in the current window.",
        href: "/briefing",
        sourceHref: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
        time: data.spaceWeather.isFallback ? "Unavailable" : "Live window",
        icon: <SunMedium className="h-5 w-5 text-solar-300" />,
      },
      {
        title: "NASA Image of the Day",
        badge: data.apod.isFallback ? "Data unavailable" : "NASA APOD",
        body: data.apod.isFallback ? "Data temporarily unavailable. APOD will return when NASA's media feed responds." : data.apod.title,
        href: "/apod",
        sourceHref: data.apod.sourceUrl || "/apod",
        time: data.apod.isFallback ? "Unavailable" : formatDate(data.apod.date),
        icon: <Cloud className="h-5 w-5 text-oxygen-400" />,
      },
      {
        title: "Mars Rover Update",
        badge: data.mars.isFallback ? "Data unavailable" : "NASA MARS",
        body: data.mars.isFallback
          ? "Data temporarily unavailable. Mars rover manifest details will appear when NASA responds."
          : data.mars.latestSol
          ? `${data.mars.rover} is ${data.mars.status}; latest sol ${data.mars.latestSol}.`
          : `${data.mars.rover} status is shown as ${data.mars.status}. Rover manifest details are awaiting a live signal.`,
        href: "/briefing",
        sourceHref: "https://mars.nasa.gov/mars-exploration/missions/",
        time: data.mars.latestEarthDate ? formatDate(data.mars.latestEarthDate) : "Latest",
        icon: <Satellite className="h-5 w-5 text-solar-300" />,
      },
    ],
    [data],
  );

  return (
    <main id="main-content" className="earth-dashboard-page min-h-screen overflow-x-hidden bg-[#030712] text-cosmos-white">
      <EarthDashboardHeader />

      <section className="relative mx-auto grid w-full max-w-[1800px] gap-4 px-3 pb-5 pt-24 sm:px-5 lg:px-6">
        <div className="grid gap-4 2xl:grid-cols-[1.28fr_0.82fr]">
          <article className="earth-dashboard-card relative min-h-[740px] overflow-hidden rounded-2xl p-4 sm:p-5 lg:p-6">
            <div className="earth-space-backdrop" aria-hidden="true" />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
              <span className="earth-pill">
                <span className="h-2.5 w-2.5 rounded-full bg-aurora-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
                Live Earth Dashboard
              </span>
              <Link href="/solar-system?planet=earth" className="earth-control-button">
                <Orbit className="h-4 w-4" />
                3D View
              </Link>
            </div>

            <div className="earth-image-stage relative z-10 mt-4 overflow-hidden rounded-[1.35rem]">
              <Image
                src={earthImages.main}
                alt="Earth seen from space with atmosphere, clouds, and city lights"
                fill
                priority
                sizes="(min-width: 1536px) 1050px, (min-width: 1024px) 62vw, 100vw"
                className="object-contain p-3 sm:p-5 lg:p-6"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0)_48%,rgba(2,6,23,0.82)_100%)]" />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-oxygen-400/18" />
            </div>

            <div className="relative z-10 mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
                  Earth Status: <span className="text-oxygen-400">{earthStatus}</span>
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-cosmos-frost sm:text-base">
                  Real-time planetary overview combining NASA data streams, satellite signals, and space weather
                  monitoring.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-aurora-400/20 bg-aurora-400/10 px-4 py-3 text-xs font-semibold text-cosmos-frost">
                <span className="h-2 w-2 rounded-full bg-aurora-400" />
                Updated
                <span className="text-cosmos-mist">{lastUpdated}</span>
              </span>
            </div>

            <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <EarthMetric
                icon={<SunMedium className="h-5 w-5" />}
                title="Solar Activity"
                value={solarStatus}
                detail={solarDetail}
                tone="green"
              />
              <PeopleInSpaceMetric signal={peopleSignal} onViewAll={() => setShowPeoplePanel(true)} />
              <WeatherMetric
                value={weatherValue}
                detail={weatherDetail}
                signal={weatherSignal}
                selectedLocationId={selectedWeatherId}
                loading={weatherLoading}
                onSelectLocation={updateWeatherLocation}
              />
              <EarthMetric
                icon={<Orbit className="h-5 w-5" />}
                title="Earth Rotation"
                value={data.rotation.siderealDay}
                detail={rotationDetail}
                tone="white"
              />
            </div>

            <EarthContextStrip
              solarStatus={solarStatus}
              peopleCount={peopleSignal.number}
              weatherLocation={weatherSignal.locationName}
              timezone={weatherSignal.timezone}
            />

            <div className="relative z-10 mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 text-xs text-cosmos-mist sm:flex-row sm:items-center">
              <span>Source: NASA APIs</span>
              <span className="hidden h-3 w-px bg-white/12 sm:block" />
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-aurora-400" />
                {hasAnyFallback ? "Some data unavailable" : "NASA signal active"}
              </span>
              <span className="hidden h-3 w-px bg-white/12 sm:block" />
              <span>Updated: {lastUpdated}</span>
              <SaveDiscoveryButton
                discovery={createDiscovery(data)}
                className="glass-button mt-2 inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md px-3 text-xs font-bold text-cosmos-white sm:ml-auto sm:mt-0"
                label="Save dashboard"
                savedLabel="Dashboard saved"
              />
            </div>
          </article>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#0c1222]/90 p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Orbit className="h-5 w-5 text-[#00e5ff]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Orbit Intelligence</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Track live satellite orbits, space machines (ISS, Tiangong), visual overhead passes, and realtime SGP4 trajectory simulations.
              </p>
              <Link
                href="/orbit"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#00e5ff]/50 bg-[#00e5ff]/15 px-4 text-xs font-bold text-[#00e5ff] hover:bg-[#00e5ff]/30 hover:text-white transition shadow-[0_0_15px_rgba(0,229,255,0.15)]"
              >
                Launch Orbit Workspace ↗
              </Link>
            </div>
          </aside>
        </div>

        <QuickActions />
      </section>

      {showPeoplePanel ? <PeopleInSpacePanel signal={peopleSignal} onClose={() => setShowPeoplePanel(false)} /> : null}
    </main>
  );
}

function EarthDashboardHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#030712]/88 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-[1800px] items-center justify-between gap-4 px-4 sm:px-5 lg:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="COSMOS AI home">
          <Image src="/cosmos-logo.png" alt="COSMOS AI" width={44} height={44} priority className="shrink-0 object-contain" />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold tracking-normal text-cosmos-white">COSMOS AI</span>
            <span className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-cosmos-mist sm:block">
              NASA-powered cosmic intelligence
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.label === "Dashboard";
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex h-12 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition ${
                  active
                    ? "border-oxygen-400 text-oxygen-400"
                    : "border-transparent text-cosmos-frost hover:text-cosmos-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/image-explorer" className="earth-icon-button" aria-label="Search NASA images">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/dashboard" className="earth-icon-button" aria-label="Saved discoveries">
            <Bookmark className="h-5 w-5" />
          </Link>
          <AuthNavLink className="h-11 rounded-full px-3 text-xs" />
        </div>
      </nav>
    </header>
  );
}

function EarthMetric({
  icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "white";
}) {
  const toneClass = {
    green: "text-aurora-400",
    blue: "text-oxygen-400",
    white: "text-cosmos-white",
  }[tone];

  return (
    <div className="rounded-xl border border-white/10 bg-[#06101d]/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mb-5 grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-oxygen-400">
        {icon}
      </div>
      <p className="text-sm font-semibold text-cosmos-white">{title}</p>
      <p className={`mt-3 text-2xl font-bold tracking-normal ${toneClass}`}>{value}</p>
      <p className="mt-3 text-xs leading-5 text-cosmos-mist">{detail}</p>
    </div>
  );
}

function PeopleInSpaceMetric({ signal, onViewAll }: { signal: PeopleInSpaceSignal; onViewAll: () => void }) {
  const isLive = signal.status === "live" && typeof signal.number === "number";
  const visiblePeople = signal.people.slice(0, 4);

  return (
    <div className="rounded-xl border border-white/10 bg-[#06101d]/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mb-5 grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-oxygen-400">
        <Users className="h-5 w-5" />
      </div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-cosmos-white">People in Space</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
            isLive ? "bg-aurora-400/10 text-aurora-300" : "bg-white/[0.06] text-cosmos-mist"
          }`}
        >
          {isLive ? "Live" : "Unavailable"}
        </span>
      </div>
      <p className={`mt-3 text-2xl font-bold tracking-normal ${isLive ? "text-oxygen-400" : "text-cosmos-white"}`}>
        {isLive ? formatNumber(signal.number) : "--"}
      </p>
      {isLive ? (
        <div className="mt-3 grid gap-1.5">
          {visiblePeople.map((person) => (
            <p key={`${person.name}-${person.craft}`} className="truncate text-xs leading-5 text-cosmos-mist">
              <span className="text-cosmos-frost">{person.name}</span> / {person.craft}
            </p>
          ))}
          {signal.people.length > visiblePeople.length ? (
            <p className="text-xs text-cosmos-mist">+{signal.people.length - visiblePeople.length} more crew members</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-cosmos-mist">Crew data temporarily unavailable</p>
      )}
      <p className="mt-3 text-[11px] leading-5 text-cosmos-mist">
        Source: Open Notify / Updated {formatTime(signal.timestamp)}
      </p>
      <button
        type="button"
        onClick={onViewAll}
        disabled={!isLive || signal.people.length === 0}
        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.055] px-3 text-xs font-bold text-cosmos-frost transition hover:border-oxygen-400/30 hover:text-cosmos-white disabled:cursor-not-allowed disabled:opacity-55"
      >
        View all crew
      </button>
    </div>
  );
}

function WeatherMetric({
  value,
  detail,
  signal,
  selectedLocationId,
  loading,
  onSelectLocation,
}: {
  value: string;
  detail: string;
  signal: WeatherSignal;
  selectedLocationId: string;
  loading: boolean;
  onSelectLocation: (locationId: string) => void | Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#06101d]/76 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mb-5 grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.055] text-oxygen-400">
        <Cloud className="h-5 w-5" />
      </div>
      <label className="block text-sm font-semibold text-cosmos-white" htmlFor="earth-weather-location">
        Global Weather
      </label>
      <select
        id="earth-weather-location"
        value={selectedLocationId}
        disabled={loading}
        onChange={(event) => void onSelectLocation(event.target.value)}
        className="mt-3 w-full rounded-lg border border-white/10 bg-cosmos-black/45 px-3 py-2 text-xs font-semibold text-cosmos-frost outline-none transition focus:border-oxygen-400/45 disabled:opacity-60"
      >
        {weatherLocations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.label}
          </option>
        ))}
      </select>
      <p className={`mt-3 text-2xl font-bold tracking-normal ${signal.isFallback ? "text-cosmos-white" : "text-cosmos-white"}`}>
        {loading ? "Updating..." : value}
      </p>
      <p className="mt-3 text-xs leading-5 text-cosmos-mist">{loading ? "Requesting Open-Meteo signal" : detail}</p>
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2.5 text-[11px] leading-5 text-cosmos-mist">
        <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-oxygen-300" />
        <span>
          Timezone: {signal.timezone && signal.timezone !== "Unavailable" ? signal.timezone : "unavailable from feed"}
          <br />
          Source: Open-Meteo
        </span>
      </div>
    </div>
  );
}

function EarthContextStrip({
  solarStatus,
  peopleCount,
  weatherLocation,
  timezone,
}: {
  solarStatus: string;
  peopleCount: number | null;
  weatherLocation: string;
  timezone?: string;
}) {
  const facts = [
    {
      label: "Space weather context",
      body:
        solarStatus === "Low"
          ? "Low solar activity usually means fewer geomagnetic disruptions for satellites and radio systems."
          : "Elevated solar activity can affect aurora visibility, satellite operations, and radio communication.",
    },
    {
      label: "Human presence",
      body:
        typeof peopleCount === "number"
          ? `${peopleCount} people are currently listed in orbit by Open Notify. Crew names appear in the expandable panel.`
          : "Crew data is temporarily unavailable, so COSMOS does not show estimated astronauts.",
    },
    {
      label: "Weather monitoring point",
      body: `Weather is shown for ${weatherLocation}. Timezone metadata comes directly from Open-Meteo${
        timezone && timezone !== "Unavailable" ? ` (${timezone})` : ""
      }.`,
    },
  ];

  return (
    <section className="relative z-10 mt-5 grid gap-3 lg:grid-cols-3" aria-label="Earth dashboard context">
      {facts.map((fact) => (
        <article key={fact.label} className="rounded-xl border border-white/10 bg-cosmos-black/28 p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-oxygen-300">{fact.label}</p>
          <p className="mt-2 text-xs leading-5 text-cosmos-frost">{fact.body}</p>
        </article>
      ))}
    </section>
  );
}

function PeopleInSpacePanel({ signal, onClose }: { signal: PeopleInSpaceSignal; onClose: () => void }) {
  const isLive = signal.status === "live" && signal.people.length > 0;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-cosmos-black/72 px-4 py-6 backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="people-in-space-title">
      <div className="earth-dashboard-card w-full max-w-2xl overflow-hidden rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-oxygen-300">Open Notify signal</p>
            <h2 id="people-in-space-title" className="mt-2 text-2xl font-semibold tracking-normal text-cosmos-white">
              People in Space
            </h2>
            <p className="mt-2 text-sm leading-6 text-cosmos-mist">
              Names and spacecraft are shown only when the Open Notify feed responds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white"
            aria-label="Close people in space panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[62vh] overflow-auto p-5">
          {isLive ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {signal.people.map((person) => (
                <article key={`${person.name}-${person.craft}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-base font-semibold text-cosmos-white">{person.name}</p>
                  <p className="mt-2 text-sm text-cosmos-mist">Craft: {person.craft}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-cosmos-frost">
              Crew data temporarily unavailable. COSMOS will show the live list when Open Notify responds.
            </div>
          )}
        </div>
        <div className="border-t border-white/10 p-5 text-xs leading-5 text-cosmos-mist">
          Source: Open Notify / Updated {formatTime(signal.timestamp)}
        </div>
      </div>
    </div>
  );
}

function MissionAlerts({
  alerts,
}: {
  alerts: Array<{
    title: string;
    badge: string;
    body: string;
    href: string;
    sourceHref?: string;
    time: string;
    icon: ReactNode;
  }>;
}) {
  return (
    <section className="earth-dashboard-card rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-mono text-sm font-bold uppercase tracking-[0.22em] text-oxygen-400">
          <Bell className="h-4 w-4" />
          Mission Alerts
        </h2>
        <Link href="/briefing" className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-bold text-oxygen-400 transition hover:border-oxygen-400/35">
          Open Briefing
        </Link>
      </div>
      <div className="grid gap-0 overflow-hidden rounded-xl border border-white/10">
        {alerts.map((alert) => (
          <article key={alert.title} className="grid gap-3 border-b border-white/10 bg-white/[0.035] p-4 last:border-b-0 sm:grid-cols-[64px_minmax(0,1fr)_auto]">
            <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/[0.055]">{alert.icon}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-cosmos-white">{alert.title}</h3>
                <span className="rounded-full bg-white/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cosmos-frost">
                  {alert.badge}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-cosmos-frost">{alert.body}</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
              <a
                href={alert.sourceHref || alert.href}
                className="text-cosmos-mist transition hover:text-oxygen-400"
                aria-label={`Open source for ${alert.title}`}
                target={alert.sourceHref?.startsWith("http") ? "_blank" : undefined}
                rel={alert.sourceHref?.startsWith("http") ? "noreferrer" : undefined}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <span className="text-xs text-cosmos-mist">{alert.time}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EarthViewOptions({
  selectedView,
  loaded,
  onSelect,
}: {
  selectedView: EarthViewMode;
  loaded: boolean;
  onSelect: (view: EarthViewMode) => void;
}) {
  return (
    <section className="earth-dashboard-card rounded-2xl p-4 sm:p-5">
      <h2 className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-oxygen-400">Earth View Options</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ViewOption
          selected={selectedView === "2d"}
          title="2D Reference"
          subtitle="8K Earth Image"
          onClick={() => onSelect("2d")}
        />
        <ViewOption
          selected={selectedView === "3d"}
          title="3D Interactive"
          subtitle={loaded && selectedView === "3d" ? "Coming next" : "Realistic 3D Earth"}
          onClick={() => onSelect("3d")}
        />
      </div>
    </section>
  );
}

function ViewOption({
  selected,
  title,
  subtitle,
  onClick,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`group flex items-center gap-4 rounded-xl border p-3 text-left transition ${
        selected
          ? "border-oxygen-400 bg-oxygen-400/10 shadow-[0_0_26px_rgba(14,165,233,0.18)]"
          : "border-white/10 bg-white/[0.035] hover:border-oxygen-400/35"
      }`}
    >
      <span className="earth-view-thumbnail relative overflow-hidden" aria-hidden="true">
        <Image src={earthImages.thumb} alt="" fill sizes="64px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-cosmos-white">{title}</span>
        <span className="mt-1 block text-sm text-cosmos-mist">{subtitle}</span>
      </span>
      {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-oxygen-400" /> : null}
    </button>
  );
}

function EarthReferencePanel({ selectedView }: { selectedView: EarthViewMode }) {
  return (
    <section className="earth-dashboard-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
        <h2 className="font-mono text-sm font-bold uppercase tracking-[0.22em] text-solar-300">8K Earth Reference</h2>
        <button
          type="button"
          disabled
          title="Download unavailable until a verified local 8K file is added."
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-bold text-cosmos-mist"
        >
          <Download className="h-4 w-4" />
          Download 8K
        </button>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_150px] sm:p-5">
        <div className="earth-horizon-preview relative overflow-hidden" aria-label="Cinematic Earth horizon reference">
          <Image
            src={earthImages.horizon}
            alt="Earth horizon at sunrise with city lights and atmosphere"
            fill
            sizes="(min-width: 768px) 48vw, 100vw"
            className="object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0)_45%,rgba(2,6,23,0.34)_100%)]" />
        </div>
        <dl className="grid content-start gap-4 text-sm">
          <div>
            <dt className="text-cosmos-mist">Resolution</dt>
            <dd className="mt-1 text-cosmos-frost">7680 x 4320</dd>
          </div>
          <div>
            <dt className="text-cosmos-mist">Format</dt>
            <dd className="mt-1 text-cosmos-frost">JPG</dd>
          </div>
          <div>
            <dt className="text-cosmos-mist">Source</dt>
            <dd className="mt-1 text-cosmos-frost">AI generated / NASA color reference</dd>
          </div>
          {selectedView === "3d" ? (
            <div className="rounded-lg border border-solar-300/20 bg-solar-500/10 p-3 text-xs leading-5 text-solar-200">
              3D Earth preview is coming next. No iframe or heavy viewer is loaded automatically.
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section className="earth-dashboard-card rounded-2xl p-3 sm:p-4">
      <h2 className="px-2 pb-3 font-mono text-sm font-bold uppercase tracking-[0.22em] text-oxygen-400">Quick Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="group grid min-h-24 grid-cols-[48px_minmax(0,1fr)] items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-0.5 hover:border-oxygen-400/35 hover:bg-white/[0.065]"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-xl ${action.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-cosmos-white">{action.title}</span>
                <span className="mt-1 block text-xs leading-5 text-cosmos-mist">{action.detail}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
