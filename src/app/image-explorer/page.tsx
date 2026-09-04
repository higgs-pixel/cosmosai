import type { Metadata } from "next";
import { NasaImageExplorerLoader } from "@/components/image-explorer/nasa-image-explorer-loader";

export const metadata: Metadata = {
  title: "NASA Image Explorer",
  description:
    "Search NASA's Image and Video Library through a cinematic editorial media explorer with metadata, filters, and fullscreen viewing.",
  alternates: {
    canonical: "/image-explorer",
  },
  openGraph: {
    title: "NASA Image Explorer | COSMOS AI",
    description:
      "A premium dark NASA media explorer for images, videos, audio, mission metadata, and download links.",
    url: "/image-explorer",
  },
};

export default function Page() {
  return <NasaImageExplorerLoader />;
}
