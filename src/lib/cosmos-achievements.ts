import { SAVED_DISCOVERIES_KEY, type SavedDiscovery } from "@/lib/saved-discoveries";

export type CosmosAchievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

const ASSISTANT_MEMORY_KEY = "cosmos:assistant-history";
const ACHIEVEMENTS_KEY = "cosmos:achievements:v1";

type StoredMessage = {
  role?: string;
  content?: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function readSavedItems() {
  if (!canUseStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_DISCOVERIES_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as SavedDiscovery[]) : [];
  } catch {
    return [];
  }
}

export function readRecentQuestions(limit = 8) {
  if (!canUseStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ASSISTANT_MEMORY_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((message): message is StoredMessage => {
        return (
          typeof message === "object" &&
          message !== null &&
          message.role === "user" &&
          typeof message.content === "string" &&
          message.content.trim().length > 0
        );
      })
      .map((message) => message.content!.trim())
      .slice(-limit)
      .reverse();
  } catch {
    return [];
  }
}

function countMatches(values: string[], pattern: RegExp) {
  return values.filter((value) => pattern.test(value)).length;
}

export function readAchievements(): CosmosAchievement[] {
  const savedItems = readSavedItems();
  const questions = readRecentQuestions(24);
  const searchable = [
    ...savedItems.map((item) => `${item.title} ${item.description ?? ""} ${item.type}`),
    ...questions,
  ];

  const definitions: Array<Omit<CosmosAchievement, "unlocked" | "progress"> & { progress: number }> = [
    {
      id: "apod-explorer",
      title: "APOD Explorer",
      description: "Save an Astronomy Picture of the Day.",
      progress: savedItems.filter((item) => item.type === "apod").length,
      target: 1,
    },
    {
      id: "mars-researcher",
      title: "Mars Researcher",
      description: "Save or ask about Mars exploration.",
      progress: countMatches(searchable, /mars|rover|perseverance|curiosity/i),
      target: 1,
    },
    {
      id: "asteroid-hunter",
      title: "Asteroid Hunter",
      description: "Ask about asteroid tracking or save a briefing with asteroid context.",
      progress: countMatches(searchable, /asteroid|near-earth|neows|planetary defense/i),
      target: 1,
    },
    {
      id: "planet-expert",
      title: "Planet Expert",
      description: "Save three planets from the Solar System Explorer.",
      progress: savedItems.filter((item) => item.type === "planet").length,
      target: 3,
    },
    {
      id: "mission-archivist",
      title: "Mission Archivist",
      description: "Save five discoveries across COSMOS.",
      progress: savedItems.length,
      target: 5,
    },
  ];

  const achievements = definitions.map((achievement) => ({
    ...achievement,
    progress: Math.min(achievement.progress, achievement.target),
    unlocked: achievement.progress >= achievement.target,
  }));

  if (canUseStorage()) {
    const unlockedIds = achievements.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id);
    window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedIds));
  }

  return achievements;
}
