import type { Metadata } from "next";
import { ApodPage } from "@/components/apod/apod-page";
import { getTodaysApod, isNasaApiError, type ApodEntry } from "@/services/nasa";
import { generateApodExplanation } from "@/services/openai";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Astronomy Picture of the Day",
  description:
    "Experience NASA's Astronomy Picture of the Day as a cinematic feature with source-grounded editorial explanation.",
  alternates: {
    canonical: "/apod",
  },
  openGraph: {
    title: "Astronomy Picture of the Day | COSMOS AI",
    description:
      "A premium APOD experience with NASA source text, cinematic media, sharing, saving, and guided interpretation.",
    url: "/apod",
  },
};

const fallbackApod: ApodEntry = {
  date: new Date().toISOString().slice(0, 10),
  explanation:
    "NASA's live Astronomy Picture of the Day signal is temporarily unavailable, so COSMOS is showing a sample editorial briefing. APOD normally pairs a NASA-selected image or video with an astronomer-written explanation, turning one daily observation into a doorway for understanding scale, time, light, and discovery. When the NASA feed returns, this page will automatically restore the current APOD story.",
  media_type: "image",
  service_version: "fallback",
  title: "Sample APOD Briefing: Awaiting NASA Signal",
  url: "",
};

async function loadApod() {
  try {
    const result = await getTodaysApod();
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    if (isNasaApiError(error) || error instanceof Error) {
      return fallbackApod;
    }

    return fallbackApod;
  }
}

export default async function Page() {
  const apod = await loadApod();
  const aiExplanation = await generateApodExplanation(apod);

  return <ApodPage apod={apod} aiExplanation={aiExplanation} />;
}
