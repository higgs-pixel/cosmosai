import type { Metadata } from "next";
import { SavedDiscoveriesDashboard } from "@/components/dashboard/saved-discoveries-dashboard";

export const metadata: Metadata = {
  title: "Saved Discoveries | COSMOS AI",
  description:
    "Your COSMOS AI collection of saved APOD stories, NASA media, planets, and Daily Cosmic Briefings.",
  alternates: {
    canonical: "/discoveries",
  },
};

export default function Page() {
  return <SavedDiscoveriesDashboard />;
}
