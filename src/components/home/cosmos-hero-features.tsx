"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Compass,
  Earth,
  Flame,
  Gauge,
  Globe2,
  Moon,
  Orbit,
  Radio,
  Rocket,
  Satellite,
  Search,
  ShieldCheck,
  Sparkles,
  Telescope,
  Zap,
} from "lucide-react";
import { SaveDiscoveryButton } from "@/components/saved/save-discovery-button";
import {
  fallbackBriefing,
  formatBriefingDate,
  type DailyBriefing,
  type HomeBriefingStatus,
} from "@/components/home/home-briefing-data";
import type { SavedDiscovery } from "@/lib/saved-discoveries";

const journeyStops = [
  {
    title: "Earth",
    kicker: "Living observatory",
    href: "/solar-system?planet=earth",
    icon: Earth,
    tone: "oxygen",
  },
  {
    title: "Moon",
    kicker: "Lunar archive",
    href: "/image-explorer?q=Moon Apollo lunar surface&mediaType=image",
    icon: Moon,
    tone: "solar",
  },
  {
    title: "Mars",
    kicker: "Rover frontier",
    href: "/solar-system?planet=mars",
    icon: Compass,
    tone: "mars",
  },
  {
    title: "Jupiter",
    kicker: "Storm systems",
    href: "/solar-system?planet=jupiter",
    icon: CircleDot,
    tone: "ai",
  },
  {
    title: "Saturn",
    kicker: "Ring dynamics",
    href: "/solar-system?planet=saturn",
    icon: Orbit,
    tone: "solar",
  },
  {
    title: "Black Holes",
    kicker: "Gravity lensing",
    href: "/ask?mode=research&prompt=Find recent research papers about black holes and explain the strongest results.",
    icon: Sparkles,
    tone: "ai",
  },
  {
    title: "Galaxies",
    kicker: "Deep field",
    href: "/image-explorer?q=galaxy%20deep%20field&mediaType=image",
    icon: Telescope,
    tone: "oxygen",
  },
  {
    title: "Dark Matter",
    kicker: "Unknown structure",
    href: "/spacepedia",
    icon: Search,
    tone: "aurora",
  },
];

const quickActions = [
  {
    title: "Explore APOD",
    href: "/apod",
    icon: Telescope,
  },
  {
    title: "Search NASA Images",
    href: "/image-explorer",
    icon: Search,
  },
  {
    title: "Ask about today's briefing",
    href: "/ask?mode=briefing&prompt=Summarize%20today's%20COSMOS%20briefing%20using%20NASA%20sources.",
    icon: Sparkles,
  },
  {
    title: "Open Solar System",
    href: "/solar-system",
    icon: Orbit,
  },
  {
    title: "View saved discoveries",
    href: "/dashboard",
    icon: ShieldCheck,
  },
];

const eventRows = [
  {
    title: "Meteor shower watch",
    date: "Seasonal",
    source: "Static astronomy calendar",
    href: "/ask?mode=general&prompt=What meteor showers should I watch for this season?",
    icon: Sparkles,
  },
  {
    title: "Eclipse tracker",
    date: "Regional visibility varies",
    source: "Calendar placeholder",
    href: "/ask?mode=general&prompt=Explain upcoming solar and lunar eclipses for a beginner.",
    icon: CircleDot,
  },
  {
    title: "ISS flyover window",
    date: "Live API not connected",
    source: "Placeholder",
    href: "/ask?mode=general&prompt=How do I find the next ISS flyover for my location?",
    icon: Satellite,
  },
  {
    title: "Launch operations watch",
    date: "Mission feed placeholder",
    source: "NASA mission context",
    href: "/mission-control",
    icon: Rocket,
  },
  {
    title: "Moon phase briefing",
    date: "Daily sky context",
    source: "Static fallback",
    href: "/ask?mode=general&prompt=What is the current Moon phase and why does it matter for skywatching?",
    icon: Moon,
  },
  {
    title: "Planet opposition / conjunction",
    date: "Skywatching cycle",
    source: "Static fallback",
    href: "/solar-system",
    icon: Orbit,
  },
];

function formatDate(date?: string) {
  if (!date) return "Today";

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

function formatNumber(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function formatKm(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Awaiting NeoWs";
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value)} km`;
}

function statusLabel(data: DailyBriefing, isFallback: boolean) {
  const hazardous = data.metrics?.asteroids?.hazardous ?? 0;
  const weather =
    (data.metrics?.spaceWeather?.flares ?? 0) +
    (data.metrics?.spaceWeather?.cmes ?? 0) +
    (data.metrics?.spaceWeather?.storms ?? 0);

  if (isFallback) return "Fallback demo";
  if (hazardous > 0 || weather > 2) return "Active watch";
  return "Nominal watch";
}

function TodaySpaceSummary({
  briefing,
  status,
}: {
  briefing: DailyBriefing;
  status: HomeBriefingStatus;
}) {
  const sourceLabel = status === "loading" ? "Acquiring NASA data" : status === "ready" ? "NASA briefing endpoint" : "Data unavailable";
  const closestAsteroid = briefing.metrics.asteroids.closestName ?? "Not listed";
  const closestMiss = formatKm(briefing.metrics.asteroids.closestMissKm);
  const spaceWeatherEvents =
    briefing.metrics.spaceWeather.flares + briefing.metrics.spaceWeather.cmes + briefing.metrics.spaceWeather.storms;

  return (
    <div className="glass-card rounded-md border-oxygen-400/20 bg-oxygen-400/[0.055] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-oxygen-400">
            Today&apos;s Space Summary
          </p>
          <h4 className="mt-2 text-xl font-semibold text-cosmos-white">
            {briefing.apod?.title ?? "NASA daily signal pending"}
          </h4>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cosmos-mist">
          {sourceLabel}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SummaryMetric label="Asteroids" value={formatNumber(briefing.metrics.asteroids.total)} />
        <SummaryMetric label="Solar events" value={formatNumber(spaceWeatherEvents)} />
        <SummaryMetric label="NASA news" value={formatNumber(briefing.metrics.news.count)} />
        <SummaryMetric label="Closest object" value={closestAsteroid} detail={closestMiss} />
      </div>
    </div>
  );
}

function createSavedDiscovery(discovery: Omit<SavedDiscovery, "savedAt">): SavedDiscovery {
  return {
    ...discovery,
    savedAt: new Date().toISOString(),
  };
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-cosmos-black/[0.28] p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cosmos-mist">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-cosmos-white">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-cosmos-mist">{detail}</p> : null}
    </div>
  );
}

export function CosmosHeroFeatures({
  briefing = fallbackBriefing,
  status = "fallback",
}: {
  briefing?: DailyBriefing;
  status?: HomeBriefingStatus;
}) {
  const isFallback = status !== "ready";
  const lastUpdated = status === "loading" ? "Acquiring NASA signal" : formatBriefingDate(briefing.date);

  const alerts = useMemo(
    () => [
      {
        title: "Asteroid close-approach watch",
        body:
          (briefing.metrics?.asteroids?.total ?? 0) > 0
            ? `${formatNumber(briefing.metrics?.asteroids?.total)} near-Earth objects in today's NeoWs window. Closest: ${briefing.metrics?.asteroids?.closestName ?? "unlisted"} at ${formatKm(briefing.metrics?.asteroids?.closestMissKm)}.`
            : "No live near-Earth object count is available in this compact card right now.",
        source: isFallback ? "Data unavailable" : "NASA NeoWs",
        href: "/asteroids",
        sourceHref: "/api/nasa/neows/feed",
        icon: AlertTriangle,
      },
      {
        title: "Solar activity indicator",
        body: `${formatNumber(briefing.metrics?.spaceWeather?.flares)} flares, ${formatNumber(briefing.metrics?.spaceWeather?.cmes)} CMEs, ${formatNumber(briefing.metrics?.spaceWeather?.storms)} geomagnetic storms in the visible signal window.`,
        source: isFallback ? "Data unavailable" : "NASA DONKI",
        href: "/briefing",
        sourceHref: "/api/nasa/donki/FLR",
        icon: Flame,
      },
      {
        title: "NASA image / news update",
        body: briefing.apod?.title
          ? `Today's APOD anchor: ${briefing.apod.title}.`
          : `${formatNumber(briefing.metrics?.news?.count)} NASA headline signals are visible in the briefing endpoint.`,
        source: isFallback ? "Data unavailable" : "NASA APOD / News",
        href: "/apod",
        sourceHref: "/api/nasa/apod",
        icon: Telescope,
      },
      {
        title: "Mars rover update",
        body: "Mission Control keeps Mars imagery in the daily board when rover photos are available.",
        source: isFallback ? "Data unavailable" : "NASA Mars Rover",
        href: "/briefing",
        sourceHref: "/api/nasa/mars-rover/curiosity/manifest",
        icon: Radio,
      },
      {
        title: "Research update",
        body: "OpenAlex research cards are available inside Ask COSMOS when prompts request papers, studies, journals, or citations.",
        source: "OpenAlex / Ask COSMOS",
        href: "/ask?mode=research&prompt=Find recent astronomy research papers and summarize the strongest results.",
        sourceHref: "/api/openalex/search?q=astronomy&type=papers",
        icon: Search,
      },
    ],
    [briefing, isFallback],
  );

  const earthStatus = statusLabel(briefing, isFallback);

  return (
    <section
      id="live-observatory"
      className="premium-section relative z-10 overflow-hidden py-14 md:py-20 lg:py-24"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1600px" }}
    >
      <div className="section-glow-layer section-glow-ai opacity-80" aria-hidden="true" />
      <div className="soft-particle-field opacity-[0.24]" aria-hidden="true" />
      <div className="cosmos-container relative z-10">
        <div className="mb-10 max-w-4xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="cosmos-telemetry-rule h-px w-12" />
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-oxygen-400">
              Live Observatory Layer
            </p>
          </div>
          <h2 className="cosmos-text-balance text-3xl font-semibold tracking-normal text-cosmos-white sm:text-4xl md:text-6xl">
            Five new ways to read the sky.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-7 text-cosmos-frost md:text-lg md:leading-8">
            COSMOS now adds Earth status, mission alerts, guided journeys, universe-scale visualization, and an events
            calendar without hidden paid calls. Live data is used where the existing NASA stack is available; fallback
            cards are clearly labeled.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="glass-panel relative min-h-[620px] overflow-hidden rounded-lg p-5 md:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_34%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_70%_68%,rgba(167,139,250,0.14),transparent_26%)]" />
            <div
              className="pointer-events-none absolute right-[-14%] top-[-8%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.14),rgba(167,139,250,0.08)_42%,transparent_70%)] blur-2xl md:h-[520px] md:w-[520px]"
              aria-hidden="true"
            />
            <div className="relative z-10 flex h-full min-h-[560px] flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-oxygen-400/25 bg-oxygen-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-oxygen-400">
                  <Globe2 className="h-3.5 w-3.5" />
                  Live Earth Dashboard
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">
                    {isFallback ? "Data unavailable" : "NASA signal"}
                  </span>
                  <SaveDiscoveryButton
                    discovery={createSavedDiscovery({
                      id: `earth-status-${briefing.date || "today"}`,
                      type: "planet",
                      title: "Earth status dashboard",
                      subtitle: earthStatus,
                      description: "Saved from the COSMOS AI homepage Live Earth Dashboard.",
                      href: "/earth",
                      source: isFallback ? "COSMOS fallback state" : "NASA briefing signal",
                      metadata: {
                        date: briefing.date || "today",
                        status: earthStatus,
                      },
                    })}
                    compact
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white"
                    label="Save Earth dashboard"
                    savedLabel="Earth dashboard saved"
                  />
                </div>
              </div>

              <div className="mx-auto grid w-full max-w-[440px] place-items-center py-8">
                <div className="home-earth-preview relative h-[300px] w-full overflow-hidden rounded-xl border border-oxygen-400/20 bg-cosmos-black/50 shadow-[0_24px_90px_rgba(14,165,233,0.14)]">
                  <Image
                    src="/images/earth-dashboard/earth-thumb.jpg"
                    alt="Live Earth Dashboard preview"
                    fill
                    sizes="(min-width: 768px) 440px, 90vw"
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0)_42%,rgba(3,7,18,0.7)_100%)]" />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                </div>
              </div>

              <div>
                <h3 className="text-3xl font-semibold tracking-normal text-cosmos-white md:text-4xl">
                  Earth status: {earthStatus}
                </h3>
                <p className="mt-4 text-sm leading-7 text-cosmos-frost md:text-base md:leading-8">
                  The planet view combines a cinematic Earth, day/night city-light glow, solar activity, asteroid watch,
                  and a clearly labeled ISS-location placeholder until a live flyover API is connected.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <StatusMetric icon={<Gauge className="h-4 w-4" />} label="Solar signal" value={`${formatNumber(briefing.metrics?.spaceWeather?.flares)} flares`} />
                  <StatusMetric icon={<ShieldCheck className="h-4 w-4" />} label="Hazard flags" value={formatNumber(briefing.metrics?.asteroids?.hazardous)} />
                  <StatusMetric icon={<Satellite className="h-4 w-4" />} label="ISS position" value="Placeholder" />
                </div>
                <Link
                  href="/earth"
                  className="glass-button mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-cosmos-white"
                >
                  Open Live Earth Dashboard
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>

          <article className="glass-panel relative overflow-hidden rounded-lg p-5 md:p-7">
            <div className="mission-alert-scan" aria-hidden="true" />
            <div className="relative z-10 flex flex-col gap-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-solar-300">
                    Mission Alerts
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-normal text-cosmos-white md:text-4xl">
                    Today&apos;s watchlist in one controlled signal.
                  </h3>
                  <p className="mt-2 text-sm text-cosmos-mist">Last updated: {lastUpdated}</p>
                </div>
                <Link href="/briefing" className="glass-button inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-cosmos-white">
                  Open briefing
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <TodaySpaceSummary briefing={briefing} status={status} />

              <div className="grid gap-3">
                {alerts.map((alert) => {
                  const Icon = alert.icon;
                  const savedAlert = createSavedDiscovery({
                    id: `home-alert-${alert.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${briefing.date || "today"}`,
                    type: "briefing",
                    title: alert.title,
                    subtitle: alert.source,
                    description: alert.body,
                    href: alert.href,
                    source: alert.source,
                    metadata: {
                      date: briefing.date || "today",
                      sourceHref: alert.sourceHref,
                    },
                  });
                  return (
                    <article
                      key={alert.title}
                      className="glass-card group grid gap-3 rounded-md p-4 transition hover:border-oxygen-400/35 md:grid-cols-[44px_minmax(0,1fr)_auto]"
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-cosmos-black/34 text-oxygen-400">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-cosmos-white">{alert.title}</span>
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cosmos-mist">
                            {alert.source}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-cosmos-frost">{alert.body}</span>
                        <span className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={alert.href}
                            className="inline-flex items-center gap-2 rounded-full border border-oxygen-400/20 bg-oxygen-400/10 px-3 py-1 text-[11px] font-bold text-oxygen-400 transition hover:border-oxygen-400/40"
                          >
                            Open signal
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                          <Link
                            href={alert.sourceHref}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[11px] font-bold text-cosmos-frost transition hover:text-cosmos-white"
                          >
                            Open source page
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                          <SaveDiscoveryButton
                            discovery={savedAlert}
                            compact
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white"
                            label={`Save ${alert.title}`}
                            savedLabel={`${alert.title} saved`}
                          />
                        </span>
                      </span>
                    </article>
                  );
                })}
              </div>
            </div>
          </article>
        </div>

        <article className="glass-panel relative mt-5 overflow-hidden rounded-lg p-5 md:p-7">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-oxygen-400/70 to-transparent" />
          <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
                Quick Explore
              </p>
              <h3 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal text-cosmos-white md:text-4xl">
                Jump straight into a working COSMOS route.
              </h3>
            </div>
            <span className="text-sm text-cosmos-mist">No hidden AI calls. Ask actions are user-initiated.</span>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="glass-card group flex min-h-28 flex-col justify-between rounded-md p-4 transition hover:-translate-y-0.5 hover:border-oxygen-400/30"
                >
                  <Icon className="h-5 w-5 text-oxygen-400" />
                  <span className="mt-5 flex items-center justify-between gap-3 text-sm font-semibold text-cosmos-white">
                    {action.title}
                    <ArrowUpRight className="h-3.5 w-3.5 text-cosmos-mist transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-oxygen-400" />
                  </span>
                </Link>
              );
            })}
          </div>
        </article>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.68fr)]">
          <article className="glass-panel relative overflow-hidden rounded-lg p-5 md:p-7">
            <div
              className="pointer-events-none absolute right-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(103,232,249,0.16),rgba(167,139,250,0.1)_36%,transparent_68%)] blur-2xl"
              aria-hidden="true"
            />
            <div className="relative z-10">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
                Space Journey Mode
              </p>
              <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                <h3 className="max-w-2xl text-3xl font-semibold tracking-normal text-cosmos-white md:text-4xl">
                  A guided path from home planet to the invisible universe.
                </h3>
                <Link href="/spacepedia" className="glass-button inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-cosmos-white">
                  Open Spacepedia
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="journey-path mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {journeyStops.map((stop, index) => {
                  const Icon = stop.icon;
                  return (
                    <Link
                      key={stop.title}
                      href={stop.href}
                      className="journey-step glass-card group relative min-h-36 rounded-md p-4"
                    >
                      <span className={`journey-step__index journey-step__index--${stop.tone}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <Icon className="h-5 w-5 text-oxygen-400" />
                      <span className="mt-8 block text-lg font-semibold text-cosmos-white">{stop.title}</span>
                      <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-cosmos-mist">{stop.kicker}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </article>

          <article className="glass-panel relative min-h-[520px] overflow-hidden rounded-lg p-5 md:p-7">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_64%_52%,rgba(167,139,250,0.1),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.1),rgba(3,4,10,0.72))]"
              aria-hidden="true"
            />
            <div className="relative z-10 flex h-full min-h-[460px] flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-ai/25 bg-ai/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ai">
                  <Sparkles className="h-3.5 w-3.5" />
                  Live Universe
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">
                  Clean mode
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-semibold tracking-normal text-cosmos-white md:text-4xl">
                  Deep-space discovery without the rendering noise.
                </h3>
                <p className="mt-4 text-sm leading-7 text-cosmos-frost md:text-base md:leading-8">
                  This panel now uses static observatory-grade glow, star texture, and glass depth so the homepage stays
                  fast, readable, and free of WebGL warnings.
                </p>
                <Link
                  href="/image-explorer?q=galaxy%20black%20hole&mediaType=image"
                  className="glass-button mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold text-cosmos-white"
                >
                  Explore NASA deep-space media
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        </div>

        <article className="glass-panel relative mt-5 overflow-hidden rounded-lg p-5 md:p-7">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-solar-300/80 to-transparent" />
          <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-solar-300">
                Space Events Calendar
              </p>
              <h3 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal text-cosmos-white md:text-4xl">
                Useful sky events, clearly marked until live calendar APIs are connected.
              </h3>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">
              <CalendarDays className="h-3.5 w-3.5 text-solar-300" />
              {formatDate(briefing.date)}
            </span>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {eventRows.map((event) => {
              const Icon = event.icon;
              return (
                <Link
                  key={event.title}
                  href={event.href}
                  className="glass-card group flex min-h-36 flex-col justify-between rounded-md p-4 transition hover:border-solar-300/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-md border border-solar-300/20 bg-solar-500/10 text-solar-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cosmos-mist">
                      {event.source}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-cosmos-white">{event.title}</h4>
                    <p className="mt-1 text-sm text-cosmos-frost">{event.date}</p>
                    <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-oxygen-400">
                      Learn more
                      <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}

function StatusMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card rounded-md p-3">
      <div className="mb-3 flex items-center justify-between text-oxygen-400">
        {icon}
        <Zap className="h-3.5 w-3.5 opacity-60" />
      </div>
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cosmos-mist">{label}</p>
      <p className="mt-1 text-sm font-semibold text-cosmos-white">{value}</p>
    </div>
  );
}
