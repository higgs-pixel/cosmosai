import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, Quote, Sparkles } from "lucide-react";
import { blogPosts, getBlogPost, getRelatedPosts } from "@/content/blog/posts";

type BlogArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: "Article Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | COSMOS AI`,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();
  const relatedPosts = getRelatedPosts(post);

  return (
    <main id="main-content" className="min-h-screen bg-cosmos-black text-cosmos-white">
      <article className="premium-section relative overflow-hidden pt-28 pb-20 md:pb-28">
        <div className="section-glow-layer section-glow-ai opacity-70" aria-hidden="true" />
        <div className="cosmos-orbital-grid absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="cosmos-container relative z-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-cosmos-mist transition hover:text-cosmos-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          <header className="mt-14 max-w-4xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-oxygen-400">
              {post.category}
            </p>
            <h1 className="cosmos-text-balance mt-6 text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
              {post.title}
            </h1>
            <p className="mt-6 text-base leading-8 text-cosmos-frost md:text-lg md:leading-9">{post.description}</p>
            <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-cosmos-mist">
              <span>{post.author}</span>
              <span>/</span>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              <span>/</span>
              <span>{post.readingTime}</span>
            </div>
          </header>

          {post.featuredImage ? (
            <div className="relative mt-12 overflow-hidden rounded-[1.35rem] border border-white/10 bg-cosmos-black shadow-void">
              <div className="relative aspect-[2.25] min-h-[280px]">
                <Image
                  src={post.featuredImage}
                  alt={post.imageAlt ?? post.title}
                  fill
                  priority
                  sizes="(max-width: 1480px) 100vw, 1480px"
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,10,0.06),rgba(3,4,10,0.58))]" />
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.68fr)_minmax(300px,0.32fr)]">
            <div className="glass-panel rounded-lg p-6 md:p-10">
              {post.pullQuote ? (
                <aside className="mb-10 rounded-[1rem] border border-oxygen-400/20 bg-oxygen-400/10 p-5 md:p-6">
                  <Quote className="mb-4 h-6 w-6 text-oxygen-300" />
                  <p className="text-xl font-semibold leading-8 text-cosmos-white md:text-2xl md:leading-9">
                    {post.pullQuote}
                  </p>
                </aside>
              ) : null}
              <div className="grid gap-10">
                {post.content.map((section, index) => (
                  <section key={section.heading}>
                    <h2 className="text-2xl font-semibold tracking-normal text-cosmos-white">{section.heading}</h2>
                    <div className="mt-4 grid gap-4">
                      {section.body.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-7 text-cosmos-frost md:text-base md:leading-8">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    {index === 0 && post.factBox ? (
                      <div className="mt-6 rounded-[1rem] border border-solar-300/22 bg-solar-500/10 p-5">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-solar-300">
                          {post.factBox.label}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold tracking-normal text-cosmos-white">
                          {post.factBox.title}
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-cosmos-frost">{post.factBox.body}</p>
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            </div>

            <aside className="grid content-start gap-4">
              <div className="glass-card rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-cosmos-white">
                  <BookOpen className="h-4 w-4 text-oxygen-300" />
                  Reading guide
                </h2>
                <div className="mt-4 grid gap-3 text-sm leading-6 text-cosmos-frost">
                  <p>Start with the pull quote, then read the fact box as the practical takeaway.</p>
                  <p>Use the related reading section to continue through NASA data, education, and product context.</p>
                </div>
              </div>

              <div className="glass-card rounded-lg p-5">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cosmos-white">Tags</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-cosmos-mist">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-lg p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-cosmos-white">
                  <Sparkles className="h-4 w-4 text-ai" />
                  Related reading
                </h2>
                <div className="mt-4 grid gap-3">
                  {(relatedPosts.length > 0 ? relatedPosts : blogPosts.filter((candidate) => candidate.slug !== post.slug).slice(0, 2)).map((related) => (
                    <Link key={related.slug} href={`/blog/${related.slug}`} className="group rounded-md border border-white/10 bg-white/[0.035] p-3 transition hover:border-oxygen-400/35">
                      <span className="block text-sm font-semibold text-cosmos-white">{related.title}</span>
                      <span className="mt-2 inline-flex items-center gap-2 text-xs text-cosmos-mist group-hover:text-oxygen-300">
                        Read note
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </main>
  );
}
