"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  ArrowLeft,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Compass,
  ExternalLink,
  Globe2,
  ImageIcon,
  Info,
  MessageCircle,
  Orbit,
  Radio,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import { readAchievements, readRecentQuestions, type CosmosAchievement } from "@/lib/cosmos-achievements";
import {
  deleteSavedDiscovery,
  getSavedDiscoveries,
  SAVED_DISCOVERIES_EVENT,
  type SavedDiscovery,
  type SavedDiscoveryType,
} from "@/lib/saved-discoveries";
import { getBrowserAuthStatus } from "@/utils/supabase/client";

const typeLabels: Record<SavedDiscoveryType, string> = {
  apod: "Saved APODs",
  "nasa-image": "NASA images",
  planet: "Planets",
  briefing: "Briefings",
};

const typeIcons: Record<SavedDiscoveryType, typeof ImageIcon> = {
  apod: ImageIcon,
  "nasa-image": ImageIcon,
  planet: Orbit,
  briefing: Radio,
};

const startingActions = [
  {
    title: "Today's APOD",
    body: "Start with NASA's daily astronomy story",
    href: "/apod",
    icon: ImageIcon,
    tone: "text-oxygen-300 border-oxygen-400/20 bg-oxygen-400/10",
  },
  {
    title: "Explore NASA Images",
    body: "Find mission photos worth saving",
    href: "/image-explorer",
    icon: Compass,
    tone: "text-ai border-ai/20 bg-ai/10",
  },
  {
    title: "Open Earth Dashboard",
    body: "Save today's Earth status packet",
    href: "/earth",
    icon: Globe2,
    tone: "text-aurora-400 border-aurora-400/20 bg-aurora-400/10",
  },
  {
    title: "Ask COSMOS",
    body: "Turn a question into a research trail",
    href: "/ask",
    icon: MessageCircle,
    tone: "text-solar-300 border-solar-300/20 bg-solar-500/10",
  },
];

const achievementGuidance: Record<string, { how: string; path: string; tone: string; icon: typeof Award }> = {
  "apod-explorer": {
    how: "Save one Astronomy Picture of the Day from the APOD page.",
    path: "APOD -> Save story",
    tone: "border-oxygen-400/28 bg-oxygen-400/10 text-oxygen-300",
    icon: ImageIcon,
  },
  "mars-researcher": {
    how: "Save a Mars item or ask COSMOS about rovers, Perseverance, or Curiosity.",
    path: "Mars image -> Ask or save",
    tone: "border-mars-400/28 bg-mars-400/10 text-mars-300",
    icon: Orbit,
  },
  "asteroid-hunter": {
    how: "Ask about near-Earth objects or save a briefing with asteroid context.",
    path: "Briefing -> Asteroid watch",
    tone: "border-solar-300/28 bg-solar-500/10 text-solar-300",
    icon: Radio,
  },
  "planet-expert": {
    how: "Save three planets from the Solar System Explorer.",
    path: "Solar System -> Save planets",
    tone: "border-ai/28 bg-ai/10 text-ai",
    icon: Globe2,
  },
  "mission-archivist": {
    how: "Save five discoveries across APOD, NASA images, planets, and briefings.",
    path: "Explore -> Save five",
    tone: "border-aurora-400/28 bg-aurora-400/10 text-aurora-400",
    icon: Star,
  },
};

function formatSavedAt(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Saved locally";
  }
}

export function SavedDiscoveriesDashboard() {
  const [items, setItems] = useState<SavedDiscovery[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<CosmosAchievement[]>([]);
  const [accountBacked, setAccountBacked] = useState(false);

  useEffect(() => {
    let active = true;

    function syncItems() {
      void (async () => {
        const [savedItems, authStatus] = await Promise.all([getSavedDiscoveries(), getBrowserAuthStatus()]);
        if (!active) return;
        setItems(savedItems);
        setAccountBacked(authStatus.authenticated);
      })();
      setQuestions(readRecentQuestions());
      setAchievements(readAchievements());
    }

    syncItems();
    window.addEventListener(SAVED_DISCOVERIES_EVENT, syncItems);
    window.addEventListener("storage", syncItems);

    return () => {
      active = false;
      window.removeEventListener(SAVED_DISCOVERIES_EVENT, syncItems);
      window.removeEventListener("storage", syncItems);
    };
  }, []);

  const groupedItems = useMemo(() => {
    return items.reduce<Record<SavedDiscoveryType, SavedDiscovery[]>>(
      (groups, item) => {
        groups[item.type].push(item);
        return groups;
      },
      { apod: [], "nasa-image": [], planet: [], briefing: [] },
    );
  }, [items]);

  async function deleteItem(id: string) {
    await deleteSavedDiscovery(id);
    setItems(await getSavedDiscoveries());
  }

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <AnimatedStarfield />
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
            <Bookmark className="h-3.5 w-3.5" />
            {accountBacked ? "Account collection" : "Local collection"}
          </div>
        </header>

        <div className="mx-auto mt-6 max-w-[1720px]">
          <section className="glass-panel rounded-[1.25rem] p-6 md:p-8 lg:p-10">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.32em] text-oxygen-400">
              Saved Discoveries
            </p>
            <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-end">
              <div>
                <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-normal sm:text-5xl md:text-6xl">
                  Your COSMOS collection
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-cosmos-frost md:text-lg">
                  {accountBacked
                    ? "Your saved APODs, NASA media, planets, and briefings are synced to your COSMOS account when available."
                    : "You are browsing in local mode. Saved discoveries stay on this browser until you sign in, then future saves can sync to your account."}
                </p>
                <div className="mt-5 flex max-w-3xl items-start gap-3 rounded-[0.9rem] border border-oxygen-400/16 bg-oxygen-400/[0.055] p-4 text-sm leading-6 text-cosmos-frost">
                  <Info className="mt-0.5 h-4 w-4 flex-none text-oxygen-300" />
                  <p>
                    Use this space as a lightweight research shelf: save the NASA records, planets, briefings, and
                    questions you want to return to later.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <DashboardMetric
                  label="Saved items"
                  value={String(items.length)}
                  detail="APOD, images, planets, and briefings"
                />
                <DashboardMetric
                  label="Badges unlocked"
                  value={`${achievements.filter((item) => item.unlocked).length}/${achievements.length}`}
                  detail="Based on real saves and questions"
                />
                <DashboardMetric
                  label="Storage mode"
                  value={accountBacked ? "Account" : "Local"}
                  detail={accountBacked ? "Signed-in collection" : "This browser only"}
                />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <AchievementPanel achievements={achievements} />
            <RecentQuestionsPanel questions={questions} />
          </section>

          {items.length === 0 ? (
            <EmptyDashboard accountBacked={accountBacked} />
          ) : (
            <div className="mt-5 grid gap-5">
              {(Object.keys(typeLabels) as SavedDiscoveryType[]).map((type) => (
                <SavedGroup
                  key={type}
                  type={type}
                  items={groupedItems[type]}
                  onDelete={deleteItem}
                  accountBacked={accountBacked}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AchievementPanel({ achievements }: { achievements: CosmosAchievement[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function shareAchievement(achievement: CosmosAchievement) {
    const shareText = `COSMOS AI achievement unlocked: ${achievement.title} - ${achievement.description}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${achievement.title} | COSMOS AI`,
          text: shareText,
          url: window.location.origin + "/dashboard",
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${window.location.origin}/dashboard`);
        setCopiedId(achievement.id);
        window.setTimeout(() => setCopiedId(null), 2200);
      }
    } catch {
      // Sharing can be cancelled by the user. Keep the card quiet.
    }
  }

  return (
    <section className="glass-panel rounded-[1.25rem] p-6 md:p-7">
      <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-solar-300">
            Exploration badges
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal">Achievement path</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-cosmos-frost">
            Badges unlock from real actions: saved NASA records, planet saves, briefing context, and questions asked in COSMOS.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-solar-300/20 bg-solar-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-solar-300">
          <Award className="h-4 w-4" />
          Research-oriented
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {["Save a discovery", "Ask a focused question", "Build a research shelf"].map((step, index) => (
          <div key={step} className="rounded-[0.9rem] border border-white/10 bg-cosmos-black/28 p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">
              Step {index + 1}
            </p>
            <p className="mt-1 text-sm font-semibold text-cosmos-white">{step}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {achievements.map((achievement) => {
          const guidance = achievementGuidance[achievement.id] ?? achievementGuidance["mission-archivist"];
          const Icon = guidance.icon;
          const percent = Math.min(100, (achievement.progress / achievement.target) * 100);
          return (
          <article
            key={achievement.id}
            className={`relative overflow-hidden rounded-[1rem] border p-4 md:p-5 ${
              achievement.unlocked ? guidance.tone : "border-white/10 bg-cosmos-black/30 text-cosmos-mist"
            }`}
          >
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-current opacity-[0.08] blur-2xl" />
            <div className="flex items-start gap-4">
              <span
                className={`grid h-12 w-12 flex-none place-items-center rounded-[0.9rem] border ${
                  achievement.unlocked
                    ? "border-current/35 bg-current/10 text-current"
                    : "border-white/10 bg-white/[0.04] text-cosmos-mist"
                }`}
              >
                {achievement.unlocked ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-semibold leading-tight text-cosmos-white">{achievement.title}</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cosmos-mist">
                    {achievement.unlocked ? "Unlocked" : `${achievement.progress}/${achievement.target}`}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-cosmos-frost">{achievement.description}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-oxygen-400 via-ai to-solar-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-4 rounded-[0.8rem] border border-white/10 bg-cosmos-black/24 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">
                    How to unlock
                  </p>
                  <p className="mt-1 text-sm leading-6 text-cosmos-frost">{guidance.how}</p>
                  <p className="mt-2 text-xs font-semibold text-cosmos-mist">{guidance.path}</p>
                </div>
                {achievement.unlocked ? (
                  <button
                    type="button"
                    onClick={() => void shareAchievement(achievement)}
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm font-bold text-cosmos-white transition hover:border-white/25 hover:bg-white/[0.1]"
                  >
                    <Share2 className="h-4 w-4" />
                    {copiedId === achievement.id ? "Copied" : "Share milestone"}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        );
        })}
      </div>
    </section>
  );
}

function RecentQuestionsPanel({ questions }: { questions: string[] }) {
  return (
    <section className="glass-panel rounded-[1.25rem] p-6 md:p-7">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-ai">
            Ask COSMOS memory
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">Recently asked</h2>
        </div>
        <MessageCircle className="h-6 w-6 text-ai" />
      </div>
      {questions.length > 0 ? (
        <div className="space-y-3">
          {questions.slice(0, 6).map((question) => (
            <Link
              key={question}
              href={{ pathname: "/ask", query: { prompt: question } }}
              className="glass-card block rounded-md p-4 text-sm leading-6 text-cosmos-frost transition hover:border-ai/35 hover:text-cosmos-white"
            >
              {question}
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-cosmos-black/30 p-5">
          <p className="text-sm leading-6 text-cosmos-mist">
            Ask COSMOS questions will appear here after you use the assistant. Nothing is sent to a user account.
          </p>
          <Link
            href="/ask"
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
          >
            Ask COSMOS
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

function SavedGroup({
  type,
  items,
  onDelete,
  accountBacked,
}: {
  type: SavedDiscoveryType;
  items: SavedDiscovery[];
  onDelete: (id: string) => void | Promise<void>;
  accountBacked: boolean;
}) {
  const Icon = typeIcons[type];
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-cosmos-black/35 text-oxygen-400">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cosmos-mist">
            {typeLabels[type]}
          </p>
          <p className="mt-1 text-sm text-cosmos-frost">
            {items.length} saved {accountBacked ? "to your account" : "locally"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <SavedCard key={item.id} item={item} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function SavedCard({ item, onDelete }: { item: SavedDiscovery; onDelete: (id: string) => void | Promise<void> }) {
  const Icon = typeIcons[item.type];

  return (
    <article className="glass-card group overflow-hidden rounded-[1.15rem]">
      {item.imageUrl ? (
        <div className="relative aspect-[1.55] overflow-hidden bg-cosmos-night">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover opacity-90 transition duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="grid aspect-[1.55] place-items-center bg-[radial-gradient(circle_at_35%_25%,rgba(56,189,248,0.25),transparent_28%),linear-gradient(135deg,#111827,#03040a)]">
          <Bookmark className="h-10 w-10 text-oxygen-400" />
        </div>
      )}
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cosmos-mist">
            <Icon className="h-3.5 w-3.5 text-oxygen-400" />
            {typeLabels[item.type].replace("Saved ", "")}
          </span>
          <button
            type="button"
            onClick={() => void onDelete(item.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-cosmos-mist transition hover:border-mars-400/40 hover:text-mars-400"
            aria-label={`Remove ${item.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-xl font-semibold leading-tight tracking-normal text-cosmos-white">{item.title}</h2>
        {item.subtitle ? <p className="mt-2 text-sm font-semibold text-oxygen-300">{item.subtitle}</p> : null}
        {item.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-cosmos-frost">{item.description}</p>
        ) : null}
        <div className="mt-4 flex items-center gap-2 text-xs text-cosmos-mist">
          <CalendarDays className="h-3.5 w-3.5 text-oxygen-400" />
          Saved {formatSavedAt(item.savedAt)}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {item.href ? (
            <Link
              href={item.href}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-oxygen-500 px-4 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400"
            >
              Open
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
          {item.source ? (
            <span className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-xs font-bold uppercase tracking-[0.16em] text-cosmos-mist">
              {item.source}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DashboardMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="glass-card rounded-[1rem] p-5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">{label}</p>
      <p className="mt-2 text-3xl font-semibold leading-none text-cosmos-white md:text-4xl">{value}</p>
      <p className="mt-3 text-sm leading-6 text-cosmos-frost">{detail}</p>
    </div>
  );
}

function EmptyDashboard({ accountBacked }: { accountBacked: boolean }) {
  return (
    <section className="glass-panel mt-5 overflow-hidden rounded-[1.25rem] p-6 md:p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-oxygen-400/25 bg-oxygen-400/10 text-oxygen-400 shadow-[0_0_34px_rgba(56,189,248,0.14)]">
            <Bookmark className="h-7 w-7" />
          </div>
          <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-oxygen-300">
            Collection empty
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal md:text-4xl">Start your research shelf</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-cosmos-frost md:text-base">
            Save the NASA stories, images, planets, and briefings you want to revisit. {accountBacked
              ? "You are signed in, so supported saves can sync through your COSMOS account."
              : "You are signed out, so saves stay private to this browser until you choose to sign in."}
          </p>
          <div className="mt-5 flex items-start gap-3 rounded-[0.9rem] border border-white/10 bg-cosmos-black/28 p-4 text-sm leading-6 text-cosmos-mist">
            <Info className="mt-0.5 h-4 w-4 flex-none text-oxygen-300" />
            <p>No demo items are shown here. This page only displays discoveries you actually save.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {startingActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className={`group rounded-[1rem] border p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.07] ${action.tone}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-[0.85rem] border border-current/20 bg-current/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ExternalLink className="h-4 w-4 opacity-60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-tight text-cosmos-white">{action.title}</h3>
                <p className="mt-2 text-sm leading-6 text-cosmos-frost">{action.body}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
