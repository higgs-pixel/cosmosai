import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { blogPosts } from "@/content/blog/posts";

const siteUrl = getSiteUrl();

const routes = [
  "",
  "/about",
  "/blog",
  "/earth",
  "/apod",
  "/briefing",
  "/mission-control",
  "/orbit",
  "/solar-system",
  "/spacepedia",
  "/discoveries",
  "/dashboard",
  "/gallery",
  "/image-explorer",
  "/asteroids",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    ...routes.map((route) => {
      const changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] =
        route === "" || route === "/apod" || route === "/briefing" || route === "/asteroids" ? "daily" : "weekly";

      return {
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency,
      priority: route === "" ? 1 : 0.82,
      };
    }),
    ...blogPosts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(`${post.date}T00:00:00`),
      changeFrequency: "monthly" as const,
      priority: 0.68,
    })),
  ];
}
