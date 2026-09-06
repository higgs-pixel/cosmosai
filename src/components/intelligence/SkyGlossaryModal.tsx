"use client";

import { useState } from "react";
import {
  X,
  Search,
  Compass,
  Eye,
  Sun,
  Orbit,
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  Info,
  Radio,
  Globe,
  Sliders,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export interface GlossaryTerm {
  id: string;
  term: string;
  simpleDefinition: string;
  humanAnalogy: string;
  category: "Sky Angles" | "Brightness & Vision" | "Orbits & Physics" | "Time & Pass";
  iconName: "compass" | "eye" | "sun" | "orbit" | "sparkles";
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "elevation",
    term: "Elevation (El)",
    simpleDefinition: "The vertical angle of a satellite above your local horizon, measured in degrees from 0° (horizon) to 90° (Zenith).",
    humanAnalogy: "0° is straight ahead at flat ground level; 90° is directly straight up above your head. Satellites above 20° are clear of terrain and easiest to spot!",
    category: "Sky Angles",
    iconName: "compass",
  },
  {
    id: "azimuth",
    term: "Azimuth (Az)",
    simpleDefinition: "The horizontal compass heading you must face to see the satellite, measured clockwise from True North (0° to 360°).",
    humanAnalogy: "0° is North, 90° is East, 180° is South, and 270° is West. For instance, an azimuth of 90° means face towards the sunrise.",
    category: "Sky Angles",
    iconName: "compass",
  },
  {
    id: "zenith",
    term: "Zenith (90° Overhead)",
    simpleDefinition: "The highest imaginary point in the celestial sphere located directly vertical to the observer's geodetic position.",
    humanAnalogy: "Standing in an open field and staring straight up at the sky — that point is the Zenith, representing shortest atmospheric light path.",
    category: "Sky Angles",
    iconName: "compass",
  },
  {
    id: "magnitude",
    term: "Apparent Visual Magnitude (Vmag)",
    simpleDefinition: "A logarithmic scale measuring the perceived brightness of a satellite seen from Earth. Lower and negative numbers mean brighter!",
    humanAnalogy: "-2.0 is intensely bright (comparable to Jupiter or Venus), +2.0 matches Polaris (the North Star), and +6.0 is the threshold of human vision in dark skies.",
    category: "Brightness & Vision",
    iconName: "eye",
  },
  {
    id: "naked-eye",
    term: "Naked-Eye Visibility",
    simpleDefinition: "A satellite transit visible to human eyes without optical aids like telescopes or binoculars.",
    humanAnalogy: "Requires 4 simultaneous astronomical conditions: (1) Elevation > 10°, (2) Direct solar illumination, (3) Observer in twilight/night (Sun < -6°), and (4) Vmag <= +4.5.",
    category: "Brightness & Vision",
    iconName: "sparkles",
  },
  {
    id: "sunlit",
    term: "Sunlit vs. Umbral Eclipse",
    simpleDefinition: "Satellites carry no navigation headlights; they are visible exclusively by reflecting direct solar radiation while the observer is in Earth's night.",
    humanAnalogy: "Like a high-altitude mirror catching the sunrise while the valley below remains in deep shadow. If the satellite enters Earth's shadow cone, it vanishes in seconds!",
    category: "Brightness & Vision",
    iconName: "sun",
  },
  {
    id: "slant-range",
    term: "Slant Range (Distance)",
    simpleDefinition: "The true Euclidean distance in kilometers between the ground observer and the satellite spacecraft in space.",
    humanAnalogy: "A satellite directly overhead might have a slant range of 420 km, but near the horizon it may be over 2,000 km away and significantly dimmer.",
    category: "Sky Angles",
    iconName: "compass",
  },
  {
    id: "aos-los",
    term: "AOS & LOS (Acquisition / Loss of Signal)",
    simpleDefinition: "AOS is the exact second a satellite crosses above your local horizon; LOS is the exact second it dips below.",
    humanAnalogy: "AOS is 'Hello!' (spacecraft rises into your sky dome), and LOS is 'Goodbye!' (spacecraft descends behind the Earth's curvature).",
    category: "Time & Pass",
    iconName: "sparkles",
  },
  {
    id: "leo",
    term: "LEO (Low Earth Orbit)",
    simpleDefinition: "Orbits between 160 km and 2,000 km altitude, housing human space stations (ISS, Tiangong), Hubble, and mega-constellations.",
    humanAnalogy: "LEO satellites travel at blistering orbital velocities (~28,000 km/h or 7.8 km/s), completing a full Earth revolution in just 90 minutes.",
    category: "Orbits & Physics",
    iconName: "orbit",
  },
  {
    id: "meo",
    term: "MEO (Medium Earth Orbit)",
    simpleDefinition: "Orbits situated between 2,000 km and 35,786 km, primarily reserved for Global Navigation Satellite Systems (GPS, GLONASS, Galileo, BeiDou).",
    humanAnalogy: "These navigation beacons take approximately 12 hours to circle Earth once, providing continuous multi-satellite triangulation geometry.",
    category: "Orbits & Physics",
    iconName: "orbit",
  },
  {
    id: "geo",
    term: "GEO (Geostationary Orbit)",
    simpleDefinition: "Circular equatorial orbit at 35,786 km altitude matching Earth's exact sidereal rotation period (23h 56m 4s).",
    humanAnalogy: "Because the satellite orbits at the same angular rate Earth turns, television and weather satellites appear stationary in the sky 24/7.",
    category: "Orbits & Physics",
    iconName: "orbit",
  },
  {
    id: "tle",
    term: "TLE (Two-Line Element Set)",
    simpleDefinition: "A pair of standardized 69-character data lines encoding Keplerian orbital parameters, mean motion, and drag coefficients.",
    humanAnalogy: "A mathematical digital fingerprint of a satellite used by the SGP4 propagator to calculate its exact 3D Cartesian coordinates at any time.",
    category: "Orbits & Physics",
    iconName: "orbit",
  },
];

interface SkyGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: "glossary" | "docs";
  onTabChange?: (tab: "glossary" | "docs") => void;
}

export default function SkyGlossaryModal({
  isOpen,
  onClose,
  activeTab = "glossary",
  onTabChange,
}: SkyGlossaryModalProps) {
  const [currentTab, setCurrentTab] = useState<"glossary" | "docs">(activeTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const tab = onTabChange ? activeTab : currentTab;
  const setTab = onTabChange || setCurrentTab;

  const categories = ["All", "Sky Angles", "Brightness & Vision", "Orbits & Physics", "Time & Pass"];

  const filteredTerms = GLOSSARY_TERMS.filter((t) => {
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;
    return (
      matchesCategory &&
      (t.term.toLowerCase().includes(q) ||
        t.simpleDefinition.toLowerCase().includes(q) ||
        t.humanAnalogy.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-none font-sans"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[88vh] bg-[#050814] border border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(0,229,255,0.18)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Editorial Header */}
        <div className="p-5 border-b border-zinc-850 bg-zinc-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[#00e5ff]">
              {tab === "glossary" ? <BookOpen className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.25em] text-[#00e5ff] flex items-center gap-2">
                <span>COSMOS AI // OBSERVATORY KNOWLEDGE BASE</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-sans">
                {tab === "glossary" ? "Astrometry Glossary & Concepts" : "Observatory Documentation & Guide"}
              </h2>
            </div>
          </div>

          {/* Tab Switcher & Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setTab("glossary")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                  tab === "glossary"
                    ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Glossary</span>
              </button>

              <button
                onClick={() => setTab("docs")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                  tab === "docs"
                    ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Docs &amp; Guide</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
              title="Close Knowledge Base"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 1: ASTROMETRY GLOSSARY
            ───────────────────────────────────────────────────────────────────────────── */}
        {tab === "glossary" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search & Category Filter Bar */}
            <div className="p-4 border-b border-zinc-850 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search astronomical terms (e.g. elevation, Vmag, LEO)…"
                  className="w-full h-9 pl-9 pr-8 bg-zinc-950 border border-zinc-800 text-xs font-sans text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 rounded-lg transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/80"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Terms List Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
              {filteredTerms.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 font-sans text-xs uppercase tracking-widest">
                  No terms matching &ldquo;{searchQuery}&rdquo; in category {selectedCategory}.
                </div>
              ) : (
                filteredTerms.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-zinc-850 bg-zinc-950/80 hover:border-cyan-500/40 hover:bg-zinc-900/40 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white flex items-center gap-2">
                        {t.iconName === "compass" && <Compass className="h-4 w-4 text-[#00e5ff]" />}
                        {t.iconName === "eye" && <Eye className="h-4 w-4 text-emerald-400" />}
                        {t.iconName === "sun" && <Sun className="h-4 w-4 text-amber-400" />}
                        {t.iconName === "orbit" && <Orbit className="h-4 w-4 text-purple-400" />}
                        {t.iconName === "sparkles" && <Sparkles className="h-4 w-4 text-[#00e5ff]" />}
                        <span>{t.term}</span>
                      </span>

                      <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-cyan-400 uppercase tracking-wider font-mono">
                        {t.category}
                      </span>
                    </div>

                    {/* Scientific Definition */}
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {t.simpleDefinition}
                    </p>

                    {/* Everyday Analogy Box */}
                    <div className="bg-[#030611] border border-cyan-500/20 p-3 rounded-lg text-xs text-zinc-300 flex items-start gap-2.5">
                      <Info className="h-4 w-4 text-[#00e5ff] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[#00e5ff] font-bold">Practical Insight: </span>
                        {t.humanAnalogy}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 2: OBSERVATORY DOCUMENTATION & COMPREHENSIVE GUIDE
            ───────────────────────────────────────────────────────────────────────────── */}
        {tab === "docs" && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin scrollbar-thumb-zinc-800 text-zinc-300">
            {/* Guide Section 1: Introduction */}
            <div className="space-y-2 border-b border-zinc-900 pb-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#00e5ff] font-semibold">
                Chapter 01 // Astrometry Foundations
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">
                Topocentric Sky Observation &amp; SGP4 Propagation
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400 font-sans">
                Unlike geocentric orbit views that look down at Earth from space, <strong>Track My Sky</strong> calculates
                the exact <em>topocentric</em> look-angles from your eyes looking upward. Using the SGP4 (Simplified General Perturbations-4)
                astronomy model, the dashboard computes the position, velocity, atmospheric drag, solar radiation pressure,
                and gravitational harmonics for every satellite in real time relative to your WGS-84 coordinates.
              </p>
            </div>

            {/* Guide Section 2: 4 Optical Visibility Rules */}
            <div className="space-y-3 border-b border-zinc-900 pb-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                Chapter 02 // Visual Observing Protocol
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">
                How to Spot a Satellite with the Naked Eye
              </h3>
              <p className="text-xs text-zinc-400">
                To see a satellite pass with your bare eyes, all four of the following physical criteria must be met simultaneously:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl border border-zinc-850 bg-zinc-950/80 space-y-1">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5" />
                    <span>1. Observer in Night (Sun &lt; -6°)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Your local sky must be dark enough (civil, nautical, or astronomical twilight) for the faint reflection to be perceptible.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-850 bg-zinc-950/80 space-y-1">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>2. Spacecraft Fully Sunlit</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    The satellite at 400–1,000 km altitude must be outside Earth&apos;s cylindrical umbra shadow cone, reflecting raw sunlight.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-850 bg-zinc-950/80 space-y-1">
                  <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5" />
                    <span>3. Elevation Angle &gt; 10°</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Satellites below 10° suffer severe atmospheric haze and ground obstruction. Passes peaking above 30° offer pristine views.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-850 bg-zinc-950/80 space-y-1">
                  <div className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    <span>4. Magnitude Vmag &le; +4.5</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    The photometric visual magnitude must be sufficiently bright to pierce light pollution without requiring binoculars.
                  </p>
                </div>
              </div>
            </div>

            {/* Guide Section 3: Ground Station Calibration */}
            <div className="space-y-2 border-b border-zinc-900 pb-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#00e5ff] font-semibold">
                Chapter 03 // Astrometry Calibration
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">
                Ground Station Directory &amp; Live GPS
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400 font-sans">
                Select your ground observatory from the <strong>200+ Country Directory</strong> in the Astrometry Workbench,
                or click <strong>Auto GPS</strong> to acquire high-precision geodetic coordinates directly from your device sensor.
                You can also pair your smartphone companion via QR code to stream live GPS sensor altitude and coordinates continuously.
              </p>
            </div>

            {/* Guide Section 4: Instrument Layout Overview */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                Chapter 04 // Observatory Instruments
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wide">
                Instrument Tour
              </h3>
              <div className="space-y-2 text-xs text-zinc-400 font-sans">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 flex items-start gap-2.5">
                  <Globe className="h-4 w-4 text-[#00e5ff] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-bold">3D Orbital Globe: </span>
                    Interactive WebGL globe rendering Earth rotation, spacecraft models, subpoints, and individual selected trajectory paths.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 flex items-start gap-2.5">
                  <Compass className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-bold">Polar Radar Sky Dome: </span>
                    Concentric 360° radar display plotting active satellites currently elevated above your horizon.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 flex items-start gap-2.5">
                  <Sliders className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-bold">3D Cover-Flow Pass Predictor: </span>
                    Obsidian glass carousel predicting upcoming horizon transits, culmination times, and naked-eye brightness.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Status Bar */}
        <div className="p-3.5 border-t border-zinc-900 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 font-mono px-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>COSMOS AI Astrometry Engine &bull; SGP4 Background Thread</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition cursor-pointer border border-zinc-800"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
