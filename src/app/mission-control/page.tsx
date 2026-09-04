import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MissionControlDashboard } from "@/components/mission-control/mission-control-dashboard";
import type { MissionControlDashboardData } from "@/components/mission-control/types";
import { blogPosts } from "@/content/blog/posts";
import { searchOpenAlexPapers } from "@/lib/openalex";
import { getEarthDashboardData } from "@/services/earth/dashboard";
import {
  getCurrentUserSession,
  getMissionControlLayout,
} from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mission Control | COSMOS AI",
  description:
    "A personalized COSMOS AI mission control dashboard for NASA signals, research, saved discoveries, and Ask COSMOS.",
  alternates: {
    canonical: "/mission-control",
  },
  openGraph: {
    title: "Mission Control | COSMOS AI",
    description:
      "Arrange NASA signals, research, saved discoveries, and Ask COSMOS into a personal space operations deck.",
    type: "website",
  },
};

async function loadResearchPapers(): Promise<MissionControlDashboardData["researchPapers"]> {
  try {
    const papers = await searchOpenAlexPapers({
      query: "astronomy astrophysics planetary science",
      limit: 4,
      sort: "cited_by_count:desc",
    });

    return papers.results.slice(0, 4).map((paper) => ({
      title: paper.title,
      authors: paper.authors,
      year: paper.publicationYear,
      citationCount: paper.citationCount,
      href: paper.primaryUrl ?? paper.openAlexUrl,
    }));
  } catch {
    return [
      {
        title: "Ask COSMOS to search recent astronomy research",
        authors: ["COSMOS Research Mode"],
        citationCount: 0,
        href: "/ask?mode=research&prompt=Find%20recent%20astronomy%20research%20papers",
      },
    ];
  }
}

export default async function MissionControlPage() {
  const session = await getCurrentUserSession();
  if (!session) redirect("/login?next=/mission-control");

  const [earth, layout, researchPapers] = await Promise.all([
    getEarthDashboardData(),
    getMissionControlLayout(session.accessToken, session.user.id),
    loadResearchPapers(),
  ]);

  const data: MissionControlDashboardData = {
    userEmail: session.user.email,
    generatedAt: new Date().toISOString(),
    earth,
    researchPapers,
    blogPosts: blogPosts.slice(0, 4).map((post) => ({
      slug: post.slug,
      title: post.title,
      description: post.description,
      category: post.category,
      readingTime: post.readingTime,
    })),
  };

  return <MissionControlDashboard data={data} initialLayout={layout} />;
}
