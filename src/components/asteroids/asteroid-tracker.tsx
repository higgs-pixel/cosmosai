"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Gauge,
  Loader2,
  Radar,
  Ruler,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";

type NeoWsAsteroid = {
  id?: string;
  name?: string;
  is_potentially_hazardous_asteroid?: boolean;
  estimated_diameter?: {
    meters?: {
      estimated_diameter_min?: number;
      estimated_diameter_max?: number;
    };
  };
  close_approach_data?: Array<{
    close_approach_date?: string;
    relative_velocity?: {
      kilometers_per_hour?: string;
      kilometers_per_second?: string;
    };
    miss_distance?: {
      kilometers?: string;
      lunar?: string;
    };
    orbiting_body?: string;
  }>;
};

type NeoWsFeedResponse = {
  near_earth_objects?: Record<string, NeoWsAsteroid[]>;
};

type AsteroidTrack = {
  id: string;
  name: string;
  date: string;
  sizeMeters: number;
  velocityKph: number;
  velocityKps: number;
  missDistanceKm: number;
  missDistanceLunar: number;
  hazardous: boolean;
  orbitingBody: string;
};

type AsteroidMetrics = {
  total: number;
  hazardousCount: number;
  closest: AsteroidTrack | null;
  fastest: AsteroidTrack | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(start: string, days: number) {
  const date = new Date(`${start}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en", { maximumFractionDigits }).format(value);
}

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function normalizeNeoWs(response: NeoWsFeedResponse): AsteroidTrack[] {
  return Object.entries(response.near_earth_objects ?? {})
    .flatMap(([date, asteroids]) =>
      asteroids.map((asteroid) => {
        const approach = asteroid.close_approach_data?.[0];
        const min = asteroid.estimated_diameter?.meters?.estimated_diameter_min ?? 0;
        const max = asteroid.estimated_diameter?.meters?.estimated_diameter_max ?? min;

        return {
          id: asteroid.id ?? asteroid.name ?? `${date}-${Math.random()}`,
          name: asteroid.name?.replace(/[()]/g, "") ?? "Unnamed object",
          date: approach?.close_approach_date ?? date,
          sizeMeters: (min + max) / 2,
          velocityKph: Number(approach?.relative_velocity?.kilometers_per_hour ?? 0),
          velocityKps: Number(approach?.relative_velocity?.kilometers_per_second ?? 0),
          missDistanceKm: Number(approach?.miss_distance?.kilometers ?? 0),
          missDistanceLunar: Number(approach?.miss_distance?.lunar ?? 0),
          hazardous: Boolean(asteroid.is_potentially_hazardous_asteroid),
          orbitingBody: approach?.orbiting_body ?? "Earth",
        } satisfies AsteroidTrack;
      }),
    )
    .filter((item) => item.velocityKph > 0 && item.missDistanceKm > 0)
    .sort((a, b) => a.missDistanceKm - b.missDistanceKm)
    .slice(0, 18);
}

function fallbackTracks(startDate: string): AsteroidTrack[] {
  return [
    {
      id: "fallback-1998-or2",
      name: "1998 OR2",
      date: startDate,
      sizeMeters: 2100,
      velocityKph: 31320,
      velocityKps: 8.7,
      missDistanceKm: 6280000,
      missDistanceLunar: 16.34,
      hazardous: true,
      orbitingBody: "Earth",
    },
    {
      id: "fallback-2024-xn1",
      name: "2024 XN1",
      date: addDaysIso(startDate, 1),
      sizeMeters: 86,
      velocityKph: 51240,
      velocityKps: 14.23,
      missDistanceKm: 1480000,
      missDistanceLunar: 3.85,
      hazardous: false,
      orbitingBody: "Earth",
    },
    {
      id: "fallback-2020-bx12",
      name: "2020 BX12",
      date: addDaysIso(startDate, 2),
      sizeMeters: 165,
      velocityKph: 71280,
      velocityKps: 19.8,
      missDistanceKm: 4320000,
      missDistanceLunar: 11.24,
      hazardous: false,
      orbitingBody: "Earth",
    },
    {
      id: "fallback-2019-uo",
      name: "2019 UO",
      date: addDaysIso(startDate, 3),
      sizeMeters: 42,
      velocityKph: 24120,
      velocityKps: 6.7,
      missDistanceKm: 920000,
      missDistanceLunar: 2.39,
      hazardous: false,
      orbitingBody: "Earth",
    },
  ];
}

export function AsteroidTracker() {
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(addDaysIso(todayIso(), 4));
  const [tracks, setTracks] = useState<AsteroidTrack[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const requestRef = useRef("");
  const summaryRef = useRef("");

  const selectedTrack = tracks.find((track) => track.id === selectedId) ?? tracks[0] ?? null;

  const metrics = useMemo(() => {
    const hazardousCount = tracks.filter((track) => track.hazardous).length;
    const closest = tracks.reduce<AsteroidTrack | null>(
      (current, track) => (!current || track.missDistanceKm < current.missDistanceKm ? track : current),
      null,
    );
    const fastest = tracks.reduce<AsteroidTrack | null>(
      (current, track) => (!current || track.velocityKph > current.velocityKph ? track : current),
      null,
    );

    return {
      total: tracks.length,
      hazardousCount,
      closest,
      fastest,
    };
  }, [tracks]);

  async function loadAsteroids(nextStartDate = startDate, nextEndDate = endDate) {
    const signature = `${nextStartDate}-${nextEndDate}`;
    requestRef.current = signature;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: nextStartDate,
        endDate: nextEndDate,
      });
      const response = await fetch(`/api/nasa/neows/feed?${params.toString()}`);
      if (!response.ok) throw new Error("NeoWs feed request failed.");
      const json = await response.json() as NeoWsFeedResponse;
      const normalized = normalizeNeoWs(json);
      if (requestRef.current !== signature) return;
      const nextTracks = normalized.length > 0 ? normalized : fallbackTracks(nextStartDate);
      setTracks(nextTracks);
      setSelectedId(nextTracks[0]?.id ?? null);
      setError(normalized.length > 0 ? null : "NASA returned no visible objects for this window. Showing curated fallback tracks.");
      setSummary(staticAsteroidSummary(nextTracks));
    } catch {
      if (requestRef.current !== signature) return;
      const fallback = fallbackTracks(nextStartDate);
      setTracks(fallback);
      setSelectedId(fallback[0]?.id ?? null);
      setError("NASA NeoWs is unavailable from this environment. Showing curated fallback tracks.");
      setSummary(staticAsteroidSummary(fallback));
    } finally {
      if (requestRef.current === signature) setIsLoading(false);
    }
  }

  async function generateSummary(nextTracks: AsteroidTrack[], nasaLive: boolean) {
    const signature = `${Date.now()}-${nextTracks.map((track) => track.id).join("-")}`;
    summaryRef.current = signature;
    setSummary("");
    setIsSummarizing(true);

    const summaryContext = nextTracks
      .slice(0, 8)
      .map((track) =>
        [
          `${track.name}:`,
          `size ${formatNumber(track.sizeMeters)} m`,
          `velocity ${formatNumber(track.velocityKph)} km/h`,
          `miss distance ${formatNumber(track.missDistanceKm)} km (${track.missDistanceLunar.toFixed(2)} lunar distances)`,
          `hazardous ${track.hazardous ? "yes" : "no"}`,
          `date ${track.date}`,
        ].join(" "),
      )
      .join("\n");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content:
                "Create a concise asteroid tracking briefing. Mention closest approach, fastest object, and hazard status. Do not overstate danger.",
            },
          ],
          context: {
            page: "Asteroid Tracker",
            title: nasaLive ? "NASA NeoWs near-Earth object feed" : "Fallback asteroid tracking sample",
            description: summaryContext,
          },
        }),
      });

      if (!response.body) throw new Error("No AI stream returned.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (summaryRef.current !== signature) return;
        setSummary((current) => `${current}${decoder.decode(value, { stream: true })}`);
      }
    } catch {
      if (summaryRef.current !== signature) return;
      const closest = nextTracks[0];
      setSummary(
        closest
          ? `${closest.name} is currently the closest tracked object in this view, passing at ${formatNumber(closest.missDistanceKm)} km. Hazard labels come from NASA NeoWs classification and should be read as monitoring priority, not immediate danger.`
          : "No asteroid tracks are available for this window.",
      );
    } finally {
      if (summaryRef.current === signature) setIsSummarizing(false);
    }
  }

  useEffect(() => {
    void loadAsteroids();
    // First load only; date changes are applied through the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadAsteroids();
  }

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <AnimatedStarfield />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_24%_0%,rgba(251,113,133,0.12),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(56,189,248,0.15),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.08),#03040a_86%)]" />
      <div className="noise-overlay fixed z-0" />

      <section className="relative z-10 min-h-screen px-4 py-5 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
          <header className="flex items-center justify-between rounded-full border border-white/10 bg-cosmos-black/[0.35] px-3 py-3 backdrop-blur-2xl md:px-4">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-semibold text-cosmos-frost transition hover:bg-white/[0.06] hover:text-cosmos-white"
            >
              <ArrowLeft className="h-4 w-4" />
              COSMOS AI
            </Link>

            <div className="hidden items-center gap-2 rounded-full border border-mars-400/20 bg-mars-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-mars-400 sm:flex">
              <Radar className="h-3.5 w-3.5" />
              Near-Earth Object Monitor
            </div>
          </header>

          <HeroPanel
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />

          {error ? (
            <div className="rounded-[1rem] border border-solar-300/20 bg-solar-500/10 px-5 py-4 text-sm leading-6 text-solar-300">
              {error}
            </div>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
            <section className="grid gap-5">
              <MetricStrip metrics={metrics} />
              <Charts tracks={tracks} selectedTrack={selectedTrack} />
              <AsteroidList tracks={tracks} selectedId={selectedTrack?.id ?? null} onSelect={setSelectedId} isLoading={isLoading} />
            </section>

            <aside className="grid gap-5">
              {selectedTrack ? <DetailPanel track={selectedTrack} /> : null}
              <AiSummary
                summary={summary}
                isSummarizing={isSummarizing}
                canAsk={tracks.length > 0}
                onAsk={() => void generateSummary(tracks, !error)}
              />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function staticAsteroidSummary(nextTracks: AsteroidTrack[]) {
  if (nextTracks.length === 0) {
    return "No asteroid tracks are available for this window.";
  }

  const closest = [...nextTracks].sort((left, right) => left.missDistanceKm - right.missDistanceKm)[0];
  const fastest = [...nextTracks].sort((left, right) => right.velocityKph - left.velocityKph)[0];
  const hazardousCount = nextTracks.filter((track) => track.hazardous).length;

  return [
    `${nextTracks.length} near-Earth object${nextTracks.length === 1 ? "" : "s"} are visible in this tracking window.`,
    closest ? `${closest.name} has the closest listed approach at ${formatNumber(closest.missDistanceKm)} km.` : "",
    fastest ? `${fastest.name} is the fastest listed object at ${formatNumber(fastest.velocityKph)} km/h.` : "",
    `${hazardousCount} object${hazardousCount === 1 ? "" : "s"} carry NASA's potentially hazardous classification. This is a monitoring flag, not an impact warning.`,
    "COSMOS is using available NASA and astronomy context for this local summary.",
  ]
    .filter(Boolean)
    .join(" ");
}

function HeroPanel({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  isLoading,
  onSubmit,
}: {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  isLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-cosmos-black/[0.45] shadow-void backdrop-blur-2xl">
      <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_520px] lg:p-10">
        <div>
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-mars-400/25 bg-mars-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-mars-400">
            <Target className="h-3.5 w-3.5" />
            NASA NeoWs feed
          </div>
          <h1 className="max-w-5xl text-6xl font-semibold leading-[0.86] tracking-normal sm:text-7xl md:text-8xl xl:text-9xl">
            Asteroid Tracker
          </h1>
          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-cosmos-frost md:text-lg md:leading-8">
            Monitor near-Earth object approaches with cinematic clarity: size, speed, miss distance, and NASA hazard classification without exposing raw telemetry.
          </p>
        </div>

        <form onSubmit={onSubmit} className="grid content-end gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DateInput label="Start date" value={startDate} onChange={setStartDate} />
            <DateInput label="End date" value={endDate} onChange={setEndDate} />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-oxygen-500 px-5 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            Refresh tracking window
          </button>
        </form>
      </div>
    </section>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-[1rem] border border-white/10 bg-white/[0.045] px-4 py-3">
      <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-sm font-bold text-cosmos-white outline-none"
      />
    </label>
  );
}

function MetricStrip({ metrics }: { metrics: AsteroidMetrics }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <MetricCard icon={<Radar className="h-5 w-5" />} label="Tracked" value={String(metrics.total)} tone="oxygen" />
      <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Hazard flagged" value={String(metrics.hazardousCount)} tone={metrics.hazardousCount > 0 ? "mars" : "aurora"} />
      <MetricCard icon={<Target className="h-5 w-5" />} label="Closest pass" value={metrics.closest ? `${metrics.closest.missDistanceLunar.toFixed(2)} LD` : "--"} tone="solar" />
      <MetricCard icon={<Zap className="h-5 w-5" />} label="Fastest" value={metrics.fastest ? `${formatNumber(metrics.fastest.velocityKph)} km/h` : "--"} tone="ai" />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "oxygen" | "mars" | "aurora" | "solar" | "ai";
}) {
  const toneClass = {
    oxygen: "text-oxygen-400 border-oxygen-400/20 bg-oxygen-400/10",
    mars: "text-mars-400 border-mars-400/20 bg-mars-400/10",
    aurora: "text-aurora-400 border-aurora-400/20 bg-aurora-400/10",
    solar: "text-solar-300 border-solar-300/20 bg-solar-500/10",
    ai: "text-ai border-ai/[0.24] bg-ai/10",
  }[tone];

  return (
    <div className={`rounded-[1rem] border p-5 shadow-card backdrop-blur-2xl ${toneClass}`}>
      <div className="mb-5 flex items-center justify-between">
        {icon}
        <Sparkles className="h-4 w-4 opacity-60" />
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-normal text-cosmos-white">{value}</p>
    </div>
  );
}

function Charts({
  tracks,
  selectedTrack,
}: {
  tracks: AsteroidTrack[];
  selectedTrack: AsteroidTrack | null;
}) {
  const maxVelocity = Math.max(...tracks.map((track) => track.velocityKph), 1);
  const maxSize = Math.max(...tracks.map((track) => track.sizeMeters), 1);

  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="cosmos-glass-deep rounded-[1.25rem] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
              Velocity profile
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Approach speed</h2>
          </div>
          <Gauge className="h-6 w-6 text-oxygen-400" />
        </div>
        <div className="space-y-4">
          {tracks.slice(0, 8).map((track) => (
            <div key={track.id}>
              <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                <span className="truncate font-semibold text-cosmos-frost">{track.name}</span>
                <span className="font-mono text-cosmos-mist">{formatNumber(track.velocityKph)} km/h</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${track.hazardous ? "bg-mars-400" : "bg-oxygen-400"}`}
                  style={{ width: `${Math.max(4, (track.velocityKph / maxVelocity) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cosmos-glass-deep rounded-[1.25rem] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-solar-300">
              Size field
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Relative diameter</h2>
          </div>
          <Ruler className="h-6 w-6 text-solar-300" />
        </div>
        <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.12),transparent_28%),linear-gradient(180deg,rgba(3,4,10,0.38),rgba(3,4,10,0.72))] p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <p className="text-xs leading-5 text-cosmos-mist">
              Bubble diameter is normalized to the largest object in this window.
            </p>
            <span className="shrink-0 rounded-full border border-solar-300/25 bg-solar-500/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-solar-300">
              Max {formatNumber(maxSize)} m
            </span>
          </div>

          <div className="space-y-3">
            {tracks.slice(0, 6).map((track) => {
              const size = Math.max(18, Math.min(78, (track.sizeMeters / maxSize) * 78));
              const selected = track.id === selectedTrack?.id;
              return (
                <div
                  key={track.id}
                  className={`grid items-center gap-3 rounded-[0.85rem] border px-3 py-2 sm:grid-cols-[minmax(0,1fr)_88px] ${
                    selected
                      ? "border-oxygen-400/45 bg-oxygen-400/10"
                      : track.hazardous
                        ? "border-mars-400/24 bg-mars-400/[0.08]"
                        : "border-white/10 bg-white/[0.035]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-cosmos-white">{track.name}</p>
                      <span className="shrink-0 font-mono text-xs text-cosmos-mist">{formatNumber(track.sizeMeters)} m</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full ${track.hazardous ? "bg-mars-400" : "bg-solar-300"}`}
                        style={{ width: `${Math.max(8, (track.sizeMeters / maxSize) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid h-20 place-items-center rounded-[0.75rem] border border-white/10 bg-cosmos-black/42">
                    <span
                      className={`rounded-full border ${selected ? "border-white bg-oxygen-400" : track.hazardous ? "border-mars-300/70 bg-mars-400/60" : "border-solar-200/40 bg-solar-300/45"}`}
                      style={{
                        width: size,
                        height: size,
                        boxShadow: track.hazardous ? "0 0 26px rgba(251,113,133,0.34)" : "0 0 22px rgba(245,158,11,0.22)",
                      }}
                      title={`${track.name}: ${formatNumber(track.sizeMeters)} meters`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AsteroidList({
  tracks,
  selectedId,
  onSelect,
  isLoading,
}: {
  tracks: AsteroidTrack[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  return (
    <section className="cosmos-glass-deep rounded-[1.25rem] p-5">
      <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cosmos-mist">
            Tracking list
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">Close approaches</h2>
        </div>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-oxygen-400" /> : <ShieldCheck className="h-5 w-5 text-aurora-400" />}
      </div>

      <div className="grid gap-3">
        {tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            onClick={() => onSelect(track.id)}
            className={`grid gap-4 rounded-[1rem] border p-4 text-left transition lg:grid-cols-[1fr_120px_150px_110px] ${
              track.id === selectedId
                ? "border-oxygen-400/[0.45] bg-oxygen-400/[0.10] shadow-glow-oxygen"
                : "border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.07]"
            }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${track.hazardous ? "bg-mars-400 shadow-[0_0_18px_rgba(251,113,133,0.7)]" : "bg-aurora-400 shadow-[0_0_18px_rgba(52,211,153,0.55)]"}`} />
                <p className="font-semibold text-cosmos-white">{track.name}</p>
              </div>
              <p className="mt-2 text-xs text-cosmos-mist">{formatDate(track.date)} / orbiting {track.orbitingBody}</p>
            </div>
            <ListStat label="Size" value={`${formatNumber(track.sizeMeters)} m`} />
            <ListStat label="Velocity" value={`${formatNumber(track.velocityKph)} km/h`} />
            <ListStat label="Miss" value={`${track.missDistanceLunar.toFixed(2)} LD`} />
          </button>
        ))}
      </div>
    </section>
  );
}

function ListStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">{label}</p>
      <p className="mt-1 text-sm font-semibold text-cosmos-white">{value}</p>
    </div>
  );
}

function DetailPanel({ track }: { track: AsteroidTrack }) {
  return (
    <section className="cosmos-glass-deep rounded-[1.25rem] p-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-oxygen-400">
            Selected object
          </p>
          <h2 className="mt-3 text-5xl font-semibold leading-[0.9] tracking-normal">{track.name}</h2>
        </div>
        <div className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${track.hazardous ? "border-mars-400/30 bg-mars-400/10 text-mars-400" : "border-aurora-400/30 bg-aurora-400/10 text-aurora-400"}`}>
          {track.hazardous ? "Hazard flag" : "Nominal"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DetailMetric label="Diameter" value={`${formatNumber(track.sizeMeters)} m`} />
        <DetailMetric label="Velocity" value={`${formatNumber(track.velocityKph)} km/h`} />
        <DetailMetric label="Miss distance" value={`${formatNumber(track.missDistanceKm)} km`} />
        <DetailMetric label="Lunar distance" value={`${track.missDistanceLunar.toFixed(2)} LD`} />
      </div>

      <div className="mt-6 rounded-[1rem] border border-white/10 bg-white/[0.045] p-4">
        <p className="mb-2 text-sm font-semibold text-cosmos-white">Visual indicator</p>
        <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full ${track.hazardous ? "bg-mars-400" : "bg-aurora-400"}`}
            style={{ width: `${Math.max(8, Math.min(100, 100 - track.missDistanceLunar * 3))}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-cosmos-mist">
          Hazard status is NASA&apos;s monitoring classification. It does not mean an impact is expected.
        </p>
      </div>
    </section>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-cosmos-black/30 p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-cosmos-white">{value}</p>
    </div>
  );
}

function AiSummary({
  summary,
  isSummarizing,
  canAsk,
  onAsk,
}: {
  summary: string;
  isSummarizing: boolean;
  canAsk: boolean;
  onAsk: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.25rem] border border-ai/[0.24] bg-ai/10 p-6 shadow-glow-ai">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-ai/[0.35] bg-ai/15">
            <Bot className="h-5 w-5 text-ai" />
          </span>
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-ai">COSMOS AI</p>
            <h2 className="text-xl font-semibold tracking-normal">Tracking summary</h2>
          </div>
        </div>
        {isSummarizing ? (
          <Loader2 className="h-5 w-5 animate-spin text-ai" />
        ) : (
          <button
            type="button"
            onClick={onAsk}
            disabled={!canAsk}
            className="rounded-full border border-ai/25 bg-ai/12 px-3 py-1.5 text-xs font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ask COSMOS
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-cosmos-frost">
        {summary || "Awaiting tracking signal..."}
      </p>
    </section>
  );
}
