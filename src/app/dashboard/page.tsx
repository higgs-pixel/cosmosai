import type { Metadata } from "next";
import { SavedDiscoveriesDashboard } from "@/components/dashboard/saved-discoveries-dashboard";

export const metadata: Metadata = {
  title: "Saved Discoveries | COSMOS AI",
  description:
    "Your local COSMOS AI collection of saved APOD stories, NASA media, planets, and Daily Cosmic Briefings.",
};

export default function DashboardPage() {
  return <SavedDiscoveriesDashboard />;
}
