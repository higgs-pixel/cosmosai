import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Brain, Database, GraduationCap, Orbit, Rocket, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About COSMOS AI",
  description:
    "Learn the mission, vision, and team philosophy behind COSMOS AI, a NASA-powered space and AI exploration platform.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About COSMOS AI",
    description:
      "COSMOS AI turns NASA public data, research context, and guided AI into a cinematic observatory for learning and exploration.",
    url: "/about",
  },
};

const pillars = [
  {
    title: "NASA-powered public data",
    body: "COSMOS uses public NASA signals such as APOD, NeoWs, DONKI, Mars rover metadata, and the NASA Image and Video Library to keep exploration source-aware.",
    icon: Database,
  },
  {
    title: "Research and learning",
    body: "The platform is designed for students, educators, researchers, creators, and curious explorers who need context, not just raw links.",
    icon: GraduationCap,
  },
  {
    title: "Calm AI guidance",
    body: "When configured, Ask COSMOS helps explain space concepts and research sources. When AI is unavailable, the product remains honest and useful.",
    icon: Brain,
  },
];

export default function AboutPage() {
  return (
    <main id="main-content" className="min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <section className="premium-section relative min-h-[72vh] overflow-hidden pt-28">
        <div className="section-glow-layer section-glow-ai opacity-80" aria-hidden="true" />
        <div className="cosmos-orbital-grid absolute inset-0 opacity-35" aria-hidden="true" />
        <div className="cosmos-container relative z-10 grid gap-10 pb-16 md:pb-24">
          <nav className="flex items-center justify-between gap-4 text-sm">
            <Link href="/" className="font-display font-semibold uppercase tracking-[0.24em] text-cosmos-white">
              COSMOS AI
            </Link>
            <div className="hidden items-center gap-5 text-cosmos-mist sm:flex">
              <Link href="/blog" className="transition hover:text-cosmos-white">
                Blog
              </Link>
              <Link href="/briefing" className="transition hover:text-cosmos-white">
                Briefing
              </Link>
              <Link href="/orbit" className="transition hover:text-cosmos-white">
                Orbit
              </Link>
            </div>
          </nav>

          <div className="max-w-5xl pt-16">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
              About the observatory
            </p>
            <h1 className="cosmos-text-balance mt-6 text-5xl font-semibold leading-tight tracking-normal md:text-7xl">
              A cinematic space platform built around public science.
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-8 text-cosmos-frost md:text-lg md:leading-9">
              COSMOS AI turns NASA imagery, mission archives, planetary science, near-Earth object monitoring, space
              weather signals, and source-grounded AI into a clear path for exploration.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/image-explorer" className="glass-button inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-bold text-cosmos-white">
                Explore COSMOS
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a href="mailto:cosmosatlasai@gmail.com?subject=Join%20COSMOS%20AI%20Community" className="glass-card inline-flex h-12 items-center justify-center rounded-md px-5 text-sm font-bold text-cosmos-white transition hover:border-oxygen-400/35">
                Join Community
              </a>
              <Link href="/orbit" className="inline-flex h-12 items-center justify-center rounded-md px-5 text-sm font-bold text-cosmos-frost transition hover:text-cosmos-white">
                Orbit Tracker
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 md:py-24">
        <div className="cosmos-container grid gap-5 lg:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.title} className="glass-card rounded-lg p-6">
                <span className="grid h-12 w-12 place-items-center rounded-md border border-oxygen-400/25 bg-oxygen-400/10 text-oxygen-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-6 text-2xl font-semibold tracking-normal">{pillar.title}</h2>
                <p className="mt-4 text-sm leading-7 text-cosmos-frost">{pillar.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 pb-20 md:pb-28">
        <div className="cosmos-container grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <article className="glass-panel rounded-lg p-6 md:p-8">
            <Rocket className="h-7 w-7 text-oxygen-400" />
            <h2 className="mt-6 text-3xl font-semibold tracking-normal">Mission and vision</h2>
            <p className="mt-5 text-sm leading-7 text-cosmos-frost">
              The mission is to make space exploration feel immediate, accurate, and approachable. The vision is a living
              observatory where daily NASA signals, research metadata, and guided explanations become a habit for learning.
            </p>
          </article>

          <div className="grid gap-5 md:grid-cols-2">
            <article className="glass-card rounded-lg p-6">
              <Users className="h-6 w-6 text-oxygen-400" />
              <h3 className="mt-5 text-2xl font-semibold tracking-normal">Founder and team</h3>
              <p className="mt-4 text-sm leading-7 text-cosmos-frost">
                <span className="block font-semibold text-cosmos-white">Mayankaditya Lohiya</span>
                <span className="block text-oxygen-300">Founder & CEO</span>
                <span className="mt-3 block">
                  Mayankaditya Lohiya is the Founder & CEO of COSMOS AI. He established the platform with the vision of
                  making space exploration, scientific research, and NASA-powered knowledge accessible to everyone
                  through modern technology, artificial intelligence, and open scientific data.
                </span>
              </p>
              <div className="mt-6 grid gap-3 text-sm leading-6 text-cosmos-frost">
                <p>
                  <span className="block font-semibold text-cosmos-white">Founder & CEO</span>
                  Mayankaditya Lohiya
                </p>
                <p>
                  <span className="block font-semibold text-cosmos-white">Head of Content Writing</span>
                  Shekina Daniel
                </p>
                <p>
                  <span className="block font-semibold text-cosmos-white">Head of Research</span>
                  Aryahi Tomar
                </p>
                <p>
                  <span className="block font-semibold text-cosmos-white">Head of AI & Technology</span>
                  Aaditya Mahajan
                </p>
                <p>
                  <span className="block font-semibold text-cosmos-white">Internal Operational Coordinator</span>
                  Yuvaraj D
                </p>
                <p>
                  <span className="block font-semibold text-cosmos-white">Community Group Coordinator</span>
                  Ankit Kumar
                </p>
              </div>
            </article>
            <article className="glass-card rounded-lg p-6">
              <Orbit className="h-6 w-6 text-oxygen-400" />
              <h3 className="mt-5 text-2xl font-semibold tracking-normal">Join Us</h3>
              <p className="mt-4 text-sm leading-7 text-cosmos-frost">
                Interested in building the future of space technology, AI, and scientific research? We&apos;re always looking
                for passionate researchers, writers, developers, designers, and community builders to join COSMOS AI.
              </p>
              <div className="mt-6 grid gap-3 text-sm leading-6 text-cosmos-frost">
                <p>
                  <span className="block font-semibold text-cosmos-white">Email</span>
                  <a href="mailto:cosmosatlasai@gmail.com" className="text-oxygen-300 transition hover:text-cosmos-white">
                    cosmosatlasai@gmail.com
                  </a>
                </p>
                <p>
                  <span className="block font-semibold text-cosmos-white">LinkedIn</span>
                  Visit our official COSMOS AI LinkedIn page.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
