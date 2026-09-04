import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  BookOpen,
  CalendarDays,
  Camera,
  ExternalLink,
  Gauge,
  ImageIcon,
  Radio,
  Rocket,
  Satellite,
  ShieldCheck,
  Telescope,
  Zap,
  Newspaper,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import { SaveDiscoveryButton } from "@/components/saved/save-discovery-button";
import { RadialOrbitalTimeline } from "@/components/ui/radial-orbital-timeline";
import { CosmicAmbientBackground, HorizonGlow, LightStreaks, NebulaMist } from "@/components/visuals/cosmic-primitives";
import { getDailySpaceFact, type SpaceFact } from "@/lib/cosmos-retention";

export type MissionControlBriefingData = {
  date: string;
  generatedAt: string;
  apod: {
    title: string;
    date: string;
    description: string;
    mediaType: string;
    imageUrl: string;
    sourceUrl: string;
    credit: string;
    isFallback?: boolean;
  };
  asteroids: {
    total: number;
    hazardous: number;
    safe: number;
    closest: AsteroidObject | null;
    objects: AsteroidObject[];
    isFallback?: boolean;
  };
  spaceWeather: {
    counts: {
      flares: number;
      cmes: number;
      storms: number;
    };
    events: SpaceWeatherEvent[];
    isFallback?: boolean;
  };
  mars: {
    rover: string;
    status: string;
    latestSol?: number;
    latestEarthDate?: string;
    totalPhotos?: number;
    photos: MarsPhoto[];
    isFallback?: boolean;
  };
  news: NasaNewsItem[];
  missionHighlights: MissionHighlight[];
  aiSummary: {
    headline: string;
    bullets: string[];
    note: string;
    generatedBy: "openai" | "fallback";
  };
};

type NasaNewsItem = {
  title: string;
  link: string;
  pubDate?: string;
};

type AsteroidObject = {
  id: string;
  name: string;
  date: string;
  sizeMeters: number;
  velocityKph: number;
  missDistanceKm: number;
  missDistanceLunar: number;
  hazardous: boolean;
};

type SpaceWeatherEvent = {
  id: string;
  type: "Solar Flare" | "CME" | "Geomagnetic Storm";
  title: string;
  time: string;
  source: string;
  note?: string;
  link?: string;
};

type MarsPhoto = {
  id: string;
  imageUrl: string;
  earthDate: string;
  sol?: number;
  camera: string;
};

type MissionHighlight = {
  id: string;
  title: string;
  description: string;
  date?: string;
  center?: string;
  imageUrl: string;
};

function formatDate(date: string) {
  if (!date) return "Today";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date.includes("T") ? date : `${date}T00:00:00`));
  } catch {
    return date;
  }
}

function formatShortDate(date?: string) {
  if (!date) return "Latest";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(new Date(date.includes("T") ? date : `${date}T00:00:00`));
  } catch {
    return date;
  }
}

function formatNumber(value?: number, maximumFractionDigits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en", { maximumFractionDigits }).format(value);
}

function formatImageUrl(url: string) {
  return url.replace(/^http:/, "https:");
}

function getStatusTone(value: number) {
  if (value <= 0) return "text-aurora-400";
  if (value <= 2) return "text-solar-300";
  return "text-mars-400";
}

function askCosmosHref(prompt: string, mode = "general") {
  return {
    pathname: "/ask",
    query: {
      mode,
      prompt,
    },
  };
}

const fallbackNews: NasaNewsItem[] = [
  {
    title: "NASA news feed is awaiting a live signal",
    link: "https://www.nasa.gov/news/",
  },
];

function getBriefingScore(data: MissionControlBriefingData) {
  const totalWeatherEvents =
    data.spaceWeather.counts.flares + data.spaceWeather.counts.cmes + data.spaceWeather.counts.storms;
  const score = data.asteroids.hazardous * 3 + totalWeatherEvents + Math.min(data.asteroids.total, 10) / 5;

  if (data.asteroids.hazardous >= 3 || totalWeatherEvents >= 8 || score >= 9) {
    return {
      label: "Major Event Day",
      tone: "text-mars-400",
      detail: "Multiple active NASA signals are worth reading with care.",
    };
  }

  if (data.asteroids.hazardous > 0 || totalWeatherEvents >= 2 || data.asteroids.total >= 5) {
    return {
      label: "Active Day",
      tone: "text-solar-300",
      detail: "The daily board has enough activity for a deeper look.",
    };
  }

  return {
    label: "Quiet Day",
    tone: "text-aurora-400",
    detail: "A calm monitoring window with APOD as the main daily anchor.",
  };
}

export function MissionControlBriefing({ data }: { data: MissionControlBriefingData }) {
  const totalWeatherEvents =
    data.spaceWeather.counts.flares + data.spaceWeather.counts.cmes + data.spaceWeather.counts.storms;
  const apodIsImage = data.apod.mediaType === "image" && data.apod.imageUrl;
  const briefingScore = getBriefingScore(data);
  const dailyFact = getDailySpaceFact(new Date(`${data.date}T00:00:00`));

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <AnimatedStarfield />
      <CosmicAmbientBackground tone="oxygen" className="cosmic-fixed z-0" />
      <NebulaMist tone="aurora" className="cosmic-fixed z-0 opacity-[0.22]" />
      <LightStreaks tone="oxygen" className="cosmic-fixed z-0 opacity-[0.26]" />
      <HorizonGlow tone="oxygen" className="cosmic-fixed z-0 opacity-[0.26]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.14),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(167,139,250,0.14),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.08),#03040a_84%)]" />
      <div className="cosmos-orbital-grid fixed z-0" />
      <div className="noise-overlay fixed z-0" />

      <section className="relative z-10 px-4 py-5 md:px-8 md:py-8">
        <header className="glass-nav mx-auto flex w-full max-w-[1720px] items-center justify-between rounded-full px-3 py-3 md:px-4">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-semibold text-cosmos-frost transition hover:bg-white/[0.06] hover:text-cosmos-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
          >
            <ArrowLeft className="h-4 w-4" />
            COSMOS AI
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-oxygen-400/20 bg-oxygen-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-oxygen-400 sm:flex">
            <Radio className="h-3.5 w-3.5" />
            Mission Control
          </div>
        </header>

        <div className="mx-auto mt-6 max-w-[1720px]">
          <section className="glass-panel rounded-[1.25rem] p-6 md:p-8 lg:p-10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-oxygen-400/80 to-transparent" />
            <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.7fr)]">
              <div>
                <div className="mb-7 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-3 rounded-full border border-aurora-400/24 bg-aurora-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-aurora-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    NASA signal stack
                  </span>
                  <span className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cosmos-frost">
                    <CalendarDays className="h-3.5 w-3.5 text-solar-300" />
                    {formatDate(data.date)}
                  </span>
                </div>

                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.32em] text-oxygen-400">
                  Daily Cosmic Briefing
                </p>
                <h1 className="mt-4 max-w-5xl font-display text-4xl font-semibold leading-[1] tracking-normal sm:text-5xl md:text-6xl xl:text-[4.85rem]">
                  Today&apos;s space activity, cleared for launch.
                </h1>
                <p className="mt-7 max-w-3xl text-lg leading-8 text-cosmos-frost md:text-xl md:leading-9">
                  A real-time Mission Control board for NASA imagery, near-Earth object tracking, solar activity,
                  Mars surface photography, and mission media signals.
                </p>
              </div>

              <AiSummaryCard data={data} />
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-5">
            <MetricCard
              label="Briefing score"
              value={briefingScore.label}
              detail={briefingScore.detail}
              icon={<Gauge className={`h-5 w-5 ${briefingScore.tone}`} />}
            />
            <MetricCard
              label="Near-Earth objects"
              value={formatNumber(data.asteroids.total)}
              detail={`${formatNumber(data.asteroids.safe)} safe in this view`}
              icon={<Satellite className="h-5 w-5" />}
            />
            <MetricCard
              label="Hazard flags"
              value={formatNumber(data.asteroids.hazardous)}
              detail="NASA classification, not impact risk"
              icon={<AlertTriangle className={`h-5 w-5 ${getStatusTone(data.asteroids.hazardous)}`} />}
            />
            <MetricCard
              label="DONKI events"
              value={formatNumber(totalWeatherEvents)}
              detail={`${formatNumber(data.spaceWeather.counts.flares)} flares, ${formatNumber(data.spaceWeather.counts.cmes)} CMEs`}
              icon={<Zap className="h-5 w-5 text-solar-300" />}
            />
            <MetricCard
              label="Mars latest sol"
              value={formatNumber(data.mars.latestSol)}
              detail={`${data.mars.rover} rover status: ${data.mars.status}`}
              icon={<Camera className="h-5 w-5 text-mars-400" />}
            />
          </section>

          <MostImportantSignal data={data} />

          <SpaceFactPanel fact={dailyFact} />

          <section className="mt-5">
            <RadialOrbitalTimeline />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)]">
            <ApodPanel apod={data.apod} apodIsImage={Boolean(apodIsImage)} />
            <AsteroidPanel asteroids={data.asteroids} />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]">
            <SpaceWeatherPanel data={data.spaceWeather} />
            <MarsPanel data={data.mars} />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
            <NewsPanel items={data.news} />
            <WhyItMattersPanel data={data} />
          </section>

          <ExploreMorePanel data={data} />

          <MissionHighlights items={data.missionHighlights} />
        </div>
      </section>
    </main>
  );
}

function SpaceFactPanel({ fact }: { fact: SpaceFact }) {
  return (
    <section className="glass-panel mt-5 rounded-[1.25rem] p-6 md:p-7">
      <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div className="max-w-4xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
            Space Fact Widget / {fact.category}
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
            {fact.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-cosmos-frost md:text-base md:leading-8">{fact.body}</p>
        </div>
        <Link
          href={askCosmosHref(`Explain this space fact for a student: ${fact.title}. ${fact.body}`)}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-5 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
        >
          <Bot className="h-4 w-4" />
          Ask COSMOS
        </Link>
      </div>
    </section>
  );
}

function AiSummaryCard({ data }: { data: MissionControlBriefingData }) {
  const savedBriefing = {
    id: `briefing-${data.date}`,
    type: "briefing" as const,
    title: `Daily Cosmic Briefing - ${formatDate(data.date)}`,
    subtitle: data.aiSummary.headline,
    description: data.aiSummary.bullets.join(" "),
    imageUrl: data.apod.imageUrl,
    href: "/briefing",
    source: "COSMOS NASA briefing",
    savedAt: new Date().toISOString(),
    metadata: {
      asteroids: data.asteroids.total,
      hazardFlags: data.asteroids.hazardous,
      donkiEvents: data.spaceWeather.counts.flares + data.spaceWeather.counts.cmes + data.spaceWeather.counts.storms,
      marsRover: data.mars.rover,
    },
  };

  return (
    <aside className="relative overflow-hidden rounded-[1.25rem] border border-ai/24 bg-ai-aurora p-6 shadow-glow-ai md:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ai to-transparent" />
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-md border border-ai/35 bg-ai/15">
          <Radio className="h-5 w-5 text-ai" />
        </span>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-ai">
            Today in Space
          </p>
          <h2 className="text-2xl font-semibold tracking-normal">Command brief</h2>
        </div>
      </div>

      <p className="text-xl font-semibold leading-8 text-cosmos-white">{data.aiSummary.headline}</p>
      <ul className="mt-5 space-y-3">
        {data.aiSummary.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3 text-sm leading-6 text-cosmos-frost">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-ai shadow-[0_0_14px_rgba(167,139,250,0.72)]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-md border border-white/10 bg-cosmos-black/35 p-4 text-xs leading-5 text-cosmos-mist">
        {data.aiSummary.note}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono uppercase tracking-[0.18em] text-ai">
            {data.aiSummary.generatedBy === "openai" ? "AI assisted" : "Static fallback"}
          </span>
          <SaveDiscoveryButton
            discovery={savedBriefing}
            label="Save briefing"
            savedLabel="Briefing saved"
            className="inline-flex items-center gap-1.5 rounded-full border border-oxygen-400/25 bg-oxygen-400/10 px-3 py-1.5 font-semibold text-oxygen-400 transition hover:text-cosmos-white"
          />
          <Link
            href={askCosmosHref(
              `Summarize today's Daily Cosmic Briefing: ${data.aiSummary.headline} ${data.aiSummary.bullets.join(" ")}`,
            )}
            className="inline-flex items-center gap-1.5 rounded-full border border-ai/25 bg-ai/10 px-3 py-1.5 font-semibold text-ai transition hover:text-cosmos-white"
          >
            <Bot className="h-3.5 w-3.5" />
            Ask COSMOS
          </Link>
        </div>
      </div>
    </aside>
  );
}

function MostImportantSignal({ data }: { data: MissionControlBriefingData }) {
  const totalWeatherEvents =
    data.spaceWeather.counts.flares + data.spaceWeather.counts.cmes + data.spaceWeather.counts.storms;
  const closest = data.asteroids.closest;
  const leadSignal =
    data.asteroids.hazardous > 0
      ? `${data.asteroids.hazardous} near-Earth object${data.asteroids.hazardous === 1 ? "" : "s"} carrying a NASA hazard classification`
      : totalWeatherEvents > 0
        ? `${totalWeatherEvents} active DONKI space-weather signal${totalWeatherEvents === 1 ? "" : "s"} in the live window`
        : `${data.apod.title} anchors today's exploration signal`;

  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
      <article className="glass-panel rounded-[1.25rem] p-6 md:p-7">
        <div className="relative z-10">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-solar-300">
            Today&apos;s most important space signal
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal md:text-4xl">
            {leadSignal}
          </h2>
          <p className="mt-5 text-sm leading-7 text-cosmos-frost md:text-base md:leading-8">
            COSMOS ranks the daily signal by user impact: immediate sky context, planetary defense monitoring,
            solar operating conditions, and fresh mission media. Today&apos;s board is designed to be readable first,
            with source-backed panels underneath when you want the details.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={askCosmosHref(`Explain today's most important space signal: ${leadSignal}.`, "briefing")}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
            >
              <Bot className="h-4 w-4" />
              Ask COSMOS
            </Link>
            <Link
              href="/image-explorer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-bold text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.1]"
            >
              Explore archive
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>

      <article className="glass-panel rounded-[1.25rem] p-6 md:p-7">
        <div className="relative z-10">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
            Why it matters
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Telemetry label="Visual anchor" value={data.apod.title} />
            <Telemetry
              label="Closest approach"
              value={closest ? `${formatNumber(closest.missDistanceLunar, 2)} lunar distances` : "No active closest pass"}
            />
            <Telemetry label="Solar window" value={`${formatNumber(totalWeatherEvents)} DONKI events`} />
          </div>
          <p className="mt-5 text-sm leading-7 text-cosmos-frost">
            A useful daily briefing should explain what changed, why NASA is tracking it, and where to go next.
            This combines the photo story, near-Earth object board, space-weather window, Mars feed, and NASA
            headlines into one editorial front page.
          </p>
        </div>
      </article>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <article className="glass-card rounded-[1.25rem] p-5">
      <div className="relative z-10">
      <div className="mb-8 flex items-center justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cosmos-mist">{label}</p>
        <span className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-cosmos-black/35 text-oxygen-400">
          {icon}
        </span>
      </div>
      <p className="font-display text-4xl font-semibold leading-none tracking-normal md:text-5xl">{value}</p>
      <p className="mt-3 text-sm leading-6 text-cosmos-frost">{detail}</p>
      </div>
    </article>
  );
}

function ApodPanel({
  apod,
  apodIsImage,
}: {
  apod: MissionControlBriefingData["apod"];
  apodIsImage: boolean;
}) {
  return (
    <article className="glass-panel relative min-h-[560px] overflow-hidden rounded-[1.25rem] bg-cosmos-night">
      {apodIsImage ? (
        <Image
          src={formatImageUrl(apod.imageUrl)}
          alt={apod.title}
          fill
          sizes="(max-width: 1280px) 100vw, 62vw"
          priority={false}
          className="absolute inset-0 h-full w-full object-cover opacity-90 saturate-[1.08]"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_28%,rgba(56,189,248,0.32),transparent_24%),radial-gradient(circle_at_74%_60%,rgba(167,139,250,0.22),transparent_28%),linear-gradient(135deg,#111827,#03040a)]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.08),rgba(3,4,10,0.2)_40%,rgba(3,4,10,0.92)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 lg:p-10">
        <div className="mb-4 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-cosmos-black/42 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-solar-300 backdrop-blur-xl">
            <ImageIcon className="h-3.5 w-3.5" />
            APOD
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-cosmos-black/42 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cosmos-frost backdrop-blur-xl">
            {formatShortDate(apod.date)}
          </span>
        </div>
        <h2 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal md:text-5xl">{apod.title}</h2>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-cosmos-frost md:text-base md:leading-8">
          {apod.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/apod"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-oxygen-500 px-5 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400"
          >
            Open APOD story
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            href={askCosmosHref(`Explain today's APOD: ${apod.title}. ${apod.description}`, "apod")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-5 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
          >
            <Bot className="h-4 w-4" />
            Ask COSMOS
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cosmos-mist">{apod.credit}</span>
        </div>
      </div>
    </article>
  );
}

function AsteroidPanel({ asteroids }: { asteroids: MissionControlBriefingData["asteroids"] }) {
  return (
    <article className="glass-panel rounded-[1.25rem] p-6 md:p-7">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
            NeoWs Today
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">Near-Earth object board</h2>
        </div>
        <Gauge className="h-6 w-6 text-oxygen-400" />
      </div>

      {asteroids.closest ? (
        <div className="glass-card rounded-lg p-5">
          <div className="relative z-10">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-solar-300">
            Closest approach
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-normal">{asteroids.closest.name}</h3>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Telemetry label="Miss distance" value={`${formatNumber(asteroids.closest.missDistanceKm)} km`} />
            <Telemetry label="Velocity" value={`${formatNumber(asteroids.closest.velocityKph)} km/h`} />
            <Telemetry label="Size est." value={`${formatNumber(asteroids.closest.sizeMeters)} m`} />
            <Telemetry label="Hazard flag" value={asteroids.closest.hazardous ? "Potential" : "No"} />
          </div>
          </div>
        </div>
      ) : (
        <EmptySignal title="No asteroid telemetry" body="NeoWs data is quiet or unavailable for today's window." />
      )}

      <div className="mt-5 space-y-3">
        {asteroids.objects.slice(0, 5).map((object) => (
          <div
            key={object.id}
            className="glass-card flex items-center justify-between gap-4 rounded-md p-4"
          >
            <div>
              <p className="font-semibold text-cosmos-white">{object.name}</p>
              <p className="mt-1 text-xs text-cosmos-mist">{formatShortDate(object.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-cosmos-frost">{formatNumber(object.missDistanceLunar, 2)} LD</p>
              <p className={object.hazardous ? "text-xs font-bold text-mars-400" : "text-xs font-bold text-aurora-400"}>
                {object.hazardous ? "Hazard flag" : "Clear"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/asteroids"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-bold text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.1]"
        >
          Open asteroid tracker
          <ExternalLink className="h-4 w-4" />
        </Link>
        <Link
          href={askCosmosHref(
            `Explain today's near-Earth asteroid summary: ${asteroids.total} objects, ${asteroids.hazardous} hazard flags, closest ${asteroids.closest?.name ?? "unavailable"}.`,
            "asteroids",
          )}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
        >
          <Bot className="h-4 w-4" />
          Ask COSMOS
        </Link>
      </div>
    </article>
  );
}

function SpaceWeatherPanel({ data }: { data: MissionControlBriefingData["spaceWeather"] }) {
  return (
    <article className="glass-panel rounded-[1.25rem] p-6 md:p-7">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-solar-300">
            DONKI Space Weather
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">Latest solar activity</h2>
        </div>
        <Zap className="h-6 w-6 text-solar-300" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Telemetry label="Flares" value={formatNumber(data.counts.flares)} />
        <Telemetry label="CMEs" value={formatNumber(data.counts.cmes)} />
        <Telemetry label="Storms" value={formatNumber(data.counts.storms)} />
      </div>

      <div className="mt-5 space-y-3">
        {data.events.length > 0 ? (
          data.events.map((event) => (
            <a
              key={event.id}
              href={event.link ?? "https://kauai.ccmc.gsfc.nasa.gov/DONKI/"}
              target="_blank"
              rel="noreferrer"
              className="glass-card group block rounded-md p-4 transition hover:border-solar-300/35 hover:bg-solar-300/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-solar-300">{event.type}</p>
                  <h3 className="mt-2 font-semibold text-cosmos-white">{event.title}</h3>
                  <p className="mt-1 text-xs text-cosmos-mist">{formatShortDate(event.time)} | {event.source}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-cosmos-mist transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cosmos-white" />
              </div>
            </a>
          ))
        ) : (
          <EmptySignal title="No recent DONKI events" body="The current space-weather board is quiet or unavailable." />
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="https://kauai.ccmc.gsfc.nasa.gov/DONKI/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-bold text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.1]"
        >
          Open DONKI
          <ExternalLink className="h-4 w-4" />
        </a>
        <Link
          href={askCosmosHref(
            `Explain today's space weather: ${data.counts.flares} flares, ${data.counts.cmes} CMEs, ${data.counts.storms} geomagnetic storms.`,
          )}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
        >
          <Bot className="h-4 w-4" />
          Ask COSMOS
        </Link>
      </div>
    </article>
  );
}

function MarsPanel({ data }: { data: MissionControlBriefingData["mars"] }) {
  return (
    <article className="glass-panel rounded-[1.25rem] p-6 md:p-7">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-mars-400">
            Mars Surface Feed
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">{data.rover} latest photos</h2>
        </div>
        <Camera className="h-6 w-6 text-mars-400" />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Telemetry label="Sol" value={formatNumber(data.latestSol)} />
        <Telemetry label="Earth date" value={formatShortDate(data.latestEarthDate)} />
        <Telemetry label="Archive" value={formatNumber(data.totalPhotos)} />
      </div>

      {data.photos.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.photos.map((photo) => (
            <figure
              key={photo.id}
              className="glass-card overflow-hidden rounded-lg"
            >
              <div className="aspect-[1.35] overflow-hidden bg-cosmos-night">
                <Image
                  src={formatImageUrl(photo.imageUrl)}
                  alt={`${data.rover} rover image from ${photo.camera}`}
                  width={720}
                  height={540}
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 34vw"
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <figcaption className="p-4">
                <p className="text-sm font-semibold text-cosmos-white">{photo.camera}</p>
                <p className="mt-1 text-xs text-cosmos-mist">
                  Sol {formatNumber(photo.sol)} | {formatShortDate(photo.earthDate)}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <EmptySignal title="Mars photos unavailable" body="The latest rover image feed did not return photos yet." />
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/image-explorer?q=Perseverance%20Mars%20rover&mediaType=image"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm font-bold text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.1]"
        >
          Explore Mars media
          <ExternalLink className="h-4 w-4" />
        </Link>
        <Link
          href={askCosmosHref(
            `Explain the latest Mars rover briefing for ${data.rover}: status ${data.status}, sol ${data.latestSol ?? "unknown"}, latest Earth date ${data.latestEarthDate ?? "unknown"}.`,
            "mars-image",
          )}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
        >
          <Bot className="h-4 w-4" />
          Ask COSMOS
        </Link>
      </div>
    </article>
  );
}

function NewsPanel({ items }: { items: MissionControlBriefingData["news"] }) {
  const newsItems = items.length > 0 ? items : fallbackNews;
  const lead = newsItems[0];

  return (
    <article className="glass-panel rounded-[1.25rem] p-6 md:p-7">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-aurora-400">
            NASA News
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">Agency signal</h2>
        </div>
        <Newspaper className="h-6 w-6 text-aurora-400" />
      </div>

      <div className="rounded-lg border border-aurora-400/20 bg-aurora-400/10 p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-aurora-400">
          Top headline
        </p>
        <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-normal text-cosmos-white">
          {lead.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-cosmos-frost">
          {lead.pubDate ? `Published ${formatDate(lead.pubDate)}.` : "Live NASA news is unavailable, so COSMOS is showing the NASA news hub as the fallback source."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={lead.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-aurora-400 px-4 text-sm font-bold text-cosmos-black transition hover:bg-aurora-300"
          >
            Read on NASA
            <ExternalLink className="h-4 w-4" />
          </a>
          <Link
            href={askCosmosHref(`Explain why this NASA news matters: ${lead.title}.`)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
          >
            <Bot className="h-4 w-4" />
            Ask COSMOS
          </Link>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {newsItems.slice(1, 4).map((item) => (
          <a
            key={`${item.title}-${item.link}`}
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="glass-card group flex items-start justify-between gap-4 rounded-md p-4 transition hover:border-aurora-400/35 hover:bg-aurora-400/10"
          >
            <div>
              <p className="font-semibold leading-6 text-cosmos-white">{item.title}</p>
              <p className="mt-1 text-xs text-cosmos-mist">{formatShortDate(item.pubDate)}</p>
            </div>
            <ExternalLink className="mt-1 h-4 w-4 flex-none text-cosmos-mist transition group-hover:text-cosmos-white" />
          </a>
        ))}
      </div>
    </article>
  );
}

function WhyItMattersPanel({ data }: { data: MissionControlBriefingData }) {
  const points = [
    {
      title: "Images make scale tangible",
      body: `${data.apod.title} turns one sky object or mission view into a daily anchor for understanding distance, time, instruments, and light.`,
      icon: <ImageIcon className="h-5 w-5 text-solar-300" />,
    },
    {
      title: "Hazard flags need context",
      body: `${formatNumber(data.asteroids.hazardous)} potentially hazardous classification does not mean impact risk; it means NASA is tracking size, orbit, and distance carefully.`,
      icon: <ShieldCheck className="h-5 w-5 text-aurora-400" />,
    },
    {
      title: "The Sun changes the operating environment",
      body: `Space weather can affect satellites, communications, navigation, and auroras, so quiet days and active days are both useful signals.`,
      icon: <Zap className="h-5 w-5 text-solar-300" />,
    },
  ];

  return (
    <article className="glass-panel rounded-[1.25rem] p-6 md:p-7">
      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-solar-300">
              Why it matters
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">The daily signal behind the spectacle</h2>
          </div>
          <BookOpen className="h-6 w-6 text-solar-300" />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {points.map((point) => (
            <section key={point.title} className="glass-card rounded-lg p-5">
              <span className="mb-5 grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.05]">
                {point.icon}
              </span>
              <h3 className="text-lg font-semibold tracking-normal text-cosmos-white">{point.title}</h3>
              <p className="mt-3 text-sm leading-7 text-cosmos-frost">{point.body}</p>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

function ExploreMorePanel({ data }: { data: MissionControlBriefingData }) {
  const links = [
    {
      label: "APOD story",
      href: "/apod",
      detail: data.apod.title,
      icon: <ImageIcon className="h-4 w-4" />,
    },
    {
      label: "Asteroid tracker",
      href: "/asteroids",
      detail: `${formatNumber(data.asteroids.total)} objects today`,
      icon: <Satellite className="h-4 w-4" />,
    },
    {
      label: "NASA archive",
      href: "/image-explorer",
      detail: "Search images, video, and audio",
      icon: <Telescope className="h-4 w-4" />,
    },
    {
      label: "Ask COSMOS",
      href: askCosmosHref(`Give me a beginner-friendly tour of today's Cosmic Briefing: ${data.aiSummary.headline}`),
      detail: "Turn today's data into a guided explanation",
      icon: <Bot className="h-4 w-4" />,
    },
  ];

  return (
    <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="glass-card group rounded-[1rem] p-4 transition hover:-translate-y-0.5 hover:border-oxygen-400/35 hover:bg-white/[0.07]"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-cosmos-black/35 text-oxygen-400">
              {link.icon}
            </span>
            <ExternalLink className="h-4 w-4 text-cosmos-mist transition group-hover:text-cosmos-white" />
          </div>
          <p className="mt-4 font-semibold text-cosmos-white">{link.label}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-cosmos-mist">{link.detail}</p>
        </Link>
      ))}
    </section>
  );
}

function MissionHighlights({ items }: { items: MissionControlBriefingData["missionHighlights"] }) {
  return (
    <section className="mt-5 pb-10">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
            NASA Mission Highlights
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal md:text-5xl">Signals worth tracking next.</h2>
        </div>
        <a
          href="/image-explorer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 text-sm font-bold text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.1]"
        >
          Explore archive
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/image-explorer?q=${encodeURIComponent(item.title)}&mediaType=image`}
            className="glass-card group overflow-hidden rounded-[1.25rem] transition duration-300 hover:-translate-y-1 hover:border-oxygen-400/35 hover:bg-white/[0.07]"
          >
            <div className="aspect-[1.7] overflow-hidden bg-[radial-gradient(circle_at_35%_25%,rgba(56,189,248,0.25),transparent_28%),linear-gradient(135deg,#111827,#03040a)]">
              {item.imageUrl ? (
                <Image
                  src={formatImageUrl(item.imageUrl)}
                  alt={item.title}
                  width={720}
                  height={424}
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className="h-full w-full object-cover opacity-88 transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <Rocket className="h-10 w-10 text-oxygen-400" />
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-solar-300">
                {item.center ?? "NASA"} {item.date ? `| ${formatShortDate(item.date)}` : ""}
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <h3 className="text-xl font-semibold tracking-normal text-cosmos-white">{item.title}</h3>
                <ExternalLink className="mt-1 h-4 w-4 flex-none text-cosmos-mist transition group-hover:text-cosmos-white" />
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-cosmos-frost">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Telemetry({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-cosmos-black/32 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-normal text-cosmos-white">{value}</p>
    </div>
  );
}

function EmptySignal({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass-card rounded-lg p-5">
      <div className="relative z-10">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-cosmos-black/35">
          <Telescope className="h-4 w-4 text-oxygen-400" />
        </span>
        <p className="font-semibold text-cosmos-white">{title}</p>
      </div>
      <p className="text-sm leading-6 text-cosmos-mist">{body}</p>
      </div>
    </div>
  );
}
