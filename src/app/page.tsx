import type { Metadata } from "next";
import { CosmosHome } from "@/components/home/cosmos-home";
import { serverEnv } from "@/lib/config/env.server";
import {
  createHomepageNasaSlots,
  getHomepageNasaPreviews,
} from "@/services/nasa/homepage-preview.service";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Space Intelligence Platform",
  description:
    "Explore Earth observation, NASA missions, scientific research, and real-time cosmic events through COSMOS AI.",
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  const nasaPreviews = createHomepageNasaSlots(await getHomepageNasaPreviews());

  return (
    <CosmosHome
      media={serverEnv.homepageMedia}
      nasaPreviews={nasaPreviews}
    />
  );
}
