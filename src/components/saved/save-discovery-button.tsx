"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check } from "lucide-react";
import {
  deleteSavedDiscovery,
  getSavedDiscoveries,
  SAVED_DISCOVERIES_EVENT,
  saveDiscoveryToSupabase,
  type SavedDiscovery,
} from "@/lib/saved-discoveries";
import { readAchievements } from "@/lib/cosmos-achievements";

type SaveDiscoveryButtonProps = {
  discovery: SavedDiscovery;
  className?: string;
  label?: string;
  savedLabel?: string;
  compact?: boolean;
};

export function SaveDiscoveryButton({
  discovery,
  className = "",
  label = "Save",
  savedLabel = "Saved",
  compact = false,
}: SaveDiscoveryButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    function syncSavedState() {
      void getSavedDiscoveries().then((items) => {
        if (active) setSaved(items.some((item) => item.id === discovery.id));
      });
    }

    syncSavedState();
    window.addEventListener(SAVED_DISCOVERIES_EVENT, syncSavedState);
    window.addEventListener("storage", syncSavedState);

    return () => {
      active = false;
      window.removeEventListener(SAVED_DISCOVERIES_EVENT, syncSavedState);
      window.removeEventListener("storage", syncSavedState);
    };
  }, [discovery.id]);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        const nextSaved = !saved;
        setSaved(nextSaved);
        void (async () => {
          const ok = nextSaved
            ? await saveDiscoveryToSupabase({ ...discovery, savedAt: new Date().toISOString() })
            : await deleteSavedDiscovery(discovery.id);
          if (!ok) setSaved(!nextSaved);
          readAchievements();
        })();
      }}
      aria-pressed={saved}
      className={className}
    >
      {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {compact ? <span className="sr-only">{saved ? savedLabel : label}</span> : saved ? savedLabel : label}
    </button>
  );
}
