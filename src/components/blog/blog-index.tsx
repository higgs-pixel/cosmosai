"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, Search } from "lucide-react";
import { blogCategories, type BlogPost } from "@/content/blog/posts";

export function BlogIndex({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory = category === "All" || post.category === category;
      const searchable = `${post.title} ${post.description} ${post.category} ${post.tags.join(" ")}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, posts, query]);

  return (
    <div className="grid gap-8">
      <div className="glass-panel rounded-lg p-4 md:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search COSMOS articles</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cosmos-mist" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search articles, topics, or tags"
              className="h-12 w-full rounded-md border border-white/10 bg-cosmos-black/40 pl-11 pr-4 text-sm text-cosmos-white outline-none transition placeholder:text-cosmos-mist focus:border-oxygen-400/50"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {["All", ...blogCategories].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  category === item
                    ? "border-oxygen-400/50 bg-oxygen-400/15 text-oxygen-300"
                    : "border-white/10 bg-white/[0.04] text-cosmos-mist hover:text-cosmos-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredPosts.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-12">
          {filteredPosts.map((post, index) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className={`glass-card group overflow-hidden rounded-lg transition hover:-translate-y-1 hover:border-oxygen-400/35 ${
                index === 0 ? "lg:col-span-7" : "lg:col-span-5"
              }`}
            >
              {post.featuredImage ? (
                <span className={`relative block overflow-hidden ${index === 0 ? "aspect-[1.9]" : "aspect-[2.2]"}`}>
                  <Image
                    src={post.featuredImage}
                    alt={post.imageAlt ?? post.title}
                    fill
                    sizes={index === 0 ? "(max-width: 1024px) 100vw, 58vw" : "(max-width: 1024px) 100vw, 42vw"}
                    className="object-cover opacity-85 transition duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.06),rgba(3,4,10,0.72))]" />
                </span>
              ) : null}
              <span className="flex min-h-[300px] flex-col justify-between p-5 md:p-6">
                <span>
                  <span className="inline-flex rounded-full border border-oxygen-400/20 bg-oxygen-400/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-oxygen-300">
                    {post.category}
                  </span>
                  <h2 className={`${index === 0 ? "text-3xl md:text-4xl" : "text-2xl"} mt-5 font-semibold leading-tight tracking-normal text-cosmos-white`}>
                    {post.title}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-cosmos-frost">{post.description}</p>
                  {post.pullQuote ? (
                    <span className="mt-5 block border-l border-oxygen-400/35 pl-4 text-sm font-semibold leading-6 text-cosmos-white/90">
                      {post.pullQuote}
                    </span>
                  ) : null}
                </span>
                <span>
                  <span className="mt-8 flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-cosmos-mist">
                      {tag}
                    </span>
                  ))}
                </span>
                  <span className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-cosmos-mist">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-oxygen-400" />
                      {post.readingTime}
                    </span>
                    <span className="inline-flex items-center gap-2 text-oxygen-300">
                      <BookOpen className="h-3.5 w-3.5" />
                      Read article
                      <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-lg p-8 text-center">
          <p className="text-lg font-semibold text-cosmos-white">No articles match that signal.</p>
          <p className="mt-2 text-sm text-cosmos-mist">Try a broader topic or choose another category.</p>
        </div>
      )}
    </div>
  );
}
