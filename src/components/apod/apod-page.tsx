"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CalendarDays,
  Compass,
  ExternalLink,
  Eye,
  ImageIcon,
  Rocket,
  ShieldCheck,
  Sparkles,
  Telescope,
} from "lucide-react";
import type { ApodEntry } from "@/services/nasa";
import type { ApodAiExplanation } from "@/services/openai";
import { AnimatedStarfield } from "@/components/home/animated-starfield";
import { ApodActions } from "./apod-actions";
import { recordViewedApod } from "@/lib/cosmos-retention";

type ApodPageProps = {
  apod: ApodEntry;
  aiExplanation: ApodAiExplanation;
};

type RelatedContent = {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  icon: typeof Telescope;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function readingTime(text: string) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(wordCount / 210));
}

function getLeadParagraph(apod: ApodEntry, aiExplanation: ApodAiExplanation) {
  if (aiExplanation.summary) return aiExplanation.summary;

  const [firstSentence] = apod.explanation.split(/(?<=\.)\s+/);
  return firstSentence || apod.explanation;
}

export function ApodPage({ apod, aiExplanation }: ApodPageProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const imageUrl = apod.hdurl || apod.url;
  const hasLiveMedia = Boolean(imageUrl);
  const isLiveAi = aiExplanation.source === "openai";
  const formattedDate = useMemo(() => formatDate(apod.date), [apod.date]);
  const leadParagraph = useMemo(() => getLeadParagraph(apod, aiExplanation), [apod, aiExplanation]);
  const readMinutes = useMemo(
    () =>
      readingTime(
        [
          apod.title,
          apod.explanation,
          aiExplanation.summary,
          aiExplanation.whyItMatters,
          aiExplanation.lookFor,
        ].join(" "),
      ),
    [aiExplanation.lookFor, aiExplanation.summary, aiExplanation.whyItMatters, apod.explanation, apod.title],
  );

  const relatedContent: RelatedContent[] = useMemo(
    () => [
      {
        title: "Search NASA archives",
        eyebrow: "Image Explorer",
        description: "Find mission imagery and source metadata connected to today's cosmic theme.",
        href: "/image-explorer",
        icon: Telescope,
      },
      {
        title: "Enter the visual gallery",
        eyebrow: "NASA Gallery",
        description: "Move through a curated exhibition of NASA media with cinematic viewing tools.",
        href: "/gallery",
        icon: ImageIcon,
      },
      {
        title: "Ask COSMOS for context",
        eyebrow: "AI Guide",
        description: "Continue the story with source-aware questions about this image and the wider sky.",
        href: `/ask?mode=apod&prompt=${encodeURIComponent(`Explain today's APOD: ${apod.title}. ${apod.explanation.slice(0, 900)}`)}`,
        icon: Bot,
      },
    ],
    [apod.explanation, apod.title],
  );

  useEffect(() => {
    recordViewedApod({
      title: apod.title,
      date: apod.date,
      imageUrl: apod.media_type === "image" ? imageUrl : undefined,
    });
  }, [apod.date, apod.media_type, apod.title, imageUrl]);

  useEffect(() => {
    let frame = 0;

    function updateScrollState() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

        setScrollY(scrollTop);
        setScrollProgress(scrollableHeight > 0 ? Math.min(100, (scrollTop / scrollableHeight) * 100) : 0);
      });
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  const parallaxOffset = shouldReduceMotion ? 0 : Math.min(scrollY * 0.18, 140);

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-cosmos-black text-cosmos-white">
      <div
        aria-hidden="true"
        className="fixed left-0 top-0 z-50 h-1 bg-gradient-to-r from-oxygen-400 via-solar-300 to-aurora-400 transition-[width] duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <AnimatedStarfield />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.14),transparent_34%),linear-gradient(180deg,rgba(3,4,10,0.04),#03040a_82%)]" />
      <div className="cosmos-orbital-grid fixed z-0" />
      <div className="noise-overlay fixed z-0" />

      <header className="fixed inset-x-0 top-4 z-40 px-4 md:px-8">
        <div className="glass-nav mx-auto flex max-w-[1720px] items-center justify-between rounded-full px-3 py-3 md:px-4">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-3 rounded-full px-3 text-sm font-semibold text-cosmos-frost transition hover:bg-white/[0.06] hover:text-cosmos-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
          >
            <ArrowLeft className="h-4 w-4" />
            COSMOS AI
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cosmos-frost sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-solar-300" />
            Astronomy Picture of the Day
          </div>
        </div>
      </header>

      <section className="relative z-10 min-h-screen overflow-hidden">
        <div className="absolute inset-0">
          {hasLiveMedia && apod.media_type === "image" ? (
            <Image
              src={imageUrl}
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-95 saturate-[1.08]"
              style={{
                transform: `translate3d(0, ${parallaxOffset}px, 0) scale(1.06)`,
                transformOrigin: "center top",
              }}
            />
          ) : hasLiveMedia && apod.media_type === "video" ? (
            <iframe
              src={apod.url}
              title={apod.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_38%_24%,rgba(56,189,248,0.32),transparent_22%),radial-gradient(circle_at_70%_56%,rgba(167,139,250,0.22),transparent_26%),linear-gradient(135deg,#111827,#03040a)]" />
          )}
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.34),rgba(3,4,10,0.06)_36%,rgba(3,4,10,0.92)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-cosmos-black to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto flex min-h-screen max-w-[1720px] flex-col justify-end px-4 pb-12 pt-32 md:px-8 md:pb-16 lg:pb-20"
        >
          <div className="max-w-6xl">
            <div className="mb-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-3 rounded-full border border-aurora-400/25 bg-cosmos-black/42 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-aurora-400 backdrop-blur-2xl">
                <ShieldCheck className="h-3.5 w-3.5" />
                NASA sourced
              </span>
              <span className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cosmos-frost backdrop-blur-2xl">
                <CalendarDays className="h-3.5 w-3.5 text-oxygen-400" />
                {formattedDate}
              </span>
              <span className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-cosmos-frost backdrop-blur-2xl">
                <BookOpen className="h-3.5 w-3.5 text-solar-300" />
                {readMinutes} min read
              </span>
            </div>

            <h1 className="cosmos-text-balance font-display text-5xl font-semibold leading-[0.96] tracking-normal sm:text-6xl md:text-7xl xl:text-[5.7rem]">
              {apod.title}
            </h1>

            <p className="mt-7 max-w-3xl text-lg leading-8 text-cosmos-frost md:text-xl md:leading-9">
              {leadParagraph}
            </p>

            <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-cosmos-frost backdrop-blur-xl">
                  <ImageIcon className="h-4 w-4 text-oxygen-400" />
                  {apod.media_type}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-cosmos-frost backdrop-blur-xl">
                  <Eye className="h-4 w-4 text-oxygen-400" />
                  Editorial briefing
                </span>
              </div>

              <ApodActions apod={apod} />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-cosmos-black">
        <div className="mx-auto grid max-w-[1500px] gap-10 px-4 py-16 md:px-8 md:py-24 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.3fr)]">
          <aside className="xl:sticky xl:top-28 xl:self-start">
            <div className="glass-panel overflow-hidden rounded-[1.25rem] p-6 md:p-7">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
                Field Notes
              </p>
              <div className="mt-6 grid gap-5 text-sm text-cosmos-frost">
                <div className="flex items-start gap-4 border-t border-white/10 pt-5">
                  <CalendarDays className="mt-1 h-4 w-4 text-solar-300" />
                  <div>
                    <p className="font-semibold text-cosmos-white">Published by NASA</p>
                    <p className="mt-1">{formattedDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 border-t border-white/10 pt-5">
                  <ImageIcon className="mt-1 h-4 w-4 text-solar-300" />
                  <div>
                    <p className="font-semibold text-cosmos-white">Media format</p>
                    <p className="mt-1 capitalize">{apod.media_type}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 border-t border-white/10 pt-5">
                  <ShieldCheck className="mt-1 h-4 w-4 text-solar-300" />
                  <div>
                    <p className="font-semibold text-cosmos-white">Source integrity</p>
                    <p className="mt-1">
                      NASA APOD text paired with {isLiveAi ? "live COSMOS AI" : "static NASA-context"} interpretation.
                    </p>
                  </div>
                </div>
              </div>

              {apod.copyright ? (
                <p className="mt-6 border-t border-white/10 pt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-cosmos-mist">
                  Credit: {apod.copyright}
                </p>
              ) : null}
            </div>
          </aside>

          <article className="space-y-8">
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel rounded-[1.25rem] p-6 md:p-10 lg:p-12"
            >
              <div className="mb-8 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.06]">
                  <BookOpen className="h-5 w-5 text-oxygen-400" />
                </span>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
                    NASA Article
                  </p>
                  <h2 className="text-3xl font-semibold tracking-normal md:text-4xl">Official briefing</h2>
                </div>
              </div>

              <p className="text-lg leading-9 text-cosmos-frost md:text-xl md:leading-9">
                {apod.explanation}
              </p>

              {hasLiveMedia ? (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-button group mt-8 inline-flex h-12 items-center justify-center gap-3 rounded-full px-5 text-sm font-bold text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
                >
                  Open NASA media
                  <ExternalLink className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ) : null}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[1.25rem] border border-ai/24 bg-ai-aurora p-6 shadow-glow-ai md:p-10 lg:p-12"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ai to-transparent" />
              <div className="mb-8 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-md border border-ai/35 bg-ai/15">
                  <Bot className="h-5 w-5 text-ai" />
                </span>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-ai">
                    COSMOS Guide
                  </p>
                  <h2 className="text-3xl font-semibold tracking-normal md:text-4xl">
                    {isLiveAi ? "Generated by COSMOS" : "COSMOS Guide"}
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-card rounded-lg p-5 md:col-span-2 md:p-6">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cosmos-white">
                    In one breath
                  </p>
                  <p className="text-lg leading-8 text-cosmos-frost">{aiExplanation.summary}</p>
                </div>
                <div className="glass-card rounded-lg p-5 md:p-6">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cosmos-white">
                    What to look for
                  </p>
                  <p className="leading-8 text-cosmos-frost">{aiExplanation.lookFor}</p>
                </div>
                <div className="glass-card rounded-lg p-5 md:p-6">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-cosmos-white">
                    Source note
                  </p>
                  <p className="leading-8 text-cosmos-frost">
                    {isLiveAi
                      ? "Generated from NASA's APOD source text with a source-bounded prompt."
                      : "This explanation is a static educational guide derived from NASA's APOD title, description, and media context. Live AI will be used only when explicitly requested and configured."}
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel rounded-[1.25rem] p-6 md:p-10 lg:p-12"
            >
              <div className="mb-8 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-md border border-solar-300/25 bg-solar-300/10">
                  <Rocket className="h-5 w-5 text-solar-300" />
                </span>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-solar-300">
                    Why This Matters
                  </p>
                  <h2 className="text-3xl font-semibold tracking-normal md:text-4xl">A larger human story</h2>
                </div>
              </div>

              <p className="max-w-4xl text-lg leading-9 text-cosmos-frost md:text-xl md:leading-9">
                {aiExplanation.whyItMatters}
              </p>
            </motion.section>
          </article>
        </div>
      </section>

      <section className="relative z-10 bg-cosmos-black px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
                Related NASA Content
              </p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal md:text-5xl">
                Keep following the signal.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-cosmos-mist">
              Move from today&apos;s feature into the archive, the assistant, and the broader COSMOS visual system.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {relatedContent.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="glass-card group min-h-[260px] rounded-[1.25rem] p-6 transition duration-300 hover:-translate-y-1 hover:border-oxygen-400/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oxygen-400"
                >
                  <div className="mb-10 flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-md border border-white/10 bg-white/[0.06]">
                      <Icon className="h-5 w-5 text-oxygen-400" />
                    </span>
                    <ExternalLink className="h-4 w-4 text-cosmos-mist transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cosmos-white" />
                  </div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-solar-300">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-normal text-cosmos-white">{item.title}</h3>
                  <p className="mt-4 leading-7 text-cosmos-frost">{item.description}</p>
                </a>
              );
            })}
          </div>

          <div className="glass-card mt-4 rounded-[1.25rem] p-5 text-sm leading-7 text-cosmos-mist md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Compass className="mt-1 h-4 w-4 text-oxygen-400" />
                <p>
                  Today&apos;s APOD can be saved to your COSMOS collection or exported as a visual share card from
                  the hero actions above.
                </p>
              </div>
              {hasLiveMedia ? (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 px-4 font-bold text-cosmos-white transition hover:border-white/30 hover:bg-white/[0.07]"
                >
                  Source media
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
