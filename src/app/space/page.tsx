import type { Metadata } from "next";
import { SpacePage } from "@/components/space/space-page";

export const metadata: Metadata = {
  title: "Space | COSMOS AI",
  description:
    "An interactive 3D astronomy experience — explore planets, stars, nebulae, and galaxies in real-time through COSMOS AI.",
  alternates: { canonical: "/space" },
};

// SpacePage is a client component ("use client");
// The Three.js Canvas is dynamically loaded (ssr: false) inside space-hero.tsx
export default function Space() {
  return <SpacePage />;
}
