"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Orbit,
  Sparkles,
  MapPin,
  Clock,
  Smartphone,
  BookOpen,
  Compass,
  Layers,
  Activity,
  Maximize2,
} from "lucide-react";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassBadge } from "@/components/glass/GlassBadge";
import { ObserverCoords } from "@/components/intelligence/PassPredictor";

interface TrackMySkyNavProps {
  observer: ObserverCoords;
  formattedTime: string;
  onOpenPairModal: () => void;
  onOpenManual: () => void;
  onScrollToSection: (id: string) => void;
  activeSection?: string;
}

export function TrackMySkyNav({
  observer,
  formattedTime,
  onOpenPairModal,
  onOpenManual,
  onScrollToSection,
  activeSection = "hero",
}: TrackMySkyNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { id: "hero", label: "Overview" },
    { id: "console-section", label: "Console" },
    { id: "viewports-section", label: "Viewports" },
    { id: "passes-section", label: "Passes" },
    { id: "analytics-section", label: "Analytics" },
    { id: "fleet-table-section", label: "Fleet" },
  ];

  return (
    <header className="fixed top-3 inset-x-3 sm:inset-x-6 z-40 pointer-events-none transition-all duration-300">
      <div className="max-w-[1650px] mx-auto flex items-center justify-between gap-3 pointer-events-auto">
        {/* LEFT: Branding & Workspace Return */}
        <GlassPanel
          level={isScrolled ? 2 : 1}
          className="px-3.5 py-1.5 flex items-center gap-3 shrink-0 shadow-2xl transition-all"
        >
          <Link
            href="/orbit"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition"
            title="Return to Orbit Workspace"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs tracking-wider text-white font-sans uppercase">
              TRACK MY SKY
            </span>
            <GlassBadge tone="cyan" dot pulse>
              LIVE
            </GlassBadge>
          </div>
        </GlassPanel>

        {/* CENTER: Spatial Jump Navigation Pills */}
        <GlassPanel
          level={isScrolled ? 2 : 1}
          className="hidden xl:flex items-center gap-1 p-1 shadow-2xl shrink-0 transition-all"
        >
          {navLinks.map((link) => (
            <GlassButton
              key={link.id}
              size="xs"
              variant={activeSection === link.id ? "primary" : "default"}
              onClick={() => onScrollToSection(link.id)}
            >
              {link.label}
            </GlassButton>
          ))}
        </GlassPanel>

        {/* RIGHT: Status, GPS Site, Clock, and Pair Phone */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Observer Location Pill */}
          <GlassPanel
            level={1}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 shadow-xl max-w-[220px] truncate"
            title={`Observer Site: ${observer.name}`}
          >
            <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{observer.name || "GPS Site"}</span>
          </GlassPanel>

          {/* Clock Pill */}
          <GlassPanel
            level={1}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-emerald-400 font-bold shadow-xl shrink-0"
          >
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <span>{formattedTime}</span>
          </GlassPanel>

          {/* Pair Companion Phone Button */}
          <GlassButton
            size="sm"
            variant="default"
            onClick={onOpenPairModal}
            title="Pair smartphone hardware GPS"
          >
            <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden lg:inline font-mono">Pair Phone</span>
          </GlassButton>

          {/* Star Gaze Link */}
          <Link href="/stargaze">
            <GlassButton variant="accent" size="sm" title="Launch 3D Planetarium View">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span className="hidden sm:inline font-mono">Star Gaze</span>
            </GlassButton>
          </Link>

          {/* Technical Manual Trigger */}
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={onOpenManual}
            title="Open Technical Manual & Glossary"
            className="p-2"
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-300 hover:text-white" />
          </GlassButton>
        </div>
      </div>
    </header>
  );
}
