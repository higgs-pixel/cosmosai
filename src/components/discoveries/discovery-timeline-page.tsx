"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  ExternalLink,
  Flag,
  Orbit,
  Rocket,
  Satellite,
  Sparkles,
  Telescope,
} from "lucide-react";
import { AnimatedStarfield } from "@/components/home/animated-starfield";

const milestones = [
  {
    year: "1969",
    title: "Moon Landing",
    category: "Apollo",
    body: "Apollo 11 landed humans on the Moon and returned lunar science, imagery, samples, and operations history that still shape exploration.",
    href: "https://www.nasa.gov/mission/apollo-11/",
    icon: Flag,
  },
  {
    year: "1977",
    title: "Voyager Launches",
    category: "Outer planets",
    body: "Voyager 1 and 2 opened the outer Solar System with flybys, planetary imaging, and the continuing interstellar mission.",
    href: "https://science.nasa.gov/mission/voyager/",
    icon: Satellite,
  },
  {
    year: "1990",
    title: "Hubble Space Telescope",
    category: "Observatory",
    body: "Hubble transformed modern astronomy with deep-field imaging, galaxy studies, nebula observations, and an enduring public archive.",
    href: "https://science.nasa.gov/mission/hubble/",
    icon: Telescope,
  },
  {
    year: "2004+",
    title: "Mars Rovers",
    category: "Surface exploration",
    body: "NASA rover missions turned Mars into a rolling field laboratory for geology, climate clues, habitability, and sample context.",
    href: "https://mars.nasa.gov/",
    icon: Orbit,
  },
  {
    year: "2021",
    title: "James Webb Space Telescope",
    category: "Infrared universe",
    body: "JWST extends deep-space observation into infrared wavelengths, revealing early galaxies, star formation, exoplanets, and cosmic dust.",
    href: "https://science.nasa.gov/mission/webb/",
    icon: Sparkles,
  },
  {
    year: "Now",
    title: "Artemis",
    category: "Moon to Mars",
    body: "Artemis connects lunar systems, science, crew operations, Gateway planning, and the long arc toward sustained exploration.",
    href: "https://www.nasa.gov/humans-in-space/artemis/",
    icon: Rocket,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 34, filter: "blur(12px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

function askHref(title: string) {
  return {
    pathname: "/ask",
    query: {
      mode: "general",
      prompt: `Explain the importance of ${title} in NASA exploration history for a student.`,
    },
  };
}

export function DiscoveryTimelinePage() {
  const reduceMotion = useReducedMotion();
  const transition: Transition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.75, ease: [0.16, 1, 0.3, 1] };

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <AnimatedStarfield />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.08),#03040a_84%)]" />
      <div className="cosmos-orbital-grid fixed z-0" />
      <div className="noise-overlay fixed z-0" />

      <section className="relative z-10 px-4 py-5 md:px-8 md:py-8">
        <header className="glass-nav mx-auto flex w-full max-w-[1720px] items-center justify-between rounded-full px-3 py-3 md:px-4">
          <Link href="/" className="inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-semibold text-cosmos-frost transition hover:bg-white/[0.06] hover:text-cosmos-white">
            <ArrowLeft className="h-4 w-4" />
            COSMOS AI
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-solar-300/20 bg-solar-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-solar-300 sm:flex">
            <Sparkles className="h-3.5 w-3.5" />
            Discovery Timeline
          </div>
        </header>

        <div className="mx-auto mt-6 max-w-[1300px]">
          <section className="glass-panel rounded-[1.25rem] p-6 md:p-8 lg:p-10">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.32em] text-solar-300">
              Interactive discovery timeline
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1] tracking-normal sm:text-5xl md:text-6xl">
              Milestones that changed how humanity sees space.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-cosmos-frost md:text-lg">
              Scroll through the exploration arc from Apollo to Artemis, with NASA source links and COSMOS explainers for each milestone.
            </p>
          </section>

          <section className="relative mt-8 pb-16">
            <div className="absolute left-5 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-oxygen-400/45 to-transparent md:block" />
            <div className="space-y-5">
              {milestones.map((milestone, index) => {
                const Icon = milestone.icon;
                return (
                  <motion.article
                    key={milestone.title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.34 }}
                    variants={fadeUp}
                    transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.04 }}
                    className="glass-card relative rounded-[1.2rem] p-5 md:ml-12 md:p-6"
                  >
                    <span className="absolute -left-[3.15rem] top-6 hidden h-10 w-10 place-items-center rounded-full border border-oxygen-400/30 bg-cosmos-black text-oxygen-400 shadow-glow-oxygen md:grid">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)_260px] lg:items-start">
                      <div>
                        <p className="font-display text-4xl font-semibold text-oxygen-400">{milestone.year}</p>
                        <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cosmos-mist">
                          {milestone.category}
                        </p>
                      </div>
                      <div>
                        <h2 className="text-3xl font-semibold leading-tight tracking-normal text-cosmos-white">{milestone.title}</h2>
                        <p className="mt-4 text-sm leading-7 text-cosmos-frost md:text-base">{milestone.body}</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <a
                          href={milestone.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-oxygen-500 px-4 text-sm font-bold text-white shadow-glow-oxygen transition hover:bg-oxygen-400"
                        >
                          NASA source
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Link
                          href={askHref(milestone.title)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ai/25 bg-ai/12 px-4 text-sm font-bold text-ai transition hover:border-ai/45 hover:text-cosmos-white"
                        >
                          <Bot className="h-4 w-4" />
                          Ask COSMOS
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
