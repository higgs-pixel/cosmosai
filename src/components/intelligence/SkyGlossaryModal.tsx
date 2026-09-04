"use client";

import { useState } from "react";
import { HelpCircle, X, Search, Compass, Eye, Sun, Orbit, Sparkles, BookOpen, ChevronRight, Info } from "lucide-react";

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
    simpleDefinition: "How high a satellite is above your horizon, measured in degrees from 0° to 90°.",
    humanAnalogy: "0° is straight ahead at ground level; 90° is directly straight up above your head (Zenith). Satellites above 20° are easiest to spot!",
    category: "Sky Angles",
    iconName: "compass",
  },
  {
    id: "azimuth",
    term: "Azimuth (Az)",
    simpleDefinition: "The compass direction you need to face to see the satellite in the sky.",
    humanAnalogy: "0° is North, 90° is East, 180° is South, and 270° is West. E.g., 90° means look towards the sunrise direction.",
    category: "Sky Angles",
    iconName: "compass",
  },
  {
    id: "zenith",
    term: "Zenith (90° Overhead)",
    simpleDefinition: "The exact point in the sky directly above your head.",
    humanAnalogy: "Imagine standing in an open field looking straight up at the sky — that highest point is the Zenith.",
    category: "Sky Angles",
    iconName: "compass",
  },
  {
    id: "magnitude",
    term: "Apparent Visual Magnitude (mᵥ)",
    simpleDefinition: "How bright a satellite appears from Earth. IMPORTANT: Smaller & negative numbers mean BRIGHTER!",
    humanAnalogy: "-2.0 is super bright (like Venus), +2.0 is like the North Star, and +6.0 is faint (the limit for human eyes in dark skies).",
    category: "Brightness & Vision",
    iconName: "eye",
  },
  {
    id: "naked-eye",
    term: "Naked-Eye Visible",
    simpleDefinition: "A satellite pass you can see with your bare eyes without needing binoculars or telescopes.",
    humanAnalogy: "Requires 3 conditions: (1) Satellite is >10° above horizon, (2) Satellite is lit by Sun, and (3) Your sky is dark (twilight/night).",
    category: "Brightness & Vision",
    iconName: "sparkles",
  },
  {
    id: "sunlit",
    term: "Sunlit vs. Earth Shadow",
    simpleDefinition: "Satellites do not have lights! You only see them when sunlight reflects off their solar panels while you sit in darkness.",
    humanAnalogy: "Like a mirror reflecting a flashlight beam across a dark room. If the satellite moves into Earth's shadow cone, it vanishes instantly!",
    category: "Brightness & Vision",
    iconName: "sun",
  },
  {
    id: "slant-range",
    term: "Slant Range",
    simpleDefinition: "The direct straight-line distance in kilometers from your eyes to the satellite in space.",
    humanAnalogy: "If a satellite is overhead at 400 km slant range, it is closer than if it is near the horizon at 1,500 km slant range.",
    category: "Sky Angles",
    iconName: "compass",
  },
  {
    id: "aos-los",
    term: "AOS & LOS (Rise & Set Times)",
    simpleDefinition: "AOS (Acquisition of Signal) is when the satellite rises above horizon. LOS (Loss of Signal) is when it sets below horizon.",
    humanAnalogy: "AOS is 'Hello!' (satellite enters your sky), and LOS is 'Goodbye!' (satellite disappears over the horizon).",
    category: "Time & Pass",
    iconName: "sparkles",
  },
  {
    id: "leo",
    term: "LEO (Low Earth Orbit)",
    simpleDefinition: "Satellites orbiting close to Earth (300 km to 1,500 km high), like the International Space Station (ISS) and Hubble.",
    humanAnalogy: "They move super fast! They cross your entire sky in just 5 to 10 minutes, traveling at 28,000 km/h.",
    category: "Orbits & Physics",
    iconName: "orbit",
  },
  {
    id: "meo",
    term: "MEO (Medium Earth Orbit)",
    simpleDefinition: "Satellites orbiting at medium altitudes (~20,000 km high), primarily GPS and navigation satellites.",
    humanAnalogy: "They take about 12 hours to circle the Earth once.",
    category: "Orbits & Physics",
    iconName: "orbit",
  },
  {
    id: "geo",
    term: "GEO (Geostationary Orbit)",
    simpleDefinition: "Satellites orbiting at 36,000 km altitude moving at the exact same speed as Earth's rotation.",
    humanAnalogy: "Because they match Earth's spin, TV and weather satellites appear to hover over the exact same spot 24/7.",
    category: "Orbits & Physics",
    iconName: "orbit",
  },
  {
    id: "tle",
    term: "TLE (Two-Line Element)",
    simpleDefinition: "A pair of standardized text lines containing mathematical numbers used by space trackers to calculate satellite positions.",
    humanAnalogy: "Think of it as a satellite's flight ticket code that tells software where the satellite is right now and where it will be tomorrow.",
    category: "Orbits & Physics",
    iconName: "orbit",
  },
];

export default function SkyGlossaryModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Sky Angles", "Brightness & Vision", "Orbits & Physics", "Time & Pass"];

  const filteredTerms = GLOSSARY_TERMS.filter((t) => {
    const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
    const matchesSearch =
      t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.simpleDefinition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.humanAnalogy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right Help Desk Assistant) */}
      <div className="fixed bottom-6 right-6 z-[99999]">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-[#00e5ff] via-cyan-400 to-blue-500 text-slate-950 px-4 py-3 rounded-full font-bold text-xs shadow-[0_0_25px_rgba(0,229,255,0.5)] hover:shadow-[0_0_35px_rgba(0,229,255,0.8)] hover:scale-105 transition-all duration-300 border border-white/40"
        >
          <div className="relative">
            <HelpCircle className="h-5 w-5 text-slate-950 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
          </div>
          <span className="font-mono uppercase tracking-wider text-xs">Sky Guide &amp; Glossary</span>
        </button>
      </div>

      {/* Interactive Floating Glossary Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#0f1422] border border-[#00e5ff]/40 rounded-2xl shadow-[0_0_50px_rgba(0,229,255,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#00e5ff]/15 border border-[#00e5ff]/30 text-[#00e5ff]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    Stargazer Sky Guide &amp; Glossary
                  </h2>
                  <p className="text-xs text-slate-400">
                    Simple, human explanations for all astronomical terms on this page.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 space-y-3">
              {/* Search Bar */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search terms (e.g. elevation, magnitude, zenith, LEO)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-xs text-slate-400 hover:text-white">
                    Clear
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${selectedCategory === cat ? "bg-[#00e5ff] text-slate-950 shadow-[0_0_10px_rgba(0,229,255,0.3)]" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Terms List Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-800/50">
              {filteredTerms.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-mono text-xs">
                  No terms found matching &quot;{searchQuery}&quot;. Try searching for &quot;elevation&quot; or &quot;magnitude&quot;.
                </div>
              ) : (
                filteredTerms.map((t) => (
                  <div key={t.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#00e5ff] flex items-center gap-2">
                        {t.iconName === "compass" && <Compass className="h-4 w-4 text-[#00e5ff]" />}
                        {t.iconName === "eye" && <Eye className="h-4 w-4 text-emerald-400" />}
                        {t.iconName === "sun" && <Sun className="h-4 w-4 text-amber-400" />}
                        {t.iconName === "orbit" && <Orbit className="h-4 w-4 text-purple-400" />}
                        {t.iconName === "sparkles" && <Sparkles className="h-4 w-4 text-[#00e5ff]" />}
                        {t.term}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-400 uppercase tracking-wider">
                        {t.category}
                      </span>
                    </div>

                    {/* Simple Definition */}
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {t.simpleDefinition}
                    </p>

                    {/* Human Analogy Box */}
                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-300 font-mono flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-[#00e5ff] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[#00e5ff] font-bold">In simple human terms: </span>
                        {t.humanAnalogy}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>COSMOS AI Stargazer Assistant</span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
