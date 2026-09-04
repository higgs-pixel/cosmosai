"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, Trash2 } from "lucide-react";
import {
  clearContinueExploringItems,
  getContinueExploringItems,
  type ContinueExploringItem,
} from "@/lib/account/continue-exploring";

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Recent";
  }
}

export function ContinueExploring() {
  const [items, setItems] = useState<ContinueExploringItem[]>([]);

  useEffect(() => {
    setItems(getContinueExploringItems().slice(0, 4));
  }, []);

  function clearHistory() {
    clearContinueExploringItems();
    setItems([]);
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[#0F1115] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">Continue Exploring</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal text-gray-100">Recent paths</h2>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/5 bg-[#08090D] px-3 text-xs font-semibold text-gray-400 transition hover:bg-[#16181D] hover:text-gray-100 active:scale-[0.98]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group rounded-xl border border-white/5 bg-[#08090D] p-4 transition hover:bg-[#16181D] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-blue-400/15 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-300">
                  {item.type.replace("-", " ")}
                </span>
                <ArrowUpRight className="h-4 w-4 text-gray-600 transition group-hover:text-blue-300" />
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-gray-100">{item.title}</h3>
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500">
                <Clock3 className="h-3.5 w-3.5" />
                {formatTimestamp(item.timestamp)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-white/5 bg-[#08090D] p-5">
          <h3 className="text-lg font-semibold text-gray-100">No recent viewing history.</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">Start exploring the cosmos to build your history.</p>
          <Link
            href="/earth"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98]"
          >
            Open Earth Dashboard
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
