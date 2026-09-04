"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  Bot,
  CalendarDays,
  ImageIcon,
  Orbit,
  Radio,
  Rocket,
  Sparkles,
  Telescope,
} from "lucide-react";
import {
  COSMOS_RETENTION_EVENT,
  getDailySpaceFact,
  getMissionOfDay,
  getPersonalizedRecommendations,
  readDiscoveryStreak,
  readExplorationHistory,
  recordDailyVisit,
  type DiscoveryStreak,
  type ExplorationHistory,
  type Recommendation,
} from "@/lib/cosmos-retention";
import { readSavedDiscoveries } from "@/lib/saved-discoveries";

type ContinueExploringItem = {
  title: string;
  label: string;
  description: string;
  href: string;
  icon: typeof Orbit;
  meta: string;
};

const onboardingSuggestions = [
  {
    title: "Start with today's briefing",
    description: "Get one daily space signal from APOD, asteroids, space weather, Mars, and NASA headlines.",
    href: "/briefing",
    icon: Radio,
  },
  {
    title: "Enter the planetarium",
    description: "Pick a world, compare planets, and save your favorites locally.",
    href: "/solar-system",
    icon: Orbit,
  },
  {
    title: "Search NASA images",
    description: "Explore NASA's image and video archive with full-screen viewing and source links.",
    href: "/image-explorer",
    icon: ImageIcon,
  },
];

function hasHistory(history: ExplorationHistory) {
  return Boolean(history.lastPlanet || history.lastApod || history.lastImage || history.lastAsk);
}

function formatShortDate(value?: string) {
  if (!value) return "Recently";

  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "Recently";
  }
}

export function RetentionHub() {
  const [history, setHistory] = useState<ExplorationHistory>({});
  const [streak, setStreak] = useState<DiscoveryStreak>(() => ({
    currentStreak: 0,
    bestStreak: 0,
    totalVisits: 0,
    badges: [],
  }));
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [totalDiscoveries, setTotalDiscoveries] = useState(0);
  const mission = useMemo(() => getMissionOfDay(), []);
  const fact = useMemo(() => getDailySpaceFact(), []);

  useEffect(() => {
    function syncRetention() {
      setHistory(readExplorationHistory());
      setStreak(readDiscoveryStreak());
      setRecommendations(getPersonalizedRecommendations());
      setTotalDiscoveries(readSavedDiscoveries().length);
    }

    recordDailyVisit();
    syncRetention();
    window.addEventListener(COSMOS_RETENTION_EVENT, syncRetention);
    window.addEventListener("storage", syncRetention);

    return () => {
      window.removeEventListener(COSMOS_RETENTION_EVENT, syncRetention);
      window.removeEventListener("storage", syncRetention);
    };
  }, []);

  const historyItems = [
    history.lastPlanet
      ? {
          title: history.lastPlanet.name,
          label: "Last viewed planet",
          description: history.lastPlanet.description ?? "Return to your last planetary focus.",
          href: history.lastPlanet.href,
          icon: Orbit,
          meta: formatShortDate(history.lastPlanet.viewedAt),
        }
      : null,
    history.lastApod
      ? {
          title: history.lastApod.title,
          label: "Last viewed APOD",
          description: `NASA APOD from ${history.lastApod.date}.`,
          href: history.lastApod.href,
          icon: Telescope,
          meta: formatShortDate(history.lastApod.viewedAt),
        }
      : null,
    history.lastImage
      ? {
          title: history.lastImage.title,
          label: "Last viewed image",
          description: history.lastImage.source ?? "NASA Image and Video Library",
          href: history.lastImage.href,
          icon: ImageIcon,
          meta: formatShortDate(history.lastImage.viewedAt),
        }
      : null,
    history.lastAsk
      ? {
          title: "Ask COSMOS conversation",
          label: "Last assistant topic",
          description: history.lastAsk.prompt,
          href: history.lastAsk.href,
          icon: Bot,
          meta: formatShortDate(history.lastAsk.viewedAt),
        }
      : null,
  ].filter((item): item is ContinueExploringItem => Boolean(item));

  return (
    <section className="relative z-10 py-16 md:py-20">
      <div className="cosmos-container">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="cosmos-telemetry-rule h-px w-12" />
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-oxygen-400">
                Return path
              </p>
            </div>
            <h2 className="cosmos-text-balance text-4xl font-semibold tracking-normal text-cosmos-white md:text-6xl">
              Continue Exploring
            </h2>
          </div>
          <Link
            href="/dashboard"
            className="glass-button inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-cosmos-white transition hover:border-oxygen-400/35"
          >
            Open dashboard
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-5">
            <section className="glass-panel rounded-[1.25rem] p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cosmos-mist">
                    Your last signals
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-normal">
                    {hasHistory(history) ? "Pick up where you left off." : "Begin your COSMOS path."}
                  </h3>
                </div>
                <Sparkles className="h-6 w-6 text-oxygen-400" />
              </div>

              {hasHistory(history) ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {historyItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={`${item.label}-${item.title}`}
                        href={item.href}
                        className="glass-card group rounded-lg p-4 transition hover:-translate-y-0.5 hover:border-oxygen-400/35"
                      >
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-cosmos-black/35 text-oxygen-400">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cosmos-mist">
                            {item.meta}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">
                          {item.label}
                        </p>
                        <h4 className="mt-2 line-clamp-1 text-xl font-semibold tracking-normal text-cosmos-white">
                          {item.title}
                        </h4>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-cosmos-frost">{item.description}</p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {onboardingSuggestions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="glass-card group rounded-lg p-4 transition hover:-translate-y-0.5 hover:border-oxygen-400/35"
                      >
                        <Icon className="mb-5 h-6 w-6 text-oxygen-400" />
                        <h4 className="text-lg font-semibold tracking-normal text-cosmos-white">{item.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-cosmos-frost">{item.description}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <MissionOfDayCard mission={mission} />
              <RecommendationsCard recommendations={recommendations} />
            </section>
          </div>

          <aside className="grid gap-5">
            <StreakCard streak={streak} totalDiscoveries={totalDiscoveries} />
            <SpaceFactCard fact={fact} />
          </aside>
        </div>
      </div>
    </section>
  );
}

function StreakCard({ streak, totalDiscoveries }: { streak: DiscoveryStreak; totalDiscoveries: number }) {
  return (
    <section className="glass-panel rounded-[1.25rem] p-5 md:p-6">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-solar-300">
            Discovery streak
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal">Daily return signal</h3>
        </div>
        <Award className="h-6 w-6 text-solar-300" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <RetentionMetric label="Current" value={`${streak.currentStreak}d`} />
        <RetentionMetric label="Best" value={`${streak.bestStreak}d`} />
        <RetentionMetric label="Saved" value={String(totalDiscoveries)} />
      </div>
      <div className="mt-5 grid gap-2">
        {streak.badges.map((badge) => (
          <div
            key={badge.label}
            className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs font-bold ${
              badge.unlocked
                ? "border-solar-300/30 bg-solar-500/10 text-solar-300"
                : "border-white/10 bg-white/[0.04] text-cosmos-mist"
            }`}
          >
            <span>{badge.label}</span>
            <span>{badge.unlocked ? "Unlocked" : `${badge.target} days`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MissionOfDayCard({ mission }: { mission: ReturnType<typeof getMissionOfDay> }) {
  return (
    <article className="glass-panel rounded-[1.25rem] p-5 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-aurora-400">
            Mission of the day
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal">{mission.title}</h3>
        </div>
        <Rocket className="h-6 w-6 text-aurora-400" />
      </div>
      <p className="text-sm leading-7 text-cosmos-frost">{mission.summary}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={mission.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-aurora-400 px-4 text-sm font-bold text-cosmos-black transition hover:bg-aurora-300"
        >
          Learn More
          <ArrowUpRight className="h-4 w-4" />
        </a>
        <Link
          href={{ pathname: "/ask", query: { prompt: mission.askPrompt } }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
        >
          <Bot className="h-4 w-4" />
          Ask COSMOS
        </Link>
      </div>
    </article>
  );
}

function SpaceFactCard({ fact }: { fact: ReturnType<typeof getDailySpaceFact> }) {
  return (
    <section className="glass-panel rounded-[1.25rem] p-5 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-md border border-oxygen-400/25 bg-oxygen-400/10 text-oxygen-400">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-oxygen-400">
            Space Fact
          </p>
          <p className="text-sm text-cosmos-mist">{fact.category}</p>
        </div>
      </div>
      <h3 className="text-2xl font-semibold tracking-normal text-cosmos-white">{fact.title}</h3>
      <p className="mt-4 text-sm leading-7 text-cosmos-frost">{fact.body}</p>
    </section>
  );
}

function RecommendationsCard({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <article className="glass-panel rounded-[1.25rem] p-5 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-oxygen-400">
            Recommended next
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-normal">Personalized path</h3>
        </div>
        <Telescope className="h-6 w-6 text-oxygen-400" />
      </div>
      <div className="space-y-3">
        {recommendations.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass-card group block rounded-md p-4 transition hover:border-oxygen-400/35"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cosmos-mist">{item.label}</p>
            <h4 className="mt-2 font-semibold text-cosmos-white">{item.title}</h4>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-cosmos-frost">{item.description}</p>
          </Link>
        ))}
      </div>
    </article>
  );
}

function RetentionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-cosmos-black/32 p-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-cosmos-white">{value}</p>
    </div>
  );
}
