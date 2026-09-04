"use client";

import { useEffect, useState, type FormEvent, type PointerEvent } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Bot,
  CloudSun,
  ExternalLink,
  Globe2,
  Grip,
  ImageIcon,
  Maximize2,
  Newspaper,
  Orbit,
  Save,
  Satellite,
  Sparkles,
} from "lucide-react";
import { getSavedDiscoveries, type SavedDiscovery } from "@/lib/saved-discoveries";
import type {
  MissionControlDashboardData,
  MissionControlWidgetId,
} from "./types";

export type WidgetDefinition = {
  id: MissionControlWidgetId;
  title: string;
  eyebrow: string;
  icon: typeof Globe2;
  minW: number;
  minH: number;
};

export const MISSION_CONTROL_WIDGETS: WidgetDefinition[] = [
  { id: "earth", title: "Earth Dashboard", eyebrow: "Planet status", icon: Globe2, minW: 4, minH: 3 },
  { id: "iss", title: "ISS Tracker", eyebrow: "Orbital signal", icon: Satellite, minW: 3, minH: 3 },
  { id: "apod", title: "APOD", eyebrow: "NASA media", icon: ImageIcon, minW: 4, minH: 3 },
  { id: "space-weather", title: "Space Weather", eyebrow: "Solar watch", icon: CloudSun, minW: 3, minH: 3 },
  { id: "asteroids", title: "Asteroids", eyebrow: "NeoWs", icon: Orbit, minW: 3, minH: 3 },
  { id: "research", title: "Research Papers", eyebrow: "OpenAlex", icon: BookOpen, minW: 4, minH: 3 },
  { id: "blog", title: "Blog Feed", eyebrow: "Editorial", icon: Newspaper, minW: 4, minH: 3 },
  { id: "ask", title: "Ask COSMOS Mini", eyebrow: "Assistant", icon: Bot, minW: 4, minH: 3 },
  { id: "saved", title: "Saved Discoveries", eyebrow: "Library", icon: Save, minW: 3, minH: 3 },
  { id: "stats", title: "Personal Statistics", eyebrow: "Progress", icon: Activity, minW: 3, minH: 3 },
];

const widgetMap = new Map(MISSION_CONTROL_WIDGETS.map((widget) => [widget.id, widget]));

export function getWidgetDefinition(id: MissionControlWidgetId) {
  return widgetMap.get(id) ?? MISSION_CONTROL_WIDGETS[0];
}

function formatNumber(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function formatKm(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${formatNumber(value)} km`;
}

function WidgetLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-bold text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-cosmos-black/28 p-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">{label}</p>
      <p className="mt-1 text-lg font-semibold text-cosmos-white">{value}</p>
    </div>
  );
}

function EarthWidget({ data }: { data: MissionControlDashboardData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-oxygen-400/18 bg-[radial-gradient(circle_at_70%_20%,rgba(56,189,248,0.24),transparent_28%),linear-gradient(135deg,rgba(7,13,24,0.92),rgba(3,4,10,0.92))] p-4">
        <p className="text-sm leading-6 text-cosmos-frost">Earth status from the Live Earth Dashboard.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniMetric label="Solar flares" value={formatNumber(data.earth.spaceWeather.flares)} />
          <MiniMetric label="Kp index" value={data.earth.spaceWeather.latestKp?.toFixed(1) ?? "--"} />
          <MiniMetric label="Weather" value={`${formatNumber(data.earth.weather.temperatureC)}°C`} />
          <MiniMetric label="Rotation" value={data.earth.rotation.siderealDay} />
        </div>
      </div>
      <WidgetLink href="/earth" label="Open Earth" />
    </div>
  );
}

function IssWidget({ data }: { data: MissionControlDashboardData }) {
  const [iss, setIss] = useState(data.earth.iss);

  useEffect(() => {
    let active = true;

    async function refreshIss() {
      try {
        const response = await fetch("/api/earth/iss", { headers: { Accept: "application/json" } });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          latitude?: number | null;
          longitude?: number | null;
          timestamp?: string;
        };
        if (active) {
          setIss((current) => ({
            ...current,
            latitude: typeof payload.latitude === "number" ? payload.latitude : current.latitude,
            longitude: typeof payload.longitude === "number" ? payload.longitude : current.longitude,
            timestamp: payload.timestamp ?? current.timestamp,
            isFallback: false,
          }));
        }
      } catch {
        if (active) setIss((current) => ({ ...current, isFallback: true }));
      }
    }

    const interval = window.setInterval(refreshIss, 15_000);
    void refreshIss();
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-3">
      <MiniMetric label="Latitude" value={iss.latitude?.toFixed(2) ?? "--"} />
      <MiniMetric label="Longitude" value={iss.longitude?.toFixed(2) ?? "--"} />
      <MiniMetric label="Altitude" value={iss.altitudeKm ? `${formatNumber(iss.altitudeKm)} km` : "--"} />
      <p className="text-xs leading-5 text-cosmos-mist">
        Source: Open Notify / Earth dashboard. {iss.isFallback ? "Signal temporarily unavailable." : "Refreshing quietly."}
      </p>
    </div>
  );
}

function ApodWidget({ data }: { data: MissionControlDashboardData }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <p className="font-semibold leading-6 text-cosmos-white">{data.earth.apod.title}</p>
        <p className="mt-2 text-sm text-cosmos-mist">{data.earth.apod.date}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <WidgetLink href="/apod" label="Open APOD" />
        <WidgetLink href={`/ask?mode=apod&prompt=${encodeURIComponent(`Explain today's APOD: ${data.earth.apod.title}`)}`} label="Ask" />
      </div>
    </div>
  );
}

function SpaceWeatherWidget({ data }: { data: MissionControlDashboardData }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MiniMetric label="Flares" value={formatNumber(data.earth.spaceWeather.flares)} />
      <MiniMetric label="CMEs" value={formatNumber(data.earth.spaceWeather.cmes)} />
      <MiniMetric label="Storms" value={formatNumber(data.earth.spaceWeather.storms)} />
      <MiniMetric label="Kp" value={data.earth.spaceWeather.latestKp?.toFixed(1) ?? "--"} />
    </div>
  );
}

function AsteroidsWidget({ data }: { data: MissionControlDashboardData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MiniMetric label="Objects" value={formatNumber(data.earth.asteroids.total)} />
        <MiniMetric label="Hazard flags" value={formatNumber(data.earth.asteroids.hazardous)} />
      </div>
      <p className="text-sm leading-6 text-cosmos-frost">
        Closest: {data.earth.asteroids.closestName || "Unavailable"} at {formatKm(data.earth.asteroids.closestMissKm)}.
      </p>
      <WidgetLink href="/asteroids" label="Open tracker" />
    </div>
  );
}

function ResearchWidget({ data }: { data: MissionControlDashboardData }) {
  return (
    <div className="space-y-3">
      {data.researchPapers.slice(0, 3).map((paper) => (
        <a
          key={paper.title}
          href={paper.href ?? "/ask?mode=research"}
          target={paper.href ? "_blank" : undefined}
          rel={paper.href ? "noreferrer" : undefined}
          className="block rounded-md border border-white/10 bg-white/[0.04] p-3 transition hover:border-oxygen-400/35"
        >
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-cosmos-white">{paper.title}</p>
          <p className="mt-1 text-xs text-cosmos-mist">
            {paper.year ?? "Recent"} · {formatNumber(paper.citationCount)} citations
          </p>
        </a>
      ))}
      <WidgetLink href="/ask?mode=research&prompt=Find%20recent%20astronomy%20research%20papers" label="Research mode" />
    </div>
  );
}

function BlogWidget({ data }: { data: MissionControlDashboardData }) {
  return (
    <div className="space-y-3">
      {data.blogPosts.slice(0, 3).map((post) => (
        <Link
          key={post.slug}
          href={`/blog/${post.slug}`}
          className="block rounded-md border border-white/10 bg-white/[0.04] p-3 transition hover:border-aurora-400/35"
        >
          <p className="text-sm font-semibold leading-5 text-cosmos-white">{post.title}</p>
          <p className="mt-1 text-xs text-cosmos-mist">{post.category} · {post.readingTime}</p>
        </Link>
      ))}
    </div>
  );
}

function AskMiniWidget() {
  const [prompt, setPrompt] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = prompt.trim() || "Summarize my mission control dashboard";
    window.location.href = `/ask?mode=briefing&prompt=${encodeURIComponent(query)}`;
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Ask about today’s signals..."
        className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-cosmos-black/40 p-3 text-sm leading-6 text-cosmos-white outline-none placeholder:text-cosmos-slate focus:border-ai/45"
      />
      <button className="inline-flex h-10 items-center gap-2 rounded-full bg-ai px-4 text-sm font-bold text-white">
        <Sparkles className="h-4 w-4" />
        Ask COSMOS
      </button>
    </form>
  );
}

function SavedWidget() {
  const [items, setItems] = useState<SavedDiscovery[]>([]);

  useEffect(() => {
    void getSavedDiscoveries().then((discoveries) => setItems(discoveries.slice(0, 4)));
  }, []);

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        items.map((item) => (
          <Link key={item.id} href={item.href ?? "/dashboard"} className="block rounded-md border border-white/10 bg-white/[0.04] p-3">
            <p className="text-sm font-semibold text-cosmos-white">{item.title}</p>
            <p className="mt-1 text-xs text-cosmos-mist">{item.type}</p>
          </Link>
        ))
      ) : (
        <p className="text-sm leading-6 text-cosmos-mist">No saved discoveries yet. Save APODs, images, planets, and briefings as you explore.</p>
      )}
      <WidgetLink href="/dashboard" label="Open dashboard" />
    </div>
  );
}

function StatsWidget({ data }: { data: MissionControlDashboardData }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MiniMetric label="Signals" value="10" />
      <MiniMetric label="Updated" value={new Date(data.generatedAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} />
      <MiniMetric label="Widgets" value={String(MISSION_CONTROL_WIDGETS.length)} />
      <MiniMetric label="Account" value={data.userEmail ? "Active" : "Local"} />
    </div>
  );
}

export function WidgetFrame({
  id,
  data,
  onDragStart,
  onResizeStart,
}: {
  id: MissionControlWidgetId;
  data: MissionControlDashboardData;
  onDragStart: (id: MissionControlWidgetId, event: PointerEvent) => void;
  onResizeStart: (id: MissionControlWidgetId, event: PointerEvent) => void;
}) {
  const definition = getWidgetDefinition(id);
  const Icon = definition.icon;

  return (
    <article className="glass-panel group flex h-full min-h-0 flex-col overflow-hidden rounded-[1.05rem] p-4 md:p-5">
      <header
        className="mb-4 flex cursor-grab touch-none items-start justify-between gap-3 border-b border-white/10 pb-3 active:cursor-grabbing"
        onPointerDown={(event) => onDragStart(id, event)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-md border border-oxygen-400/20 bg-oxygen-400/10 text-oxygen-300">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">{definition.eyebrow}</p>
            <h2 className="truncate text-lg font-semibold text-cosmos-white">{definition.title}</h2>
          </div>
        </div>
        <Grip className="mt-2 h-4 w-4 flex-none text-cosmos-slate opacity-70" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {id === "earth" ? <EarthWidget data={data} /> : null}
        {id === "iss" ? <IssWidget data={data} /> : null}
        {id === "apod" ? <ApodWidget data={data} /> : null}
        {id === "space-weather" ? <SpaceWeatherWidget data={data} /> : null}
        {id === "asteroids" ? <AsteroidsWidget data={data} /> : null}
        {id === "research" ? <ResearchWidget data={data} /> : null}
        {id === "blog" ? <BlogWidget data={data} /> : null}
        {id === "ask" ? <AskMiniWidget /> : null}
        {id === "saved" ? <SavedWidget /> : null}
        {id === "stats" ? <StatsWidget data={data} /> : null}
      </div>

      <button
        type="button"
        onPointerDown={(event) => onResizeStart(id, event)}
        className="absolute bottom-3 right-3 hidden h-8 w-8 touch-none items-center justify-center rounded-full border border-white/10 bg-cosmos-black/70 text-cosmos-mist transition hover:border-oxygen-400/35 hover:text-cosmos-white md:flex"
        aria-label={`Resize ${definition.title} widget`}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}
