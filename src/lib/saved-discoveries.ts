import { getBrowserAuthStatus } from "@/utils/supabase/client";

export type SavedDiscoveryType = "apod" | "nasa-image" | "planet" | "briefing";

export type SavedDiscovery = {
  id: string;
  type: SavedDiscoveryType;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  href?: string;
  source?: string;
  savedAt: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export const SAVED_DISCOVERIES_KEY = "cosmos:saved-discoveries:v1";
export const SAVED_DISCOVERIES_EVENT = "cosmos:saved-discoveries-change";

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function normalizeDiscovery(discovery: SavedDiscovery): SavedDiscovery {
  return {
    ...discovery,
    id: discovery.id.trim(),
    title: discovery.title.trim(),
    savedAt: discovery.savedAt || new Date().toISOString(),
  };
}

export function readSavedDiscoveries(): SavedDiscovery[] {
  if (!canUseStorage()) return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_DISCOVERIES_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is SavedDiscovery => {
        if (typeof item !== "object" || item === null) return false;
        const record = item as Record<string, unknown>;
        return typeof record.id === "string" && typeof record.title === "string" && typeof record.type === "string";
      })
      .slice(0, 120);
  } catch {
    return [];
  }
}

export function isDiscoverySaved(id: string) {
  return readSavedDiscoveries().some((item) => item.id === id);
}

export function saveDiscovery(discovery: SavedDiscovery) {
  if (!canUseStorage()) return false;

  const normalized = normalizeDiscovery(discovery);
  const nextItems = [
    normalized,
    ...readSavedDiscoveries().filter((item) => item.id !== normalized.id),
  ].slice(0, 120);

  window.localStorage.setItem(SAVED_DISCOVERIES_KEY, JSON.stringify(nextItems));
  window.dispatchEvent(new CustomEvent(SAVED_DISCOVERIES_EVENT));
  return true;
}

export function removeDiscovery(id: string) {
  if (!canUseStorage()) return false;

  const nextItems = readSavedDiscoveries().filter((item) => item.id !== id);
  window.localStorage.setItem(SAVED_DISCOVERIES_KEY, JSON.stringify(nextItems));
  window.dispatchEvent(new CustomEvent(SAVED_DISCOVERIES_EVENT));
  return true;
}

export function toggleDiscovery(discovery: SavedDiscovery) {
  if (isDiscoverySaved(discovery.id)) {
    removeDiscovery(discovery.id);
    return false;
  }

  saveDiscovery(discovery);
  return true;
}

async function canUseAccountStorage() {
  const status = await getBrowserAuthStatus();
  return status.authenticated;
}

export async function getSavedDiscoveries(): Promise<SavedDiscovery[]> {
  if (!(await canUseAccountStorage())) return readSavedDiscoveries();

  try {
    const response = await fetch("/api/saved-discoveries", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (!response.ok) return readSavedDiscoveries();
    const json = (await response.json()) as { items?: SavedDiscovery[] };
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return readSavedDiscoveries();
  }
}

export async function saveDiscoveryToSupabase(discovery: SavedDiscovery): Promise<boolean> {
  const normalized = normalizeDiscovery(discovery);

  if (!(await canUseAccountStorage())) {
    return saveDiscovery(normalized);
  }

  try {
    const response = await fetch("/api/saved-discoveries", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(normalized),
    });
    if (!response.ok) return saveDiscovery(normalized);
    window.dispatchEvent(new CustomEvent(SAVED_DISCOVERIES_EVENT));
    return true;
  } catch {
    return saveDiscovery(normalized);
  }
}

export async function deleteSavedDiscovery(id: string): Promise<boolean> {
  if (!(await canUseAccountStorage())) {
    return removeDiscovery(id);
  }

  try {
    const response = await fetch(`/api/saved-discoveries?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (!response.ok) return removeDiscovery(id);
    window.dispatchEvent(new CustomEvent(SAVED_DISCOVERIES_EVENT));
    return true;
  } catch {
    return removeDiscovery(id);
  }
}
