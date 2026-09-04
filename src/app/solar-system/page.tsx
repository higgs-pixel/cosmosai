import type { Metadata } from "next";
import { SolarSystemLoader } from "@/components/solar-system/solar-system-loader";

export const metadata: Metadata = {
  title: "Interactive Solar System Explorer",
  description:
    "Move through a cinematic Three.js planetarium with smooth camera transitions, planetary cards, and detail panels.",
  alternates: {
    canonical: "/solar-system",
  },
  openGraph: {
    title: "Interactive Solar System Explorer | COSMOS AI",
    description:
      "A premium digital planetarium for exploring the Sun, planets, orbits, and planetary context.",
    url: "/solar-system",
  },
};

export default function Page() {
  return <SolarSystemLoader />;
}
