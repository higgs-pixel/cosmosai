import type { EarthDashboardData } from "@/services/earth/types";

export type MissionControlWidgetId =
  | "earth"
  | "iss"
  | "apod"
  | "space-weather"
  | "asteroids"
  | "research"
  | "blog"
  | "ask"
  | "saved"
  | "stats";

export type MissionControlWidgetLayout = {
  id: MissionControlWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MissionControlBlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
};

export type MissionControlResearchPaper = {
  title: string;
  authors: string[];
  year?: number;
  citationCount: number;
  href?: string;
};

export type MissionControlDashboardData = {
  userEmail?: string;
  generatedAt: string;
  earth: EarthDashboardData;
  blogPosts: MissionControlBlogPost[];
  researchPapers: MissionControlResearchPaper[];
};
