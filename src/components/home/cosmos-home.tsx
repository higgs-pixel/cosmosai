"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CircularGallery } from "./aryan/circular-gallery";
import { CustomCursor } from "./aryan/custom-cursor";
import { FooterShareMenu } from "./aryan/footer-share-menu";
import { GlassNav } from "./aryan/glass-nav";
import {
  homepageArchiveDestination,
  homepageOfferings,
  type HomepageMedia,
  type HomepageVideoSource,
} from "./aryan/homepage-contract";
import { InteractiveHoverButton } from "./aryan/interactive-hover-button";
import { OptimizedVideo } from "./aryan/optimized-video";
import type { HomeNasaPreviewSlot } from "@/services/nasa/homepage-preview.service";

const BlackHoleCanvas = dynamic(
  () => import("./aryan/black-hole-canvas").then((module) => module.BlackHoleCanvas),
  { ssr: false },
);

type CosmosHomeProps = {
  media: HomepageMedia;
  nasaPreviews: HomeNasaPreviewSlot[];
};

type AudienceSection = {
  id: string;
  title: string;
  content: string;
  align: "left" | "right";
  image?: string;
  poster?: string;
  video?: HomepageVideoSource;
};

const textShadow: CSSProperties = {
  textShadow: "0 4px 30px rgba(0, 0, 0, 1)",
};

const archiveTones = [
  "border-blue-500/20 bg-blue-900/40",
  "border-purple-500/20 bg-purple-900/40",
  "border-red-500/20 bg-red-900/40",
  "border-emerald-500/20 bg-emerald-900/40",
  "border-cyan-500/20 bg-cyan-900/40",
  "border-orange-500/20 bg-orange-900/40",
] as const;

function hasVideoSource(source: HomepageVideoSource) {
  return Boolean(source.webmUrl || source.mp4Url);
}

function ArchiveCard({
  preview,
  tone,
}: {
  preview: HomeNasaPreviewSlot;
  tone: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const classes = `relative h-80 w-64 overflow-hidden rounded-xl border shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md ${tone}`;
  const destination = homepageArchiveDestination(preview?.sourceUrl);
  const external = Boolean(preview);

  if (!preview) {
    return (
      <a
        href={destination}
        data-cursor-link="true"
        className={`${classes} aryan-cursor-target group flex items-end p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00E5FF]`}
        aria-label="Explore NASA imagery"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.1),transparent_46%)]" />
        <div className="relative z-10">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/55">NASA APOD</p>
          <p className="mt-2 text-sm font-semibold text-white/80">Preview unavailable</p>
          <p className="mt-2 text-xs leading-5 text-white/50">The archive slot remains ready for the next NASA response.</p>
          <span className="mt-4 inline-flex text-[9px] font-bold uppercase tracking-[0.18em] text-[#00E5FF] transition group-hover:text-white">Explore NASA imagery →</span>
        </div>
      </a>
    );
  }

  return (
    <a
      href={destination}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      data-cursor-link="true"
      className={`${classes} aryan-cursor-target group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00E5FF]`}
      aria-label={`Open NASA APOD: ${preview.title}`}
    >
      {!imageFailed ? (
        <Image
          src={preview.imageUrl}
          alt=""
          fill
          sizes="256px"
          loading="lazy"
          className="object-cover transition duration-700 group-hover:scale-105"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-black/55 px-6 text-center text-xs text-white/70">
          NASA image unavailable
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#00E5FF]">
          <time dateTime={preview.date}>{preview.date}</time>
        </p>
        <h3 className="mt-2 line-clamp-2 text-base font-bold leading-5 text-white">{preview.title}</h3>
        <p className="mt-2 truncate text-[10px] text-white/65">{preview.attribution}</p>
      </div>
    </a>
  );
}

export function CosmosHome({ media, nasaPreviews }: CosmosHomeProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [orbitRotation, setOrbitRotation] = useState(0);

  const audienceSections: AudienceSection[] = [
    {
      id: "academics",
      title: "Academics",
      content: "Students, educators, researchers, and academics looking for deep analytical tools and raw NASA integrations.",
      align: "right",
      poster: "/home/aryan/sun-poster.webp",
      video: media.sun,
    },
    {
      id: "enthusiasts",
      title: "Enthusiasts",
      content: "Space, astronomy, AI, and technology enthusiasts seeking real-time cosmic data in a unified dashboard.",
      align: "left",
      image: "/home/aryan/enthusiast.webp",
    },
    {
      id: "explorers",
      title: "Explorers",
      content: "Content creators, science communicators, lifelong learners, and anyone genuinely curious about the universe.",
      align: "right",
      poster: "/home/aryan/sky-poster.webp",
      video: media.sky,
    },
  ];

  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;
      gsap.registerPlugin(ScrollTrigger);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reducedMotion) {
        gsap.set(container, { clearProps: "transform,opacity,filter" });
        gsap.set(".smooth-fade", { clearProps: "transform,opacity" });
        return;
      }

      gsap.fromTo(
        container,
        { y: 40, opacity: 0, filter: "blur(20px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "power3.out" },
      );
      gsap.utils.toArray<HTMLElement>(".smooth-fade").forEach((element) => {
        gsap.fromTo(
          element,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              scroller: container,
              start: "top 95%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });
      const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 100);
      return () => window.clearTimeout(refreshId);
    },
    { scope: containerRef },
  );

  return (
    <>
      <CustomCursor />
      <main
        id="main-content"
        ref={containerRef}
        className="cosmos-aryan-home relative h-[100svh] w-full overflow-x-hidden overflow-y-auto bg-black text-white"
      >
        <GlassNav />

        <section className="snap-section relative z-10 flex min-h-[100svh] w-full snap-start flex-col justify-center overflow-hidden bg-black px-8 md:px-12 lg:px-16 xl:px-24">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
          }}
        >
          <Image
            src="/home/aryan/blackhole-poster.webp"
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          {hasVideoSource(media.blackHole) ? <BlackHoleCanvas sources={media.blackHole} /> : null}
        </div>

        <div className="content-block pointer-events-none relative z-20 mx-auto flex w-full max-w-[1600px] flex-col items-start text-left">
          <h1 className="smooth-fade w-fit text-5xl font-bold uppercase leading-[1.05] tracking-tight text-[#FFF8E7] drop-shadow-2xl md:text-[5rem] lg:text-[6.5rem]" style={textShadow}>
            A new interface <br />
            for exploring <br />
            <span className="text-[#FFC8A2]" style={textShadow}>space</span>
          </h1>
          <p className="smooth-fade mt-8 w-fit max-w-2xl text-base font-normal leading-relaxed text-[#FFF8E7]/90 drop-shadow-md md:text-lg" style={textShadow}>
            From Earth observation and NASA missions to scientific research and real-time cosmic events, COSMOS AI turns the universe into an interactive intelligence system.
          </p>
          <div className="smooth-fade pointer-events-auto mt-10 inline-flex w-fit">
            <InteractiveHoverButton href="/orbit" className="h-14 px-10 text-xs">
              Explore Orbit →
            </InteractiveHoverButton>
          </div>
        </div>
      </section>

      <div className="relative z-10 w-full border-none bg-black">
        <section className="snap-section relative flex min-h-[100svh] w-full snap-start flex-col justify-center overflow-hidden border-none bg-black px-8 transition-colors duration-500 md:px-12 lg:px-16 xl:px-24">
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
            }}
          >
            <Image src="/home/aryan/quote.webp" alt="Space mission" fill sizes="100vw" className="object-cover opacity-50" priority />
            <div className="absolute inset-0 bg-black/50" />
          </div>
          <div className="content-block relative z-20 mx-auto flex w-full max-w-[1600px] flex-col items-start text-left">
            <div className="smooth-fade max-w-4xl">
              <blockquote className="inline-block text-2xl font-light leading-[1.3] tracking-tight text-[#FFF8E7] drop-shadow-xl md:text-4xl lg:text-[3.5rem]" style={textShadow}>
                &ldquo;Space exploration should not be limited to institutions, specialists, or those with access to complex tools. COSMOS AI exists to make scientific discovery understandable, explorable, and accessible to everyone.&rdquo;
              </blockquote>
              <div className="mt-10 border-l-2 border-[#00E5FF] py-1 pl-5">
                <p className="text-lg font-bold tracking-wider text-[#FFF8E7]">Mayankaditya Lohiya</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-[#FFC8A2]">Founder &amp; CEO, COSMOS AI</p>
              </div>
            </div>
          </div>
        </section>

        {audienceSections.map((section) => (
          <section key={section.id} className="snap-section relative flex min-h-[100svh] w-full snap-start flex-col justify-center overflow-hidden border-none bg-black px-8 transition-colors duration-500 md:px-12 lg:px-16 xl:px-24">
            <div
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
              }}
            >
              {section.video && section.poster ? (
                <OptimizedVideo sources={section.video} poster={section.poster} className="opacity-40" />
              ) : null}
              {section.image ? (
                <>
                  <Image src={section.image} alt={section.title} fill sizes="100vw" className="object-cover opacity-40" />
                  <div className="absolute inset-0 bg-black/50" />
                </>
              ) : null}
            </div>
            <div className="relative z-20 mx-auto flex w-full max-w-[1600px] flex-col">
              <div className={`smooth-fade flex max-w-xl flex-col text-left ${section.align === "right" ? "ml-auto" : "mr-auto"}`}>
                <h2 className="mb-8 inline-block w-fit text-4xl font-bold uppercase tracking-tight text-[#FFF8E7] drop-shadow-xl md:text-5xl lg:text-[4.5rem]" style={textShadow}>{section.title}</h2>
                <p className="mb-8 inline-block w-fit text-lg font-normal leading-[1.6] tracking-wide text-white/90 md:text-xl">{section.content}</p>
              </div>
            </div>
          </section>
        ))}

        <section className="snap-section home-offerings-section relative flex min-h-[100svh] w-full snap-start flex-col justify-center overflow-hidden border-none bg-black transition-colors duration-500">
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
            }}
          >
            <Image src="/home/aryan/content-circles.webp" alt="" fill sizes="100vw" className="object-cover opacity-30" />
            <div className="absolute inset-0 bg-black/50" />
          </div>

          <div className="pointer-events-none absolute right-[-200px] top-1/2 z-10 h-[800px] w-[800px] origin-right -translate-y-1/2 scale-[0.45] md:scale-75 lg:scale-100">
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-full border border-white/10 bg-black">
              <Image src="/home/aryan/padded-circle.webp" alt="" fill sizes="800px" className="object-cover opacity-20" />
              <div className="absolute inset-0 bg-black/70" />
            </div>
            <div className="pointer-events-none absolute inset-0 z-10">
              {homepageOfferings.map((item, index) => {
                const angleDegrees = index * 90 + orbitRotation;
                const angleRadians = angleDegrees * (Math.PI / 180);
                const x = -400 * Math.cos(angleRadians);
                const y = 400 * Math.sin(angleRadians);
                const cosine = Math.cos(angleRadians);
                const scale = 0.6 + 0.4 * cosine;
                const opacity = cosine > -0.2 ? 0.2 + 0.8 * Math.max(0, cosine) : 0;
                const isFront = cosine > 0.8;
                const cardClasses = `group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black p-8 text-center shadow-[0_15px_40px_rgba(0,0,0,0.9)] transition-all duration-300 ${isFront ? "aryan-cursor-target hover:border-[#00E5FF]/80 hover:shadow-[0_0_40px_rgba(0,229,255,0.4)]" : ""}`;
                const content = (
                  <>
                    <div className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden rounded-full">
                      <Image src={item.image} alt="" fill sizes="380px" className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100" />
                      <div className="absolute inset-0 bg-black/40 transition-colors duration-500 group-hover:bg-black/30" />
                    </div>
                    <div className="pointer-events-none absolute inset-0 z-10 rounded-full border border-white/10" />
                    <div className="pointer-events-none relative z-20 mt-4 flex h-full w-full flex-col items-center justify-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl shadow-inner">{item.icon}</div>
                      <h3 className="mb-4 text-2xl font-bold tracking-wide text-[#FFC8A2] drop-shadow-md">{item.title}</h3>
                      <p className="line-clamp-4 px-6 text-[14px] font-medium leading-relaxed tracking-wide text-white drop-shadow-lg">{item.content}</p>
                      <div className="relative z-10 mt-5 w-[70%] border-t border-white/20 pt-4">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-[#FFF8E7] transition-colors group-hover:text-[#00E5FF]">{item.cta}</span>
                      </div>
                    </div>
                  </>
                );

                return (
                  <div
                    key={item.id}
                    className="absolute left-1/2 top-1/2 -ml-[190px] -mt-[190px] h-[380px] w-[380px] transition-all duration-500"
                    style={{
                      transform: `translate(${x}px, ${y}px) scale(${scale})`,
                      opacity,
                      zIndex: Math.round(100 * cosine),
                      pointerEvents: isFront ? "auto" : "none",
                    }}
                  >
                    {isFront ? <Link href={item.href} data-cursor-link="true" className={cardClasses}>{content}</Link> : <div className={cardClasses}>{content}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="home-offerings-layout pointer-events-none relative z-20 mx-auto flex h-full min-h-[100svh] w-full max-w-[1800px] items-center justify-between px-8 md:px-12 lg:px-16">
            <div className="home-offerings-copy smooth-fade pointer-events-none z-20 flex h-full w-full flex-col justify-center md:w-1/2">
              <h2 className="home-offerings-heading mb-6 text-5xl font-bold uppercase leading-[1.05] tracking-tight text-[#FFF8E7] drop-shadow-xl md:text-[clamp(3.25rem,4.5vw,5.5rem)]" style={textShadow}>
                <span className="block lg:whitespace-nowrap">One platform.</span>
                <span className="block lg:whitespace-nowrap">Four ways to</span>
                <span className="block lg:whitespace-nowrap">understand the</span>
                <span className="block lg:whitespace-nowrap">universe.</span>
              </h2>
              <div className="home-offerings-controls pointer-events-auto relative z-50 mt-4 flex gap-4">
                <button type="button" onClick={() => setOrbitRotation((value) => value + 90)} data-cursor-link="true" aria-label="Rotate offerings up" className="aryan-cursor-target group flex h-14 w-14 items-center justify-center rounded-full border border-[#00E5FF] bg-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all duration-300 hover:border-white hover:bg-white">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-y-1"><path d="M18 15l-6-6-6 6" /></svg>
                </button>
                <button type="button" onClick={() => setOrbitRotation((value) => value - 90)} data-cursor-link="true" aria-label="Rotate offerings down" className="aryan-cursor-target group flex h-14 w-14 items-center justify-center rounded-full border border-[#00E5FF] bg-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all duration-300 hover:border-white hover:bg-white">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-y-1"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="snap-section relative flex min-h-[100svh] w-full snap-start flex-col overflow-hidden border-none bg-black pb-10 pt-32">
          <div className="pointer-events-none z-20 w-full shrink-0 px-8 md:px-12 lg:px-16 xl:px-24">
            <div className="smooth-fade mx-auto w-full max-w-[1800px]">
              <h2 className="inline-block w-fit text-4xl font-bold uppercase text-[#FFF8E7] drop-shadow-xl lg:text-[4.5rem]" style={textShadow}>Cosmic Archive</h2>
            </div>
          </div>
          <div className="relative z-10 mt-8 flex min-h-[500px] w-full grow items-center justify-center overflow-hidden">
            <CircularGallery>
              {Array.from({ length: 6 }, (_, index) => (
                <ArchiveCard
                  key={index}
                  preview={nasaPreviews[index] ?? null}
                  tone={archiveTones[index] ?? archiveTones[0]}
                />
              ))}
            </CircularGallery>
          </div>
        </section>

        <footer className="relative z-50 w-full snap-end border-t border-white/5 bg-[#030508] py-4">
          <div className="mx-auto flex w-full max-w-[1800px] flex-col items-center justify-between px-6 md:flex-row md:px-8 lg:px-12 xl:px-16">
            <div className="flex flex-1 flex-col items-start gap-1">
              <div className="flex items-center gap-4">
                <div className="relative h-8 w-8 overflow-hidden rounded-lg">
                  <Image src="/home/aryan/logo.png" alt="" fill sizes="32px" className="object-cover" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-300">COSMOS AI</span>
              </div>
              <span className="mt-2 text-[8px] uppercase tracking-[0.2em] text-gray-600">Copyright © 2026 COSMOS AI. All Rights Reserved.</span>
            </div>

            <div className="flex flex-1 justify-center py-3 md:py-0">
              <FooterShareMenu />
            </div>

            <div className="flex flex-1 items-center justify-end gap-8 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
              <Link href="/about" data-cursor-link="true" className="aryan-cursor-target transition-colors hover:text-[#00E5FF]">About</Link>
              <span aria-disabled="true" className="text-gray-600">Privacy</span>
              <span aria-disabled="true" className="text-gray-600">Terms</span>
            </div>
          </div>
        </footer>
      </div>
      </main>
    </>
  );
}
