export type ContinueExploringType = "apod" | "image-search" | "earth" | "blog" | "solar-system" | "briefing";

export type ContinueExploringItem = {
  id: string;
  type: ContinueExploringType;
  title: string;
  href: string;
  timestamp: string;
};

const CONTINUE_EXPLORING_KEY = "cosmos:continue-exploring:v1";

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function isContinueExploringItem(value: unknown): value is ContinueExploringItem {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.type === "string" &&
    typeof record.title === "string" &&
    typeof record.href === "string" &&
    typeof record.timestamp === "string"
  );
}

export function getContinueExploringItems(): ContinueExploringItem[] {
  if (!canUseStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONTINUE_EXPLORING_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isContinueExploringItem).slice(0, 24);
  } catch {
    return [];
  }
}

export function addContinueExploringItem(item: Omit<ContinueExploringItem, "timestamp"> & { timestamp?: string }) {
  if (!canUseStorage()) return false;

  const nextItem: ContinueExploringItem = {
    ...item,
    timestamp: item.timestamp || new Date().toISOString(),
  };
  const nextItems = [nextItem, ...getContinueExploringItems().filter((entry) => entry.id !== item.id)].slice(0, 24);
  window.localStorage.setItem(CONTINUE_EXPLORING_KEY, JSON.stringify(nextItems));
  return true;
}

export function clearContinueExploringItems() {
  if (!canUseStorage()) return false;
  window.localStorage.removeItem(CONTINUE_EXPLORING_KEY);
  return true;
}
