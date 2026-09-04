import type { Metadata } from "next";
import { NasaGalleryLoader } from "@/components/gallery/nasa-gallery-loader";

export const metadata: Metadata = {
  title: "NASA Gallery",
  description:
    "Search NASA's image library through a premium photography exhibition with fullscreen viewing and AI interpretation.",
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title: "NASA Gallery | COSMOS AI",
    description:
      "A cinematic exhibition interface for NASA imagery, mission media, metadata, and AI-guided explanation.",
    url: "/gallery",
  },
};

export default function Page() {
  return <NasaGalleryLoader />;
}
