import type { Metadata } from "next";
import { AsteroidTracker } from "@/components/asteroids/asteroid-tracker";

export const metadata: Metadata = {
  title: "Asteroid Tracker",
  description:
    "Track NASA NeoWs near-Earth objects with cinematic charts, velocity, miss distance, hazard indicators, and AI summaries.",
  alternates: {
    canonical: "/asteroids",
  },
  openGraph: {
    title: "Asteroid Tracker | COSMOS AI",
    description:
      "A premium near-Earth object dashboard with NASA data, visual indicators, and restrained AI interpretation.",
    url: "/asteroids",
  },
};

export default function Page() {
  return <AsteroidTracker />;
}
