"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  ExternalLink,
  Search,
  Sparkles,
  Telescope,
} from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";

type SpacepediaCategory =
  | "Planets"
  | "Stars"
  | "Black Holes"
  | "Galaxies"
  | "Space Missions"
  | "Astronauts"
  | "Cosmology";

type SpacepediaArticle = {
  id: string;
  title: string;
  category: SpacepediaCategory;
  summary: string;
  facts: string[];
  sources: Array<{
    label: string;
    href: string;
  }>;
};

const categories: Array<"All" | SpacepediaCategory> = [
  "All",
  "Planets",
  "Stars",
  "Black Holes",
  "Galaxies",
  "Space Missions",
  "Astronauts",
  "Cosmology",
];

const articles: SpacepediaArticle[] = [
  {
    id: "mars",
    title: "Mars",
    category: "Planets",
    summary:
      "Mars is a cold desert world whose surface preserves evidence of ancient water, volcanic history, impact basins, and active rover exploration.",
    facts: ["Thin carbon dioxide atmosphere", "Two moons: Phobos and Deimos", "Day length is about 24.6 hours"],
    sources: [
      { label: "NASA Mars Exploration", href: "https://mars.nasa.gov/" },
      { label: "NASA Solar System: Mars", href: "https://science.nasa.gov/mars/" },
    ],
  },
  {
    id: "jupiter",
    title: "Jupiter",
    category: "Planets",
    summary:
      "Jupiter is the largest planet in the Solar System, a gas giant with powerful storms, strong radiation belts, and a complex moon system.",
    facts: ["Great Red Spot storm system", "Fast day under 10 hours", "Explored closely by NASA's Juno mission"],
    sources: [
      { label: "NASA Juno", href: "https://science.nasa.gov/mission/juno/" },
      { label: "NASA Solar System: Jupiter", href: "https://science.nasa.gov/jupiter/" },
    ],
  },
  {
    id: "sun",
    title: "The Sun",
    category: "Stars",
    summary:
      "The Sun is a G-type main-sequence star whose magnetic activity shapes space weather across the Solar System.",
    facts: ["Primary energy source for Earth", "Solar flares and CMEs affect space weather", "Studied by missions including Parker Solar Probe"],
    sources: [
      { label: "NASA Sun Science", href: "https://science.nasa.gov/sun/" },
      { label: "Parker Solar Probe", href: "https://science.nasa.gov/mission/parker-solar-probe/" },
    ],
  },
  {
    id: "black-holes",
    title: "Black Holes",
    category: "Black Holes",
    summary:
      "Black holes are regions where gravity is so strong that light cannot escape from inside the event horizon.",
    facts: ["Can form from collapsed massive stars", "Supermassive black holes sit in many galaxy centers", "Detected through effects on matter and light"],
    sources: [
      { label: "NASA Black Holes", href: "https://science.nasa.gov/universe/black-holes/" },
      { label: "Chandra Black Holes", href: "https://chandra.harvard.edu/blackhole/" },
    ],
  },
  {
    id: "milky-way",
    title: "The Milky Way",
    category: "Galaxies",
    summary:
      "The Milky Way is our home galaxy: a barred spiral galaxy containing stars, gas, dust, dark matter, and the Solar System.",
    facts: ["Contains hundreds of billions of stars", "The Solar System orbits far from the galactic center", "Its center hosts a supermassive black hole"],
    sources: [
      { label: "NASA Galaxies", href: "https://science.nasa.gov/universe/galaxies/" },
      { label: "NASA Universe", href: "https://science.nasa.gov/universe/" },
    ],
  },
  {
    id: "apollo-11",
    title: "Apollo 11",
    category: "Space Missions",
    summary:
      "Apollo 11 was the first mission to land humans on the Moon, turning lunar exploration into a defining scientific and cultural milestone.",
    facts: ["Landed in 1969", "Crew: Neil Armstrong, Buzz Aldrin, Michael Collins", "Returned lunar samples to Earth"],
    sources: [
      { label: "NASA Apollo 11", href: "https://www.nasa.gov/mission/apollo-11/" },
      { label: "Apollo Lunar Surface Journal", href: "https://www.nasa.gov/history/alsj/" },
    ],
  },
  {
    id: "jwst",
    title: "James Webb Space Telescope",
    category: "Space Missions",
    summary:
      "JWST is NASA's infrared flagship observatory, built to study early galaxies, star formation, exoplanets, and distant cosmic structure.",
    facts: ["Observes primarily in infrared", "Operates near Sun-Earth L2", "Uses a segmented golden mirror"],
    sources: [
      { label: "NASA Webb", href: "https://science.nasa.gov/mission/webb/" },
      { label: "Webb Image Gallery", href: "https://webbtelescope.org/images" },
    ],
  },
  {
    id: "astronaut-training",
    title: "Astronaut Training",
    category: "Astronauts",
    summary:
      "Astronauts train for spacecraft systems, robotics, science operations, spacewalks, teamwork, and emergency procedures.",
    facts: ["Training can include simulators and underwater spacewalk practice", "Crew roles span piloting, science, engineering, and medicine", "ISS missions require international coordination"],
    sources: [
      { label: "NASA Astronauts", href: "https://www.nasa.gov/humans-in-space/astronauts/" },
      { label: "Johnson Space Center", href: "https://www.nasa.gov/johnson/" },
    ],
  },
  {
    id: "big-bang",
    title: "Big Bang Cosmology",
    category: "Cosmology",
    summary:
      "Big Bang cosmology describes the universe expanding from an early hot, dense state into the structured cosmos observed today.",
    facts: ["Supported by cosmic expansion", "Cosmic microwave background is key evidence", "Galaxy surveys map large-scale structure"],
    sources: [
      { label: "NASA Cosmology", href: "https://science.nasa.gov/universe/" },
      { label: "WMAP Cosmology", href: "https://map.gsfc.nasa.gov/universe/" },
    ],
  },
];

function askHref(article: SpacepediaArticle) {
  return {
    pathname: "/ask",
    query: {
      mode: "general",
      prompt: `Explain ${article.title} for a student using NASA-backed context. Include key facts and why it matters.`,
    },
  };
}

export function SpacepediaPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");

  const filteredArticles = useMemo(() => {
    const search = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesCategory = category === "All" || article.category === category;
      const searchable = `${article.title} ${article.category} ${article.summary} ${article.facts.join(" ")}`.toLowerCase();
      return matchesCategory && (!search || searchable.includes(search));
    });
  }, [category, query]);

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <AnimatedStarfield />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.14),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(167,139,250,0.16),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.08),#03040a_84%)]" />
      <div className="cosmos-orbital-grid fixed z-0" />
      <div className="noise-overlay fixed z-0" />

      <section className="relative z-10 px-4 py-5 md:px-8 md:py-8">
        <header className="glass-nav mx-auto flex w-full max-w-[1720px] items-center justify-between rounded-full px-3 py-3 md:px-4">
          <Link href="/" className="inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-semibold text-cosmos-frost transition hover:bg-white/[0.06] hover:text-cosmos-white">
            <ArrowLeft className="h-4 w-4" />
            COSMOS AI
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-oxygen-400/20 bg-oxygen-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-oxygen-400 sm:flex">
            <BookOpen className="h-3.5 w-3.5" />
            Spacepedia
          </div>
        </header>

        <div className="mx-auto mt-6 max-w-[1720px]">
          <section className="glass-panel rounded-[1.25rem] p-6 md:p-8 lg:p-10">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.32em] text-oxygen-400">
              Searchable knowledge base
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1] tracking-normal sm:text-5xl md:text-6xl">
              Space concepts, missions, and sources in one field guide.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-cosmos-frost md:text-lg">
              Start with a curated NASA-backed article, then ask COSMOS for a beginner, student, or researcher explanation.
            </p>
            <label className="mt-8 flex min-h-14 items-center gap-3 rounded-full border border-white/10 bg-cosmos-black/40 px-5 backdrop-blur-xl">
              <Search className="h-5 w-5 text-oxygen-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search planets, JWST, black holes..."
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-cosmos-white outline-none placeholder:text-cosmos-slate"
              />
            </label>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`h-10 flex-none rounded-full border px-4 text-xs font-bold uppercase tracking-[0.16em] transition ${
                    category === item
                      ? "border-oxygen-400/45 bg-oxygen-400/15 text-cosmos-white"
                      : "border-white/10 bg-white/[0.05] text-cosmos-mist hover:border-white/20 hover:text-cosmos-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          {filteredArticles.length === 0 ? (
            <section className="glass-panel mt-5 rounded-[1.25rem] p-8 text-center">
              <Telescope className="mx-auto h-8 w-8 text-oxygen-400" />
              <h2 className="mt-4 text-2xl font-semibold tracking-normal">No Spacepedia article found.</h2>
              <p className="mt-3 text-sm leading-6 text-cosmos-mist">Try another search or category.</p>
            </section>
          ) : (
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredArticles.map((article) => (
                <article key={article.id} className="glass-card rounded-[1.15rem] p-5">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-oxygen-400/20 bg-oxygen-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-oxygen-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      {article.category}
                    </span>
                    <BookOpen className="h-5 w-5 text-cosmos-mist" />
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight tracking-normal text-cosmos-white">{article.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-cosmos-frost">{article.summary}</p>
                  <div className="mt-5 space-y-2">
                    {article.facts.map((fact) => (
                      <p key={fact} className="flex gap-3 text-sm leading-6 text-cosmos-frost">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-oxygen-400 shadow-glow-oxygen" />
                        {fact}
                      </p>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {article.sources.map((source) => (
                      <a
                        key={source.href}
                        href={source.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-bold text-cosmos-frost transition hover:border-oxygen-400/35 hover:text-cosmos-white"
                      >
                        {source.label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ))}
                  </div>
                  <Link href={askHref(article)} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white">
                    <Bot className="h-4 w-4" />
                    Ask COSMOS
                  </Link>
                </article>
              ))}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
