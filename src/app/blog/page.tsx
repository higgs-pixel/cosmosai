import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Quote } from "lucide-react";
import { BlogIndex } from "@/components/blog/blog-index";
import { blogPosts } from "@/content/blog/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Team-written COSMOS AI articles about NASA open data, space science, astronomy, artificial intelligence, and research notes.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "COSMOS AI Blog",
    description:
      "Read COSMOS AI essays and research notes about NASA data, astronomy, space science, and AI-guided exploration.",
    url: "/blog",
  },
};

export default function BlogPage() {
  return (
    <main id="main-content" className="min-h-screen bg-cosmos-black text-cosmos-white">
      <section className="premium-section relative overflow-hidden pt-28 pb-16 md:pb-24">
        <div className="section-glow-layer section-glow-oxygen opacity-80" aria-hidden="true" />
        <div className="cosmos-orbital-grid absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="cosmos-container relative z-10">
          <nav className="flex items-center justify-between gap-4 text-sm">
            <Link href="/" className="font-display font-semibold uppercase tracking-[0.24em] text-cosmos-white">
              COSMOS AI
            </Link>
            <div className="hidden items-center gap-5 text-cosmos-mist sm:flex">
              <Link href="/about" className="transition hover:text-cosmos-white">
                About
              </Link>
              <Link href="/briefing" className="transition hover:text-cosmos-white">
                Briefing
              </Link>
              <Link href="/orbit" className="transition hover:text-cosmos-white">
                Orbit
              </Link>
            </div>
          </nav>

          <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_420px] lg:items-end">
            <div className="max-w-5xl">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
                COSMOS field notes
              </p>
              <h1 className="cosmos-text-balance mt-5 text-5xl font-semibold leading-tight tracking-normal md:text-7xl">
                Space writing for curious observers
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-cosmos-frost md:text-lg md:leading-9">
                Team-written notes on NASA public data, astronomy, near-Earth objects, AI guidance, research workflows, and
                the product philosophy behind COSMOS AI.
              </p>
              <Link href="/about" className="glass-button mt-8 inline-flex h-12 items-center gap-2 rounded-md px-5 text-sm font-bold text-cosmos-white">
                About COSMOS AI
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <aside className="glass-panel overflow-hidden rounded-[1.25rem]">
              <div className="relative aspect-[1.55]">
                <Image
                  src="/images/earth-dashboard/earth-horizon.jpg"
                  alt="Earth horizon with atmosphere and city lights"
                  fill
                  priority
                  sizes="420px"
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.05),rgba(3,4,10,0.74))]" />
              </div>
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2 text-oxygen-300">
                  <Quote className="h-4 w-4" />
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">Editorial signal</p>
                </div>
                <p className="text-sm leading-7 text-cosmos-frost">
                  COSMOS writing pairs public NASA context with calm explanations, source literacy, and practical ways to keep exploring.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-cosmos-mist">
                  <BookOpen className="h-3.5 w-3.5 text-oxygen-300" />
                  {blogPosts.length} starter notes
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-20 md:pb-28">
        <div className="cosmos-container">
          <BlogIndex posts={blogPosts} />
        </div>
      </section>
    </main>
  );
}
