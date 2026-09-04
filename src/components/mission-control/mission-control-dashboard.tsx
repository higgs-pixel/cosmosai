"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Save, ShieldCheck } from "lucide-react";
import {
  MISSION_CONTROL_WIDGETS,
  WidgetFrame,
  getWidgetDefinition,
} from "./widget-registry";
import type {
  MissionControlDashboardData,
  MissionControlWidgetId,
  MissionControlWidgetLayout,
} from "./types";

const GRID_COLUMNS = 12;
const ROW_HEIGHT = 96;
const GRID_GAP = 16;

const DEFAULT_LAYOUT: MissionControlWidgetLayout[] = [
  { id: "earth", x: 0, y: 0, w: 6, h: 4 },
  { id: "ask", x: 6, y: 0, w: 3, h: 4 },
  { id: "stats", x: 9, y: 0, w: 3, h: 3 },
  { id: "iss", x: 9, y: 3, w: 3, h: 3 },
  { id: "apod", x: 0, y: 4, w: 4, h: 4 },
  { id: "space-weather", x: 4, y: 4, w: 4, h: 3 },
  { id: "asteroids", x: 8, y: 6, w: 4, h: 3 },
  { id: "research", x: 0, y: 8, w: 4, h: 4 },
  { id: "blog", x: 4, y: 7, w: 4, h: 4 },
  { id: "saved", x: 8, y: 9, w: 4, h: 3 },
];

type DragAction = {
  type: "drag" | "resize";
  id: MissionControlWidgetId;
  startX: number;
  startY: number;
  original: MissionControlWidgetLayout;
};

function isWidgetId(value: string): value is MissionControlWidgetId {
  return MISSION_CONTROL_WIDGETS.some((widget) => widget.id === value);
}

function normalizeLayout(layout?: unknown): MissionControlWidgetLayout[] {
  if (!Array.isArray(layout)) return DEFAULT_LAYOUT;
  const valid = layout
    .map((item): MissionControlWidgetLayout | null => {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" && isWidgetId(record.id) ? record.id : null;
      if (!id) return null;
      const definition = getWidgetDefinition(id);
      const x = Number(record.x);
      const y = Number(record.y);
      const w = Number(record.w);
      const h = Number(record.h);
      if (![x, y, w, h].every(Number.isFinite)) return null;
      return {
        id,
        x: Math.max(0, Math.min(GRID_COLUMNS - 1, Math.round(x))),
        y: Math.max(0, Math.min(80, Math.round(y))),
        w: Math.max(definition.minW, Math.min(GRID_COLUMNS, Math.round(w))),
        h: Math.max(definition.minH, Math.min(8, Math.round(h))),
      };
    })
    .filter((item): item is MissionControlWidgetLayout => Boolean(item));
  const ids = new Set(valid.map((item) => item.id));
  const missing = DEFAULT_LAYOUT.filter((item) => !ids.has(item.id));
  return [...valid, ...missing].map((item) => ({
    ...item,
    x: Math.min(item.x, GRID_COLUMNS - item.w),
  }));
}

function useCompactLayout() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}

export function MissionControlDashboard({
  data,
  initialLayout,
}: {
  data: MissionControlDashboardData;
  initialLayout?: unknown;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<DragAction | null>(null);
  const [layout, setLayout] = useState(() => normalizeLayout(initialLayout));
  const layoutRef = useRef(layout);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const compact = useCompactLayout();

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const sortedLayout = useMemo(
    () => [...layout].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y)),
    [layout],
  );

  async function persist(nextLayout = layout) {
    setSaveState("saving");
    try {
      const response = await fetch("/api/mission-control/layout", {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ layout: nextLayout }),
      });
      setSaveState(response.ok ? "saved" : "error");
      window.setTimeout(() => setSaveState("idle"), 1_600);
    } catch {
      setSaveState("error");
      window.setTimeout(() => setSaveState("idle"), 2_000);
    }
  }

  function startAction(type: DragAction["type"], id: MissionControlWidgetId, event: PointerEvent) {
    if (compact) return;
    const original = layout.find((item) => item.id === id);
    if (!original) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    actionRef.current = {
      type,
      id,
      startX: event.clientX,
      startY: event.clientY,
      original,
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function handlePointerMove(event: globalThis.PointerEvent) {
    const action = actionRef.current;
    const grid = gridRef.current;
    if (!action || !grid) return;
    const rect = grid.getBoundingClientRect();
    const cellWidth = (rect.width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    const dx = Math.round((event.clientX - action.startX) / (cellWidth + GRID_GAP));
    const dy = Math.round((event.clientY - action.startY) / (ROW_HEIGHT + GRID_GAP));

    setLayout((current) => {
      const next = current.map((item) => {
        if (item.id !== action.id) return item;
        const definition = getWidgetDefinition(item.id);
        if (action.type === "drag") {
          return {
            ...item,
            x: Math.max(0, Math.min(GRID_COLUMNS - item.w, action.original.x + dx)),
            y: Math.max(0, action.original.y + dy),
          };
        }

        return {
          ...item,
          w: Math.max(definition.minW, Math.min(GRID_COLUMNS - item.x, action.original.w + dx)),
          h: Math.max(definition.minH, Math.min(8, action.original.h + dy)),
        };
      });
      layoutRef.current = next;
      return next;
    });
  }

  function handlePointerUp() {
    window.removeEventListener("pointermove", handlePointerMove);
    const nextLayout = normalizeLayout(layoutRef.current);
    actionRef.current = null;
    layoutRef.current = nextLayout;
    setLayout(nextLayout);
    void persist(nextLayout);
  }

  function resetLayout() {
    layoutRef.current = DEFAULT_LAYOUT;
    setLayout(DEFAULT_LAYOUT);
    void persist(DEFAULT_LAYOUT);
  }

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(167,139,250,0.12),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.08),#03040a_84%)]" />
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
          <div className="hidden items-center gap-2 rounded-full border border-aurora-400/20 bg-aurora-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-aurora-400 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Personalized Mission Control
          </div>
        </header>

        <div className="mx-auto mt-6 max-w-[1720px]">
          <section className="glass-panel rounded-[1.25rem] p-5 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.32em] text-oxygen-400">
                  COSMOS Mission Control
                </p>
                <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1] tracking-normal sm:text-5xl md:text-6xl">
                  Your personal space operations deck.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-cosmos-frost">
                  Arrange NASA signals, research, saved discoveries, and Ask COSMOS into the dashboard you want to return to every day.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void persist()}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-oxygen-500 px-4 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400"
                >
                  <Save className="h-4 w-4" />
                  {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : saveState === "error" ? "Retry save" : "Save layout"}
                </button>
                <button
                  type="button"
                  onClick={resetLayout}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 text-sm font-bold text-cosmos-frost transition hover:text-cosmos-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </section>

          <div
            ref={gridRef}
            className="mt-5 grid gap-4 pb-10"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
              gridAutoRows: `${ROW_HEIGHT}px`,
            }}
          >
            {sortedLayout.map((item) => (
              <div
                key={item.id}
                className="relative min-h-0"
                style={{
                  gridColumn: compact ? "1 / -1" : `${item.x + 1} / span ${item.w}`,
                  gridRow: compact ? "span 4" : `${item.y + 1} / span ${item.h}`,
                }}
              >
                <WidgetFrame
                  id={item.id}
                  data={data}
                  onDragStart={(id, event) => startAction("drag", id, event)}
                  onResizeStart={(id, event) => startAction("resize", id, event)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
