import { readRecentQuestions } from "@/lib/cosmos-achievements";
import { readSavedDiscoveries, type SavedDiscovery } from "@/lib/saved-discoveries";

export const COSMOS_RETENTION_EVENT = "cosmos:retention-change";

const STREAK_KEY = "cosmos:daily-streak:v1";
const HISTORY_KEY = "cosmos:exploration-history:v1";

export type ExplorationHistory = {
  lastPlanet?: {
    key: string;
    name: string;
    description?: string;
    href: string;
    viewedAt: string;
  };
  lastApod?: {
    title: string;
    date: string;
    href: string;
    imageUrl?: string;
    viewedAt: string;
  };
  lastImage?: {
    title: string;
    href: string;
    imageUrl?: string;
    source?: string;
    viewedAt: string;
  };
  lastAsk?: {
    prompt: string;
    href: string;
    viewedAt: string;
  };
};

export type DiscoveryStreak = {
  currentStreak: number;
  bestStreak: number;
  totalVisits: number;
  lastVisitDate?: string;
  badges: Array<{
    label: string;
    unlocked: boolean;
    target: number;
  }>;
};

export type DailyMission = {
  id: string;
  title: string;
  summary: string;
  href: string;
  askPrompt: string;
};

export type SpaceFact = {
  category: "Daily fact" | "Planet fact" | "Mission fact" | "Astronomy fact";
  title: string;
  body: string;
};

export type Recommendation = {
  title: string;
  label: string;
  description: string;
  href: string;
};

const missions: DailyMission[] = [
  {
    id: "voyager",
    title: "Voyager",
    summary: "The Voyager probes turned the outer planets into worlds with weather, moons, rings, and long-lived interstellar signals.",
    href: "https://science.nasa.gov/mission/voyager/",
    askPrompt: "Explain the Voyager mission and why it still matters today.",
  },
  {
    id: "jwst",
    title: "James Webb Space Telescope",
    summary: "JWST studies early galaxies, star birth, exoplanets, and infrared structure hidden behind cosmic dust.",
    href: "https://science.nasa.gov/mission/webb/",
    askPrompt: "Explain what makes the James Webb Space Telescope different from Hubble.",
  },
  {
    id: "artemis",
    title: "Artemis",
    summary: "Artemis connects lunar science, human exploration systems, Gateway planning, and the path toward Mars.",
    href: "https://www.nasa.gov/humans-in-space/artemis/",
    askPrompt: "Explain NASA's Artemis program and why returning to the Moon matters.",
  },
  {
    id: "cassini",
    title: "Cassini",
    summary: "Cassini revealed Saturn's rings, moons, storms, and the ocean-world potential of Enceladus.",
    href: "https://science.nasa.gov/mission/cassini/",
    askPrompt: "Explain the Cassini mission's biggest discoveries at Saturn.",
  },
  {
    id: "curiosity",
    title: "Curiosity",
    summary: "Curiosity reads Martian rock layers and chemistry to understand whether ancient Mars had habitable environments.",
    href: "https://mars.nasa.gov/msl/",
    askPrompt: "Explain what Curiosity has taught scientists about Mars.",
  },
  {
    id: "perseverance",
    title: "Perseverance",
    summary: "Perseverance explores Jezero Crater, studies ancient environments, and collects samples for future return.",
    href: "https://mars.nasa.gov/mars2020/",
    askPrompt: "Explain Perseverance's Mars mission and sample caching goals.",
  },
  {
    id: "hubble",
    title: "Hubble",
    summary: "Hubble made deep space visually legible, from nebulae and galaxies to the expansion history of the universe.",
    href: "https://science.nasa.gov/mission/hubble/",
    askPrompt: "Explain Hubble's importance in modern astronomy.",
  },
];

const facts: SpaceFact[] = [
  {
    category: "Planet fact",
    title: "Venus rotates backward",
    body: "Venus spins in the opposite direction from most planets, and one Venus day is longer than one Venus year.",
  },
  {
    category: "Mission fact",
    title: "Voyager carries a human greeting",
    body: "Each Voyager spacecraft carries a Golden Record designed as a time capsule of Earth for any distant finder.",
  },
  {
    category: "Astronomy fact",
    title: "Looking far away is looking back",
    body: "Because light takes time to travel, deep-space telescopes observe galaxies as they existed in the past.",
  },
  {
    category: "Daily fact",
    title: "Space weather starts at the Sun",
    body: "Solar flares and coronal mass ejections can disturb satellites, radio communication, navigation, and auroras.",
  },
  {
    category: "Planet fact",
    title: "Mars has enormous volcanoes",
    body: "Olympus Mons is the tallest known volcano in the Solar System, rising far above the surrounding Martian plains.",
  },
  {
    category: "Mission fact",
    title: "JWST works in infrared",
    body: "Webb observes infrared light, helping it study cool objects, dusty regions, and light stretched by cosmic expansion.",
  },
  {
    category: "Astronomy fact",
    title: "Black holes are detected indirectly",
    body: "Scientists infer black holes by how they bend light, heat nearby matter, and affect the motion of stars and gas.",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dayIndex(date = new Date()) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

function emitRetentionEvent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COSMOS_RETENTION_EVENT));
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
  emitRetentionEvent();
}

export function readExplorationHistory(): ExplorationHistory {
  return readJson<ExplorationHistory>(HISTORY_KEY, {});
}

export function writeExplorationHistory(nextHistory: ExplorationHistory) {
  writeJson(HISTORY_KEY, nextHistory);
}

export function recordViewedPlanet(planet: { key: string; name: string; description?: string }) {
  writeExplorationHistory({
    ...readExplorationHistory(),
    lastPlanet: {
      key: planet.key,
      name: planet.name,
      description: planet.description,
      href: `/solar-system?planet=${planet.key}`,
      viewedAt: new Date().toISOString(),
    },
  });
}

export function recordViewedApod(apod: { title: string; date: string; imageUrl?: string }) {
  writeExplorationHistory({
    ...readExplorationHistory(),
    lastApod: {
      title: apod.title,
      date: apod.date,
      imageUrl: apod.imageUrl,
      href: "/apod",
      viewedAt: new Date().toISOString(),
    },
  });
}

export function recordViewedImage(image: { title: string; href: string; imageUrl?: string; source?: string }) {
  writeExplorationHistory({
    ...readExplorationHistory(),
    lastImage: {
      ...image,
      viewedAt: new Date().toISOString(),
    },
  });
}

export function recordAskCosmos(prompt: string) {
  writeExplorationHistory({
    ...readExplorationHistory(),
    lastAsk: {
      prompt,
      href: `/ask?prompt=${encodeURIComponent(prompt)}`,
      viewedAt: new Date().toISOString(),
    },
  });
}

export function recordDailyVisit(date = new Date()): DiscoveryStreak {
  const currentDate = todayKey(date);
  const previous = readJson<Omit<DiscoveryStreak, "badges">>(STREAK_KEY, {
    currentStreak: 0,
    bestStreak: 0,
    totalVisits: 0,
  });

  if (previous.lastVisitDate === currentDate) return readDiscoveryStreak();

  const yesterday = new Date(`${currentDate}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const continued = previous.lastVisitDate === todayKey(yesterday);
  const currentStreak = continued ? previous.currentStreak + 1 : 1;
  const next = {
    currentStreak,
    bestStreak: Math.max(previous.bestStreak, currentStreak),
    totalVisits: previous.totalVisits + 1,
    lastVisitDate: currentDate,
  };

  writeJson(STREAK_KEY, next);
  return readDiscoveryStreak();
}

export function readDiscoveryStreak(): DiscoveryStreak {
  const streak = readJson<Omit<DiscoveryStreak, "badges">>(STREAK_KEY, {
    currentStreak: 0,
    bestStreak: 0,
    totalVisits: 0,
  });
  const badges = [3, 7, 30].map((target) => ({
    label: `${target} Day Explorer`,
    target,
    unlocked: streak.bestStreak >= target,
  }));

  return {
    ...streak,
    badges,
  };
}

export function getMissionOfDay(date = new Date()) {
  return missions[dayIndex(date) % missions.length];
}

export function getDailySpaceFact(date = new Date()) {
  return facts[dayIndex(date) % facts.length];
}

function hasSavedType(items: SavedDiscovery[], type: SavedDiscovery["type"]) {
  return items.some((item) => item.type === type);
}

export function getPersonalizedRecommendations(): Recommendation[] {
  const history = readExplorationHistory();
  const savedItems = readSavedDiscoveries();
  const questions = readRecentQuestions(12).join(" ").toLowerCase();
  const recommendations: Recommendation[] = [];

  if (history.lastPlanet?.key) {
    recommendations.push({
      title: `${history.lastPlanet.name} mission archive`,
      label: "Planet follow-up",
      description: "Continue from your last planet with NASA imagery and mission context.",
      href: `/image-explorer?q=${encodeURIComponent(history.lastPlanet.name)}&mediaType=image`,
    });
  }

  if (history.lastImage || hasSavedType(savedItems, "nasa-image")) {
    recommendations.push({
      title: "Ask COSMOS about a saved NASA image",
      label: "Guided media",
      description: "Turn your image collection into a short source-grounded explanation.",
      href: "/ask?mode=nasa-media&prompt=Explain one of my saved NASA images like a museum curator.",
    });
  }

  if (history.lastApod || hasSavedType(savedItems, "apod")) {
    recommendations.push({
      title: "Revisit today's APOD story",
      label: "Daily return",
      description: "Use the daily image as a quick doorway into astronomy, light, distance, and discovery.",
      href: "/apod",
    });
  }

  if (/mars|rover|perseverance|curiosity/.test(questions)) {
    recommendations.push({
      title: "Mars rover archive",
      label: "Based on Ask COSMOS",
      description: "You have been asking about Mars. Explore rover imagery and surface science next.",
      href: "/image-explorer?q=Perseverance%20Mars%20rover&mediaType=image",
    });
  }

  recommendations.push(
    {
      title: "Read the Daily Cosmic Briefing",
      label: "Today in space",
      description: "APOD, asteroids, space weather, Mars, and NASA headlines in one daily board.",
      href: "/briefing",
    },
    {
      title: "Open Spacepedia",
      label: "Knowledge path",
      description: "Learn a concept, then ask COSMOS for a student-friendly explanation.",
      href: "/spacepedia",
    },
  );

  return recommendations.filter((item, index, all) => all.findIndex((candidate) => candidate.href === item.href) === index).slice(0, 4);
}
