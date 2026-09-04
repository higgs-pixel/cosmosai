"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Camera,
  ImageIcon,
  Link as LinkIcon,
  Newspaper,
  Radio,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import NextLink from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: LucideIcon;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData?: TimelineItem[];
  className?: string;
}

const cosmosMissionSignals: TimelineItem[] = [
  {
    id: 1,
    title: "APOD Signal",
    date: "Today",
    content: "Astronomy Picture of the Day is the daily visual anchor for COSMOS AI.",
    category: "NASA Media",
    icon: ImageIcon,
    relatedIds: [5, 6],
    status: "completed",
    energy: 95,
  },
  {
    id: 2,
    title: "Asteroid Watch",
    date: "Today",
    content: "Near-Earth object activity and close approach monitoring.",
    category: "Planetary Defense",
    icon: AlertTriangle,
    relatedIds: [3, 6],
    status: "in-progress",
    energy: 80,
  },
  {
    id: 3,
    title: "Solar Weather",
    date: "Live Window",
    content: "Space weather alerts, solar flares, geomagnetic storms, and DONKI signals.",
    category: "Space Weather",
    icon: Zap,
    relatedIds: [2, 5],
    status: "in-progress",
    energy: 70,
  },
  {
    id: 4,
    title: "Mars Rover Feed",
    date: "Latest Sol",
    content: "Mars rover imagery and surface exploration context.",
    category: "Mars Exploration",
    icon: Camera,
    relatedIds: [5, 6],
    status: "in-progress",
    energy: 75,
  },
  {
    id: 5,
    title: "NASA News",
    date: "Latest",
    content: "Current NASA mission updates and science headlines.",
    category: "NASA Updates",
    icon: Newspaper,
    relatedIds: [1, 3, 4],
    status: "completed",
    energy: 85,
  },
  {
    id: 6,
    title: "Ask COSMOS",
    date: "AI Layer",
    content: "COSMOS AI explains NASA data, planets, images, and daily briefings.",
    category: "AI Guide",
    icon: Bot,
    relatedIds: [1, 2, 4],
    status: "in-progress",
    energy: 90,
  },
];

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    function handleChange() {
      setReducedMotion(mediaQuery.matches);
    }

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

export default function RadialOrbitalTimeline({
  timelineData = cosmosMissionSignals,
  className,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [orbitRadius, setOrbitRadius] = useState(170);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const reducedMotion = usePrefersReducedMotion();
  const viewMode = "orbital" as const;

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === containerRef.current || event.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key, 10) !== id) {
          newState[parseInt(key, 10)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: ReturnType<typeof setInterval>;

    if (autoRotate && viewMode === "orbital" && !reducedMotion) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, reducedMotion, viewMode]);

  useEffect(() => {
    const updateRadius = () => {
      const width = containerRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      setOrbitRadius(width < 640 ? 112 : width < 900 ? 150 : 200);
    };

    updateRadius();
    window.addEventListener("resize", updateRadius);
    return () => window.removeEventListener("resize", updateRadius);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setExpandedItems({});
        setActiveNodeId(null);
        setPulseEffect({});
        setAutoRotate(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radian = (angle * Math.PI) / 180;

    const x = orbitRadius * Math.cos(radian) + centerOffset.x;
    const y = orbitRadius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.62,
      Math.min(1, 0.5 + 0.5 * ((1 + Math.sin(radian)) / 2)),
    );

    return { x, y, angle, zIndex, opacity };
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "border-aurora-400/30 bg-aurora-400/12 text-aurora-400";
      case "in-progress":
        return "border-oxygen-400/30 bg-oxygen-400/12 text-oxygen-400";
      case "pending":
        return "border-white/15 bg-white/[0.055] text-cosmos-mist";
      default:
        return "border-white/15 bg-white/[0.055] text-cosmos-mist";
    }
  };

  return (
    <section className={cn("glass-panel rounded-[1.25rem] p-5 md:p-8", className)}>
      <div className="relative z-10 grid gap-8 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-oxygen-400/25 bg-oxygen-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-oxygen-400">
              <Radio className="h-3.5 w-3.5" />
              COSMOS Mission Signals
            </div>
            <h2 className="cosmos-text-balance text-4xl font-semibold leading-tight tracking-normal md:text-5xl">
              Mission Signals
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-cosmos-frost md:text-base">
              A live orbital map of today&apos;s NASA-powered COSMOS intelligence — APOD, asteroids,
              space weather, Mars imagery, NASA updates, and AI guidance.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Card className="p-5">
              <div className="relative z-10 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-oxygen-400" />
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
                    Active signal
                  </p>
                  <p className="mt-1 text-lg font-semibold text-cosmos-white">
                    {activeNodeId
                      ? timelineData.find((item) => item.id === activeNodeId)?.title
                      : "Auto scan"}
                  </p>
                </div>
              </div>
            </Card>
            <NextLink
              href="/briefing"
              className="group inline-flex h-12 items-center justify-center gap-3 rounded-full bg-oxygen-500 px-5 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
            >
              Explore Today&apos;s Briefing
              <Radio className="h-4 w-4 transition group-hover:rotate-12" />
            </NextLink>
          </div>
        </div>

        <div
          className="glass-border relative flex min-h-[460px] w-full flex-col items-center justify-center overflow-hidden rounded-[1rem] bg-cosmos-black/52 md:min-h-[620px]"
          ref={containerRef}
          onClick={handleContainerClick}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_72%_18%,rgba(167,139,250,0.14),transparent_28%)]" />
          <div className="cosmos-orbital-grid opacity-45" />
          <div
            className="absolute flex h-full w-full items-center justify-center"
            ref={orbitRef}
            style={{
              perspective: "1000px",
              transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
            }}
          >
            <div className="absolute z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-oxygen-400 via-ai to-ion-500 shadow-glow-oxygen md:h-20 md:w-20">
              {!reducedMotion ? (
                <>
                  <div className="absolute h-20 w-20 animate-ping rounded-full border border-oxygen-400/20 opacity-70 md:h-24 md:w-24" />
                  <div
                    className="absolute h-24 w-24 animate-ping rounded-full border border-ai/10 opacity-50 md:h-28 md:w-28"
                    style={{ animationDelay: "0.5s" }}
                  />
                </>
              ) : null}
              <div className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-md md:h-10 md:w-10" />
            </div>

            <div className="absolute h-56 w-56 rounded-full border border-oxygen-400/10 md:h-96 md:w-96" />
            <div className="absolute h-36 w-36 rounded-full border border-ai/10 md:h-64 md:w-64" />

            {timelineData.map((item, index) => {
              const position = calculateNodePosition(index, timelineData.length);
              const isExpanded = expandedItems[item.id];
              const isRelated = isRelatedToActive(item.id);
              const isPulsing = pulseEffect[item.id];
              const Icon = item.icon;

              const nodeStyle = {
                transform: `translate(${position.x}px, ${position.y}px)`,
                zIndex: isExpanded ? 200 : position.zIndex,
                opacity: isExpanded ? 1 : position.opacity,
              };

              return (
                <div
                  key={item.id}
                  ref={(element) => {
                    nodeRefs.current[item.id] = element;
                  }}
                  className="absolute cursor-pointer transition-all duration-700"
                  style={nodeStyle}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleItem(item.id);
                  }}
                >
                  <div
                    className={cn("absolute -inset-1 rounded-full", isPulsing ? "animate-pulse duration-1000" : "")}
                    style={{
                      background:
                        "radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(167,139,250,0.08) 42%, rgba(255,255,255,0) 70%)",
                      width: `${item.energy * 0.5 + 40}px`,
                      height: `${item.energy * 0.5 + 40}px`,
                      left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                      top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    }}
                  />

                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 md:h-11 md:w-11",
                      isExpanded
                        ? "scale-150 border-oxygen-400 bg-oxygen-400 text-cosmos-black shadow-lg shadow-oxygen-400/30"
                        : isRelated
                          ? "border-ai/80 bg-ai/40 text-white"
                          : "border-white/30 bg-cosmos-black text-cosmos-white",
                      isRelated && !isExpanded ? "animate-pulse" : "",
                    )}
                  >
                    <Icon size={16} />
                  </div>

                  <div
                    className={cn(
                      "absolute top-12 max-w-28 -translate-x-1/2 whitespace-normal text-center text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 md:max-w-none md:whitespace-nowrap md:text-xs",
                      isExpanded ? "scale-125 text-white" : "text-white/70",
                    )}
                  >
                    {item.title}
                  </div>

                  {isExpanded ? (
                    <Card className="absolute left-1/2 top-20 w-[min(78vw,18rem)] -translate-x-1/2 overflow-visible border-oxygen-400/30 sm:w-72">
                      <div className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-oxygen-400/50" />
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-3">
                          <Badge className={cn("px-2 text-xs", getStatusStyles(item.status))}>
                            {item.status === "completed"
                              ? "COMPLETE"
                              : item.status === "in-progress"
                                ? "IN PROGRESS"
                                : "PENDING"}
                          </Badge>
                          <span className="font-mono text-xs text-white/50">{item.date}</span>
                        </div>
                        <CardTitle className="mt-2 text-sm">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-white/80">
                        <p>{item.content}</p>

                        <div className="mt-4 border-t border-white/10 pt-3">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="flex items-center">
                              <Zap size={10} className="mr-1 text-oxygen-400" />
                              Energy Level
                            </span>
                            <span className="font-mono">{item.energy}%</span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-gradient-to-r from-oxygen-400 to-ai"
                              style={{ width: `${item.energy}%` }}
                            />
                          </div>
                        </div>

                        {item.relatedIds.length > 0 ? (
                          <div className="mt-4 border-t border-white/10 pt-3">
                            <div className="mb-2 flex items-center">
                              <LinkIcon size={10} className="mr-1 text-white/70" />
                              <h4 className="text-xs font-medium uppercase tracking-wider text-white/70">
                                Connected Nodes
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {item.relatedIds.map((relatedId) => {
                                const relatedItem = timelineData.find((candidate) => candidate.id === relatedId);
                                return (
                                  <Button
                                    key={relatedId}
                                    variant="outline"
                                    size="sm"
                                    className="flex h-6 items-center rounded-none border-white/20 bg-transparent px-2 py-0 text-xs text-white/80 transition-all hover:bg-white/10 hover:text-white"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleItem(relatedId);
                                    }}
                                  >
                                    {relatedItem?.title}
                                    <ArrowRight size={8} className="ml-1 text-white/60" />
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export { RadialOrbitalTimeline, cosmosMissionSignals };
